import type { DielineCrease, DielineFace, DielineFaceNode, DielineGraph, GeometryPrimitive, Point } from "../types";

export type DielineGraphValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const VALID_LAYERS = new Set<GeometryPrimitive["layer"]>([
  "cut",
  "crease",
  "perf",
  "window",
  "hole",
  "bleed",
  "safe",
  "label",
]);

export function validateDielineGraph(graph: DielineGraph): DielineGraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const faceIds = new Set<string>();
  const creaseIds = new Set<string>();
  const facesById = new Map<string, DielineFace>();
  const creasesById = new Map<string, DielineCrease>();

  if (!isPositiveFinite(graph.size.width) || !isPositiveFinite(graph.size.height)) {
    errors.push("Graph size must be positive and finite.");
  }

  for (const face of graph.faces) {
    if (faceIds.has(face.id)) {
      errors.push(`Duplicate face id "${face.id}".`);
    }

    faceIds.add(face.id);
    facesById.set(face.id, face);

    if (face.vertices.length < 3) {
      errors.push(`Face "${face.id}" must have at least 3 vertices.`);
    }

    if (!face.vertices.every(isFinitePoint)) {
      errors.push(`Face "${face.id}" contains non-finite points.`);
    }

    if (!isFiniteBounds(face.bounds) || face.bounds.width < 0 || face.bounds.height < 0) {
      errors.push(`Face "${face.id}" has invalid bounds.`);
    }

    if (hasSelfIntersection(face.vertices)) {
      errors.push(`Face "${face.id}" has self-crossing polygon geometry.`);
    }

    if (hasTinyPolygonEdge(face.vertices)) {
      errors.push(`Face "${face.id}" has duplicate or zero-length polygon edges.`);
    }
  }

  for (const crease of graph.creases) {
    if (creaseIds.has(crease.id)) {
      errors.push(`Duplicate crease id "${crease.id}".`);
    }

    creaseIds.add(crease.id);
    creasesById.set(crease.id, crease);

    if (!faceIds.has(crease.faceA) || !faceIds.has(crease.faceB)) {
      errors.push(`Crease "${crease.id}" references a missing face.`);
    }

    if (crease.faceA === crease.faceB) {
      errors.push(`Crease "${crease.id}" connects face "${crease.faceA}" to itself. Structural creases must connect two distinct faces. Internal score/guide lines belong in graph.geometry, not graph.creases.`);
    }

    if (!isFinitePoint(crease.edgeStart) || !isFinitePoint(crease.edgeEnd)) {
      errors.push(`Crease "${crease.id}" contains non-finite endpoints.`);
    }

    if (distance2D(crease.edgeStart, crease.edgeEnd) <= 0.000001) {
      errors.push(`Crease "${crease.id}" has zero length.`);
    }

    const faceA = facesById.get(crease.faceA);
    const faceB = facesById.get(crease.faceB);

    if (faceA && !isCreaseOnFaceBoundary(crease, faceA)) {
      errors.push(`Crease "${crease.id}" is not on boundary of face "${faceA.id}".`);
    }

    if (faceB && crease.faceA !== crease.faceB && !isCreaseOnFaceBoundary(crease, faceB)) {
      errors.push(`Crease "${crease.id}" is not on boundary of face "${faceB.id}".`);
    }
  }

  if (graph.faceTree.length !== 1) {
    errors.push(`Graph faceTree must have one root; got ${graph.faceTree.length}.`);
  }

  const treeFaceIds = new Set<string>();
  const visiting = new Set<string>();

  for (const root of graph.faceTree) {
    validateTreeNode(root, true, null, faceIds, creasesById, treeFaceIds, visiting, errors);
  }

  for (const faceId of faceIds) {
    if (!treeFaceIds.has(faceId)) {
      errors.push(`Face "${faceId}" is missing from faceTree.`);
    }
  }

  for (const cutPath of graph.cutPaths) {
    if (!cutPath.d && (!cutPath.points || cutPath.points.length < 2)) {
      errors.push(`Cut path "${cutPath.id}" is missing path data.`);
    }

    if (cutPath.points && !cutPath.points.every(isFinitePoint)) {
      errors.push(`Cut path "${cutPath.id}" contains non-finite points.`);
    }

    if (cutPath.points && hasTinyPolylineSegment(cutPath.points)) {
      errors.push(`Cut path "${cutPath.id}" contains zero-length segments.`);
    }
  }

  for (const primitive of graph.geometry ?? []) {
    if (!VALID_LAYERS.has(primitive.layer)) {
      errors.push(`Geometry primitive "${primitive.id}" has invalid layer "${primitive.layer}".`);
    }

    if (!getPrimitivePoints(primitive).every(isFinitePoint)) {
      errors.push(`Geometry primitive "${primitive.id}" contains non-finite points.`);
    }
  }

  if (!graph.geometry || graph.geometry.length === 0) {
    warnings.push("Graph has no canonical geometry primitives.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertValidDielineGraph(graph: DielineGraph, label = "DielineGraph") {
  const result = validateDielineGraph(graph);

  if (!result.ok) {
    throw new Error(`${label} is invalid: ${result.errors.join("; ")}`);
  }

  return result;
}

function validateTreeNode(
  node: DielineFaceNode,
  isRoot: boolean,
  parentFaceId: string | null,
  faceIds: Set<string>,
  creasesById: Map<string, DielineCrease>,
  treeFaceIds: Set<string>,
  visiting: Set<string>,
  errors: string[],
) {
  if (!faceIds.has(node.faceId)) {
    errors.push(`faceTree references missing face "${node.faceId}".`);
  }

  if (visiting.has(node.faceId)) {
    errors.push(`faceTree contains a cycle at "${node.faceId}".`);
    return;
  }

  if (treeFaceIds.has(node.faceId)) {
    errors.push(`faceTree contains duplicate face "${node.faceId}".`);
  }

  treeFaceIds.add(node.faceId);

  if (isRoot && node.creaseId !== null) {
    errors.push(`faceTree root "${node.faceId}" must not have a crease id.`);
  }

  if (!isRoot && !node.creaseId) {
    errors.push(`faceTree face "${node.faceId}" references missing crease "null".`);
  } else if (!isRoot && node.creaseId) {
    const crease = creasesById.get(node.creaseId);
    if (!crease) {
      errors.push(`faceTree face "${node.faceId}" references missing crease "${node.creaseId}".`);
    } else if (parentFaceId && !creaseConnectsFaces(crease, parentFaceId, node.faceId)) {
      errors.push(`faceTree crease "${node.creaseId}" does not connect parent "${parentFaceId}" to child "${node.faceId}".`);
    }
  }

  visiting.add(node.faceId);
  for (const child of node.children) {
    validateTreeNode(child, false, node.faceId, faceIds, creasesById, treeFaceIds, visiting, errors);
  }
  visiting.delete(node.faceId);
}

function creaseConnectsFaces(crease: DielineCrease, faceA: string, faceB: string): boolean {
  return (crease.faceA === faceA && crease.faceB === faceB) || (crease.faceA === faceB && crease.faceB === faceA);
}

function isCreaseOnFaceBoundary(crease: DielineCrease, face: DielineFace): boolean {
  return isPointOnFaceBoundary(crease.edgeStart, face) && isPointOnFaceBoundary(crease.edgeEnd, face);
}

function isPointOnFaceBoundary(point: Point, face: DielineFace): boolean {
  return face.vertices.some((start, index) => pointOnSegment(point, start, face.vertices[(index + 1) % face.vertices.length]));
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  const length = distance2D(start, end);

  if (length <= 0.000001) {
    return distance2D(point, start) <= 0.00001;
  }

  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);

  return cross / length <= 0.00001 && dot >= -0.00001 && dot <= length * length + 0.00001;
}

