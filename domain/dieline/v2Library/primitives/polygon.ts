import type { V2Bounds, V2Face, V2FaceRole, V2Point } from "../contracts/types";
import { distance, isFinitePoint } from "./points";

const EPSILON = 0.000001;

export function polygonBounds(points: V2Point[]): V2Bounds {
  const xs = points.map((current) => current.x);
  const ys = points.map((current) => current.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function polygonCentroid(points: V2Point[]): V2Point {
  const sum = points.reduce((acc, current) => ({ x: acc.x + current.x, y: acc.y + current.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function createFace(input: {
  id: string;
  label: string;
  role: V2FaceRole;
  points: V2Point[];
  sourcePartId: string;
  printable?: boolean;
}): V2Face {
  assertValidPolygon(input.id, input.points);
  return {
    id: input.id,
    label: input.label,
    role: input.role,
    points: input.points,
    bounds: polygonBounds(input.points),
    centroid: polygonCentroid(input.points),
    sourcePartId: input.sourcePartId,
    printable: input.printable ?? (input.role !== "glue" && input.role !== "guide"),
  };
}

export function rectangleFace(input: {
  id: string;
  label: string;
  role: V2FaceRole;
  x: number;
  y: number;
  width: number;
  height: number;
  sourcePartId: string;
  printable?: boolean;
}): V2Face {
  return createFace({
    id: input.id,
    label: input.label,
    role: input.role,
    points: rectanglePoints(input.x, input.y, input.width, input.height),
    sourcePartId: input.sourcePartId,
    printable: input.printable,
  });
}

export function rectanglePoints(x: number, y: number, width: number, height: number): V2Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function pointInOrOnPolygon(point: V2Point, points: V2Point[]): boolean {
  if (points.some((start, index) => pointOnSegment(point, start, points[(index + 1) % points.length]))) {
    return true;
  }

  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const a = points[current];
    const b = points[previous];
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function assertValidPolygon(id: string, points: V2Point[]): void {
  if (points.length < 3) {
    throw new Error(`${id}: polygon needs at least three points.`);
  }

  if (!points.every(isFinitePoint)) {
    throw new Error(`${id}: polygon contains non-finite points.`);
  }

  for (let index = 0; index < points.length; index += 1) {
    if (distance(points[index], points[(index + 1) % points.length]) <= EPSILON) {
      throw new Error(`${id}: polygon contains a zero-length edge.`);
    }
  }

  if (hasSelfIntersection(points)) {
    throw new Error(`${id}: polygon self-intersects.`);
  }
}

export function hasSelfIntersection(points: V2Point[]): boolean {
  for (let a = 0; a < points.length; a += 1) {
    const a1 = points[a];
    const a2 = points[(a + 1) % points.length];
    for (let b = a + 1; b < points.length; b += 1) {
      if (Math.abs(a - b) <= 1 || (a === 0 && b === points.length - 1)) continue;
      const b1 = points[b];
      const b2 = points[(b + 1) % points.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

export function pointOnSegment(point: V2Point, start: V2Point, end: V2Point): boolean {
  const length = distance(start, end);
  if (length <= EPSILON) return distance(point, start) <= EPSILON;
  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
  return cross / length <= EPSILON && dot >= -EPSILON && dot <= length * length + EPSILON;
}

function segmentsIntersect(a1: V2Point, a2: V2Point, b1: V2Point, b2: V2Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  return o1 * o2 < -EPSILON && o3 * o4 < -EPSILON;
}

function orientation(a: V2Point, b: V2Point, c: V2Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
