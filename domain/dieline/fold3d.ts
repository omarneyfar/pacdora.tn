import { getGraphBounds, getPolygonArea } from "./geometry";
import type {
  Bounds,
  DielineCrease,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  Point,
} from "./types";

export type Vec3 = [number, number, number];
export type Mat4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export type FoldDiagnostic = {
  code: string;
  level: "warning" | "error";
  message: string;
  faceId?: string;
  creaseId?: string;
};

export type FoldedFace3D = {
  faceId: string;
  label: string;
  role: DielineFace["role"];
  artworkEnabled: boolean;
  localVertices: Point[];
  localBounds: Bounds;
  worldMatrix: Mat4;
  worldVertices: Vec3[];
  creaseId: string | null;
  parentFaceId: string | null;
};

export type Bounds3D = {
  min: Vec3;
  max: Vec3;
  size: Vec3;
  center: Vec3;
  radius: number;
};

export type FoldedModel3D = {
  scale: number;
  faces: FoldedFace3D[];
  bounds: Bounds3D;
  diagnostics: FoldDiagnostic[];
  graphBounds: Bounds;
};

const EPSILON = 0.000001;
const EDGE_TOLERANCE_MM = 0.75;

export function buildFoldedModel(graph: DielineGraph): FoldedModel3D {
  const diagnostics: FoldDiagnostic[] = [];
  const graphBounds = getGraphBounds({ faces: graph.faces });
  const maxDim = Math.max(graphBounds.width, graphBounds.height, graph.size.width, graph.size.height, 1);
  const scale = 3.5 / maxDim;
  const center = {
    x: graphBounds.x + graphBounds.width / 2,
    y: graphBounds.y + graphBounds.height / 2,
  };
  const faceLookup = new Map(graph.faces.map((face) => [face.id, face]));
  const creaseLookup = new Map(graph.creases.map((crease) => [crease.id, crease]));
  const visited = new Set<string>();
  const faces: FoldedFace3D[] = [];

  if (graph.faceTree.length === 0) {
    diagnostics.push({
      code: "missing-face-tree",
      level: "warning",
      message: "Dieline graph has no face tree; every face is rendered flat.",
    });
  }

  for (const root of graph.faceTree) {
    solveNode({
      center,
      creaseLookup,
      diagnostics,
      faceLookup,
      faces,
      flatToWorld: identityMatrix(),
      node: root,
      parentFace: null,
      scale,
      visited,
    });
  }

  for (const face of graph.faces) {
    if (!visited.has(face.id)) {
      diagnostics.push({
        code: "face-not-in-tree",
        level: "warning",
        faceId: face.id,
        message: `Face "${face.id}" is not present in faceTree; it is rendered as an extra flat root.`,
      });
      faces.push(createFoldedFace(face, null, null, identityMatrix(), center, scale));
      visited.add(face.id);
    }
  }

  const bounds = computeBounds3D(faces);
  if (!isFiniteBounds(bounds)) {
    diagnostics.push({
      code: "non-finite-bounds",
      level: "error",
      message: "Folded model bounds are not finite.",
    });
  }

  return {
    scale,
    faces,
    bounds,
    diagnostics,
    graphBounds,
  };
}

export function getFoldErrors(model: Pick<FoldedModel3D, "diagnostics">): FoldDiagnostic[] {
  return model.diagnostics.filter((diagnostic) => diagnostic.level === "error");
}

export function isBasicFoldingCartonGraph(graph: DielineGraph): boolean {
  if (graph.faces.length !== 6) return false;
  const ids = new Set(graph.faces.map((face) => face.id));
  return (
    ids.has("front") &&
    ids.has("back") &&
    ids.has("left") &&
    ids.has("right") &&
    ids.has("top") &&
    ids.has("bottom")
  );
}

