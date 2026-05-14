import type { V2Anchor, V2Face, V2GeometryPrimitive, V2Point } from "../contracts/types";
import { distance, isFinitePoint } from "./points";
import { pointInOrOnPolygon } from "./polygon";

const EPSILON = 0.000001;

export function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be positive and finite.`);
  }
}

export function assertFinitePoint(point: V2Point, label: string): void {
  if (!isFinitePoint(point)) {
    throw new Error(`${label} must be finite.`);
  }
}

export function assertBaseEdgeMatchesAnchor(face: V2Face, anchor: V2Anchor, label: string): void {
  const first = face.points[0];
  const last = face.points[face.points.length - 1];
  if (distance(first, anchor.start) > EPSILON || distance(last, anchor.end) > EPSILON) {
    throw new Error(`${label}: base edge must match attach anchor.`);
  }
}

export function assertPrimitiveInsideFace(primitive: V2GeometryPrimitive, face: V2Face, margin = 0): void {
  for (const point of primitiveSamplePoints(primitive)) {
    if (!pointInOrOnPolygon(point, face.points)) {
      throw new Error(`${primitive.id}: primitive must stay inside ${face.id}.`);
    }
    if (margin > 0 && distanceToBounds(point, face) < margin - EPSILON) {
      throw new Error(`${primitive.id}: primitive is inside ${face.id} but violates margin.`);
    }
  }
}

export function primitiveSamplePoints(primitive: V2GeometryPrimitive): V2Point[] {
  switch (primitive.type) {
    case "circle":
      return [
        primitive.center,
        { x: primitive.center.x - primitive.radius, y: primitive.center.y },
        { x: primitive.center.x + primitive.radius, y: primitive.center.y },
        { x: primitive.center.x, y: primitive.center.y - primitive.radius },
        { x: primitive.center.x, y: primitive.center.y + primitive.radius },
      ];
    case "line":
      return [primitive.start, primitive.end];
    case "polyline":
    case "polygon":
      return primitive.points;
    case "rounded-rect":
    case "slot":
    case "euro-slot":
      return [
        { x: primitive.x, y: primitive.y },
        { x: primitive.x + primitive.width, y: primitive.y },
        { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
        { x: primitive.x, y: primitive.y + primitive.height },
        { x: primitive.x + primitive.width / 2, y: primitive.y + primitive.height / 2 },
      ];
  }
}

function distanceToBounds(point: V2Point, face: V2Face): number {
  const { x, y, width, height } = face.bounds;
  return Math.min(point.x - x, x + width - point.x, point.y - y, y + height - point.y);
}
