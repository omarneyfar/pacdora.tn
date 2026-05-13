import type { DielineCrease, DielineFace, DielineFaceNode, DielineGraph, GeometryPrimitive, Point } from "../../types";

/**
 * Validate a folding-carton DielineGraph.
 *
 * Checks:
 * - Graph size is positive and finite
 * - All faces have valid vertices, bounds, and no self-intersections
 * - All structural creases connect two distinct faces on their boundaries
 * - All cut paths have finite points and no zero-length segments
 * - All geometry primitives have finite points
 * - faceTree has exactly one root covering all faces
 * - faceTree crease references are valid
 *
 * Throws on any error.
 */
export function validateFoldingCartonGraph(graph: DielineGraph, templateLabel: string): void {
  const errors: string[] = [];
  const faceIds = new Set<string>();
  const facesById = new Map<string, DielineFace>();
  const creaseIds = new Set<string>();
  const creasesById = new Map<string, DielineCrease>();

  if (!isPositiveFinite(graph.size.width) || !isPositiveFinite(graph.size.height)) {
    errors.push("graph size must be positive and finite");
  }

  for (const face of graph.faces) {
    if (faceIds.has(face.id)) errors.push(`duplicate face id ${face.id}`);
    faceIds.add(face.id);
    facesById.set(face.id, face);

    if (face.vertices.length < 3) errors.push(`face ${face.id} must have at least 3 vertices`);
    if (!face.vertices.every(isFinitePoint)) errors.push(`face ${face.id} contains non-finite points`);
    if (face.bounds.width < 0 || face.bounds.height < 0 || !isFinitePoint({ x: face.bounds.x, y: face.bounds.y })) {
      errors.push(`face ${face.id} has invalid bounds`);
    }
    if (hasSelfIntersection(face.vertices)) errors.push(`face ${face.id} has self-crossing polygon geometry`);
    if (hasTinyPolygonEdge(face.vertices)) errors.push(`face ${face.id} has duplicate or zero-length polygon edges`);
  }

  for (const crease of graph.creases) {
    if (creaseIds.has(crease.id)) errors.push(`duplicate crease id ${crease.id}`);
    creaseIds.add(crease.id);
    creasesById.set(crease.id, crease);

    if (!faceIds.has(crease.faceA) || !faceIds.has(crease.faceB)) {
      errors.push(`crease ${crease.id} references a missing face`);
    }
    if (crease.faceA === crease.faceB) {
      errors.push(`crease ${crease.id} connects face "${crease.faceA}" to itself — structural creases must connect two distinct faces`);
    }
    if (!isFinitePoint(crease.edgeStart) || !isFinitePoint(crease.edgeEnd)) {
      errors.push(`crease ${crease.id} contains non-finite endpoints`);
    }
    if (distance2D(crease.edgeStart, crease.edgeEnd) <= 0.000001) {
      errors.push(`crease ${crease.id} has zero length`);
    }
    const faceA = facesById.get(crease.faceA);
    const faceB = facesById.get(crease.faceB);
    if (faceA && !isCreaseOnFaceBoundary(crease, faceA)) {
      errors.push(`crease ${crease.id} is not on boundary of face ${faceA.id}`);
    }
    if (faceB && crease.faceA !== crease.faceB && !isCreaseOnFaceBoundary(crease, faceB)) {
      errors.push(`crease ${crease.id} is not on boundary of face ${faceB.id}`);
    }
  }

  for (const cutPath of graph.cutPaths) {
    if (cutPath.points && !cutPath.points.every(isFinitePoint)) {
      errors.push(`cut path ${cutPath.id} contains non-finite points`);
    }
    if (cutPath.points && hasTinyPolylineSegment(cutPath.points)) {
      errors.push(`cut path ${cutPath.id} contains zero-length segments`);
    }
  }

  for (const primitive of graph.geometry ?? []) {
    if (!getPrimitivePoints(primitive).every(isFinitePoint)) {
      errors.push(`geometry primitive ${primitive.id} contains non-finite points`);
    }
  }

  const treeFaceIds = new Set<string>();
  if (graph.faceTree.length !== 1) {
    errors.push(`faceTree must have exactly one root, got ${graph.faceTree.length}`);
  }
  for (const node of graph.faceTree) {
    validateFaceTreeNode(node, true, null, faceIds, creasesById, treeFaceIds, errors);
  }
  for (const faceId of faceIds) {
    if (!treeFaceIds.has(faceId)) errors.push(`faceTree missing face ${faceId}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid ${templateLabel} graph: ${errors.join("; ")}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────

function validateFaceTreeNode(
  node: DielineFaceNode, isRoot: boolean, parentFaceId: string | null,
  faceIds: Set<string>, creasesById: Map<string, DielineCrease>,
  treeFaceIds: Set<string>, errors: string[],
) {
  if (!faceIds.has(node.faceId)) errors.push(`faceTree references missing face ${node.faceId}`);
  if (treeFaceIds.has(node.faceId)) errors.push(`faceTree contains duplicate face ${node.faceId}`);
  treeFaceIds.add(node.faceId);

  if (isRoot) {
    if (node.creaseId !== null) errors.push(`faceTree root ${node.faceId} must not have a crease`);
  } else if (!node.creaseId) {
    errors.push(`faceTree face ${node.faceId} references missing crease null`);
  } else {
    const crease = creasesById.get(node.creaseId);
    if (!crease) {
      errors.push(`faceTree face ${node.faceId} references missing crease ${node.creaseId}`);
    } else if (parentFaceId && !creaseConnectsFaces(crease, parentFaceId, node.faceId)) {
      errors.push(`faceTree crease ${node.creaseId} does not connect parent ${parentFaceId} to child ${node.faceId}`);
    }
  }

  for (const child of node.children) {
    validateFaceTreeNode(child, false, node.faceId, faceIds, creasesById, treeFaceIds, errors);
  }
}

function creaseConnectsFaces(crease: DielineCrease, faceA: string, faceB: string): boolean {
  return (crease.faceA === faceA && crease.faceB === faceB) || (crease.faceA === faceB && crease.faceB === faceA);
}

function isCreaseOnFaceBoundary(crease: DielineCrease, face: DielineFace): boolean {
  return isPointOnFaceBoundary(crease.edgeStart, face) && isPointOnFaceBoundary(crease.edgeEnd, face);
}

function isPointOnFaceBoundary(point: Point, face: DielineFace): boolean {
  return face.vertices.some((start, i) => pointOnSegment(point, start, face.vertices[(i + 1) % face.vertices.length]));
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  const length = distance2D(start, end);
  if (length <= 0.000001) return distance2D(point, start) <= 0.00001;
  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
  return cross / length <= 0.00001 && dot >= -0.00001 && dot <= length * length + 0.00001;
}

function hasTinyPolygonEdge(points: Point[]): boolean {
  return points.some((p, i) => distance2D(p, points[(i + 1) % points.length]) <= 0.000001);
}

function hasTinyPolylineSegment(points: Point[]): boolean {
  return points.some((p, i) => i > 0 && distance2D(p, points[i - 1]) <= 0.000001);
}

function distance2D(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hasSelfIntersection(points: Point[]): boolean {
  for (let a = 0; a < points.length; a++) {
    const a1 = points[a];
    const a2 = points[(a + 1) % points.length];
    for (let b = a + 1; b < points.length; b++) {
      if (Math.abs(a - b) <= 1 || (a === 0 && b === points.length - 1)) continue;
      if (segmentsIntersect(a1, a2, points[b], points[(b + 1) % points.length])) return true;
    }
  }
  return false;
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  return orientation(a1, a2, b1) * orientation(a1, a2, b2) < -0.0000001
    && orientation(b1, b2, a1) * orientation(b1, b2, a2) < -0.0000001;
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function getPrimitivePoints(primitive: GeometryPrimitive): Point[] {
  switch (primitive.type) {
    case "line": return [primitive.start, primitive.end];
    case "polyline": case "polygon": return primitive.points;
    case "arc": case "circle": case "ellipse": return [primitive.center];
    case "label": return [primitive.position];
    case "rounded-rect": case "slot":
      return [{ x: primitive.x, y: primitive.y }, { x: primitive.x + primitive.width, y: primitive.y + primitive.height }];
  }
}