function hasSelfIntersection(points: Point[]): boolean {
  for (let a = 0; a < points.length; a += 1) {
    const a1 = points[a];
    const a2 = points[(a + 1) % points.length];

    for (let b = a + 1; b < points.length; b += 1) {
      if (Math.abs(a - b) <= 1 || (a === 0 && b === points.length - 1)) {
        continue;
      }

      const b1 = points[b];
      const b2 = points[(b + 1) % points.length];

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  return false;
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  return o1 * o2 < -0.0000001 && o3 * o4 < -0.0000001;
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function hasTinyPolygonEdge(points: Point[]): boolean {
  return points.some((point, index) => distance2D(point, points[(index + 1) % points.length]) <= 0.000001);
}

function hasTinyPolylineSegment(points: Point[]): boolean {
  return points.some((point, index) => index > 0 && distance2D(point, points[index - 1]) <= 0.000001);
}

function getPrimitivePoints(primitive: GeometryPrimitive): Point[] {
  switch (primitive.type) {
    case "line":
      return [primitive.start, primitive.end];
    case "polyline":
    case "polygon":
      return primitive.points;
    case "arc":
    case "circle":
    case "ellipse":
      return [primitive.center];
    case "label":
      return [primitive.position];
    case "rounded-rect":
    case "slot":
      return [
        { x: primitive.x, y: primitive.y },
        { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
      ];
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distance2D(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFiniteBounds(bounds: DielineGraph["faces"][number]["bounds"]): boolean {
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite);
}