function solveNode({
  center,
  creaseLookup,
  diagnostics,
  faceLookup,
  faces,
  flatToWorld,
  node,
  parentFace,
  scale,
  visited,
}: {
  center: Point;
  creaseLookup: Map<string, DielineCrease>;
  diagnostics: FoldDiagnostic[];
  faceLookup: Map<string, DielineFace>;
  faces: FoldedFace3D[];
  flatToWorld: Mat4;
  node: DielineFaceNode;
  parentFace: DielineFace | null;
  scale: number;
  visited: Set<string>;
}) {
  const face = faceLookup.get(node.faceId);

  if (!face) {
    diagnostics.push({
      code: "missing-face",
      level: "error",
      faceId: node.faceId,
      message: `Face tree references missing face "${node.faceId}".`,
    });
    return;
  }

  if (visited.has(face.id)) {
    diagnostics.push({
      code: "duplicate-tree-face",
      level: "error",
      faceId: face.id,
      message: `Face "${face.id}" appears more than once in faceTree.`,
    });
    return;
  }

  visited.add(face.id);

  let nextFlatToWorld = flatToWorld;
  let crease: DielineCrease | null = null;
  let parentFaceId: string | null = null;

  if (node.creaseId) {
    crease = creaseLookup.get(node.creaseId) ?? null;

    if (!crease) {
      diagnostics.push({
        code: "missing-crease",
        level: "error",
        faceId: face.id,
        creaseId: node.creaseId,
        message: `Face "${face.id}" references missing crease "${node.creaseId}".`,
      });
    } else if (!parentFace) {
      diagnostics.push({
        code: "root-has-crease",
        level: "warning",
        faceId: face.id,
        creaseId: crease.id,
        message: `Root face "${face.id}" has a crease; it is rendered as a flat root.`,
      });
    } else {
      parentFaceId = parentFace.id;
      validateCreaseForFaces(crease, parentFace, face, diagnostics);
      nextFlatToWorld = foldChildFromParent({
        center,
        childFace: face,
        crease,
        parentFace,
        parentFlatToWorld: flatToWorld,
        scale,
      });
    }
  }

  faces.push(createFoldedFace(face, crease?.id ?? null, parentFaceId, nextFlatToWorld, center, scale));

  for (const child of node.children) {
    solveNode({
      center,
      creaseLookup,
      diagnostics,
      faceLookup,
      faces,
      flatToWorld: nextFlatToWorld,
      node: child,
      parentFace: face,
      scale,
      visited,
    });
  }
}

function foldChildFromParent({
  center,
  childFace,
  crease,
  parentFace,
  parentFlatToWorld,
  scale,
}: {
  center: Point;
  childFace: DielineFace;
  crease: DielineCrease;
  parentFace: DielineFace;
  parentFlatToWorld: Mat4;
  scale: number;
}): Mat4 {
  const start = transformPoint(parentFlatToWorld, flatPointTo3D(crease.edgeStart, center, scale));
  const end = transformPoint(parentFlatToWorld, flatPointTo3D(crease.edgeEnd, center, scale));
  const inferredSign = inferFoldSign(crease, childFace) || inferFallbackFoldSign(crease, parentFace, childFace);
  const angle = crease.foldAngle * crease.direction * inferredSign;
  const foldMatrix = rotationAroundLine(start, end, angle);

  return multiplyMatrices(foldMatrix, parentFlatToWorld);
}

function createFoldedFace(
  face: DielineFace,
  creaseId: string | null,
  parentFaceId: string | null,
  flatToWorld: Mat4,
  center: Point,
  scale: number,
): FoldedFace3D {
  const localVertices = face.vertices.map((vertex) => ({
    x: (vertex.x - face.bounds.x) * scale,
    y: (vertex.y - face.bounds.y) * scale,
  }));
  const localBounds = {
    x: 0,
    y: 0,
    width: face.bounds.width * scale,
    height: face.bounds.height * scale,
  };
  const localMatrix = flatFaceMatrix(face, center, scale);
  const worldMatrix = multiplyMatrices(flatToWorld, localMatrix);
  const worldVertices = localVertices.map((vertex) =>
    transformPoint(worldMatrix, [vertex.x, vertex.y, 0]),
  );

  return {
    faceId: face.id,
    label: face.label,
    role: face.role,
    artworkEnabled: face.artworkEnabled,
    localVertices,
    localBounds,
    worldMatrix,
    worldVertices,
    creaseId,
    parentFaceId,
  };
}

function flatFaceMatrix(face: DielineFace, center: Point, scale: number): Mat4 {
  const x = (face.bounds.x - center.x) * scale;
  const z = (face.bounds.y - center.y) * scale;

  return [
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, 1, 0, 0,
    x, 0, z, 1,
  ];
}

function flatPointTo3D(point: Point, center: Point, scale: number): Vec3 {
  return [
    (point.x - center.x) * scale,
    0,
    (point.y - center.y) * scale,
  ];
}

function inferFoldSign(crease: DielineCrease, childFace: DielineFace): number {
  const edge = {
    x: crease.edgeEnd.x - crease.edgeStart.x,
    y: crease.edgeEnd.y - crease.edgeStart.y,
  };
  const toChild = {
    x: childFace.centroid.x - crease.edgeStart.x,
    y: childFace.centroid.y - crease.edgeStart.y,
  };
  const childSide = cross2(edge, toChild);

  if (Math.abs(childSide) < EPSILON) {
    return 0;
  }

  return -Math.sign(childSide);
}

function inferFallbackFoldSign(
  crease: DielineCrease,
  parentFace: DielineFace,
  childFace: DielineFace,
): number {
  const parentArea = Math.sign(getPolygonArea(parentFace.vertices)) || 1;
  const childArea = Math.sign(getPolygonArea(childFace.vertices)) || 1;
  return parentArea === childArea ? 1 : -1;
}

function validateCreaseForFaces(
  crease: DielineCrease,
  parentFace: DielineFace,
  childFace: DielineFace,
  diagnostics: FoldDiagnostic[],
) {
  const connectedToParentAndChild =
    (crease.faceA === parentFace.id && crease.faceB === childFace.id) ||
    (crease.faceB === parentFace.id && crease.faceA === childFace.id);

  if (!connectedToParentAndChild) {
    diagnostics.push({
      code: "crease-face-mismatch",
      level: "error",
      creaseId: crease.id,
      faceId: childFace.id,
      message: `Crease "${crease.id}" does not connect parent "${parentFace.id}" to child "${childFace.id}".`,
    });
    return;
  }

  if (distance2D(crease.edgeStart, crease.edgeEnd) < EDGE_TOLERANCE_MM) {
    diagnostics.push({
      code: "tiny-crease",
      level: "error",
      creaseId: crease.id,
      faceId: childFace.id,
      message: `Crease "${crease.id}" is too short for a stable hinge.`,
    });
    return;
  }

  const parentOnEdge = isCreaseOnFaceBoundary(crease, parentFace);
  const childOnEdge = isCreaseOnFaceBoundary(crease, childFace);

  if (!parentOnEdge || !childOnEdge) {
    diagnostics.push({
      code: "crease-not-on-face-edge",
      level: "warning",
      creaseId: crease.id,
      faceId: childFace.id,
      message: `Crease "${crease.id}" is not exactly on both connected face edges.`,
    });
  }
}

function isCreaseOnFaceBoundary(crease: DielineCrease, face: DielineFace): boolean {
  return (
    isPointOnFaceBoundary(crease.edgeStart, face) &&
    isPointOnFaceBoundary(crease.edgeEnd, face)
  );
}

function isPointOnFaceBoundary(point: Point, face: DielineFace): boolean {
  return face.vertices.some((start, index) => {
    const end = face.vertices[(index + 1) % face.vertices.length];
    return isPointOnSegment(point, start, end, EDGE_TOLERANCE_MM);
  });
}

function isPointOnSegment(point: Point, start: Point, end: Point, tolerance: number): boolean {
  const length = distance2D(start, end);
  if (length < EPSILON) return false;

  const cross = Math.abs(
    (point.x - start.x) * (end.y - start.y) -
    (point.y - start.y) * (end.x - start.x),
  ) / length;
  const dot =
    (point.x - start.x) * (end.x - start.x) +
    (point.y - start.y) * (end.y - start.y);

  return cross <= tolerance && dot >= -tolerance && dot <= length * length + tolerance;
}

function computeBounds3D(faces: FoldedFace3D[]): Bounds3D {
  const points = faces.flatMap((face) => face.worldVertices);

  if (points.length === 0) {
    return {
      min: [0, 0, 0],
      max: [1, 1, 1],
      size: [1, 1, 1],
      center: [0, 0, 0],
      radius: 1,
    };
  }

  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  for (const point of points) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }

  const size: Vec3 = [
    Math.max(EPSILON, max[0] - min[0]),
    Math.max(EPSILON, max[1] - min[1]),
    Math.max(EPSILON, max[2] - min[2]),
  ];
  const center: Vec3 = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const radius = Math.max(
    0.75,
    Math.sqrt(size[0] * size[0] + size[1] * size[1] + size[2] * size[2]) / 2,
  );

  return { min, max, size, center, radius };
}

function isFiniteBounds(bounds: Bounds3D): boolean {
  return [...bounds.min, ...bounds.max, ...bounds.size, ...bounds.center, bounds.radius].every(Number.isFinite);
}

function identityMatrix(): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
}

function translationMatrix(x: number, y: number, z: number): Mat4 {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ];
}

function rotationAroundLine(start: Vec3, end: Vec3, angle: number): Mat4 {
  const axis = normalize3(subtract3(end, start));
  const rotation = rotationAxisAngle(axis, angle);

  return multiplyMatrices(
    multiplyMatrices(translationMatrix(start[0], start[1], start[2]), rotation),
    translationMatrix(-start[0], -start[1], -start[2]),
  );
}

function rotationAxisAngle(axis: Vec3, angle: number): Mat4 {
  const [x, y, z] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;

  const n11 = t * x * x + c;
  const n12 = t * x * y - s * z;
  const n13 = t * x * z + s * y;
  const n21 = t * x * y + s * z;
  const n22 = t * y * y + c;
  const n23 = t * y * z - s * x;
  const n31 = t * x * z - s * y;
  const n32 = t * y * z + s * x;
  const n33 = t * z * z + c;

  return [
    n11, n21, n31, 0,
    n12, n22, n32, 0,
    n13, n23, n33, 0,
    0, 0, 0, 1,
  ];
}

function multiplyMatrices(a: Mat4, b: Mat4): Mat4 {
  const result = new Array(16).fill(0) as Mat4;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      result[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }

  return result;
}

function transformPoint(matrix: Mat4, point: Vec3): Vec3 {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

function subtract3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize3(vector: Vec3): Vec3 {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (length < EPSILON) return [1, 0, 0];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross2(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}

function distance2D(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
