import type { DielineFace, Point } from "../../types";

export const CUTOUT_EPSILON = 0.000001;

export type RectCutoutBounds = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type StructuralEdge = {
  id: string;
  faceA: string;
  faceB: string;
  edgeStart: Point;
  edgeEnd: Point;
};

export function validateRectCutoutPlacement(
  partId: string,
  rect: RectCutoutBounds,
  face: DielineFace,
  creases: StructuralEdge[],
  faces: DielineFace[],
  margin: number,
) {
  assertPositiveFinite(rect.width, `${partId} width`);
  assertPositiveFinite(rect.height, `${partId} height`);
  assertPositiveFinite(margin, `${partId} margin`);

  const samples = rectSamplePoints(rect);
  const rectEdges = rectangleEdges(rect);

  for (const point of samples) {
    if (!pointInOrOnPolygon(point, face.vertices)) {
      throw new Error(`${partId} must stay inside face ${face.id}.`);
    }

    if (minDistanceToPolygon(point, face.vertices) + CUTOUT_EPSILON < margin) {
      throw new Error(`${partId} is too close to cut boundary of face ${face.id}.`);
    }
  }

  for (const crease of creases) {
    if (crease.faceA !== face.id && crease.faceB !== face.id) continue;

    for (const edge of rectEdges) {
      if (segmentsTouchOrIntersect(edge.start, edge.end, crease.edgeStart, crease.edgeEnd)) {
        throw new Error(`${partId} overlaps structural crease ${crease.id}.`);
      }
    }

    const distance = Math.min(...samples.map((point) => distanceToSegment(point, crease.edgeStart, crease.edgeEnd)));
    if (distance + CUTOUT_EPSILON < margin) {
      throw new Error(`${partId} is too close to structural crease ${crease.id}.`);
    }
  }

  for (const glueFace of faces.filter((candidate) => candidate.role === "glue")) {
    if (rectanglesOverlap(expandBounds(glueFace.bounds, margin), rect)) {
      throw new Error(`${partId} is too close to glue zone ${glueFace.id}.`);
    }
  }
}

export function validateCutPolyline(
  partId: string,
  points: Point[],
  creases: StructuralEdge[],
  allowCreaseOverlap = false,
) {
  if (points.length < 2) {
    throw new Error(`${partId} relief notch must contain at least two points.`);
  }

  for (let index = 1; index < points.length; index += 1) {
    if (distance2D(points[index - 1], points[index]) <= CUTOUT_EPSILON) {
      throw new Error(`${partId} relief notch contains a zero-length cut segment.`);
    }
  }

  if (hasSelfCrossingPolyline(points)) {
    throw new Error(`${partId} relief notch cut path self-intersects.`);
  }

  if (allowCreaseOverlap) {
    return;
  }

  const segments = points.slice(0, -1).map((start, index) => ({ start, end: points[index + 1] }));
  for (const crease of creases) {
    for (const segment of segments) {
      if (collinearOverlapLength(segment.start, segment.end, crease.edgeStart, crease.edgeEnd) > CUTOUT_EPSILON) {
        throw new Error(`${partId} relief notch overlaps structural crease ${crease.id}.`);
      }
    }
  }
}

export function assertNoSelfIntersection(partId: string, points: Point[]) {
  if (hasSelfCrossingPolygon(points)) {
    throw new Error(`${partId} polygon self-intersects.`);
  }

  if (points.some((point, index) => distance2D(point, points[(index + 1) % points.length]) <= CUTOUT_EPSILON)) {
    throw new Error(`${partId} polygon contains a zero-length edge.`);
  }
}

export function rectSamplePoints(rect: RectCutoutBounds): Point[] {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
    { x: centerX, y: rect.y },
    { x: rect.x + rect.width, y: centerY },
    { x: centerX, y: rect.y + rect.height },
    { x: rect.x, y: centerY },
    { x: centerX, y: centerY },
  ];
}

export function rectangleEdges(rect: RectCutoutBounds) {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];

  return points.map((start, index) => ({ start, end: points[(index + 1) % points.length] }));
}

export function pointInOrOnPolygon(point: Point, points: Point[]): boolean {
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

export function minDistanceToPolygon(point: Point, points: Point[]): number {
  return Math.min(...points.map((start, index) => distanceToSegment(point, start, points[(index + 1) % points.length])));
}

export function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  return distanceToSegment(point, start, end) <= CUTOUT_EPSILON;
}

export function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= CUTOUT_EPSILON) {
    return distance2D(point, start);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance2D(point, { x: start.x + dx * t, y: start.y + dy * t });
}

export function segmentsTouchOrIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  return segmentsIntersect(a1, a2, b1, b2)
    || pointOnSegment(a1, b1, b2)
    || pointOnSegment(a2, b1, b2)
    || pointOnSegment(b1, a1, a2)
    || pointOnSegment(b2, a1, a2);
}

export function rectanglesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function expandBounds(bounds: { x: number; y: number; width: number; height: number }, amount: number) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  };
}

export function distance2D(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

export function sampleQuarterArc(center: Point, radius: number, startAngle: number, endAngle: number, segments = 6): Point[] {
  if (radius <= CUTOUT_EPSILON) {
    return [center];
  }

  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / segments;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  return o1 * o2 < -CUTOUT_EPSILON && o3 * o4 < -CUTOUT_EPSILON;
}

function hasSelfCrossingPolygon(points: Point[]): boolean {
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

function hasSelfCrossingPolyline(points: Point[]): boolean {
  const segments = points.slice(0, -1).map((start, index) => ({ start, end: points[index + 1] }));

  for (let a = 0; a < segments.length; a += 1) {
    for (let b = a + 1; b < segments.length; b += 1) {
      if (Math.abs(a - b) <= 1) continue;
      if (segmentsIntersect(segments[a].start, segments[a].end, segments[b].start, segments[b].end)) return true;
    }
  }

  return false;
}

function collinearOverlapLength(a1: Point, a2: Point, b1: Point, b2: Point): number {
  if (Math.abs(orientation(a1, a2, b1)) > CUTOUT_EPSILON || Math.abs(orientation(a1, a2, b2)) > CUTOUT_EPSILON) {
    return 0;
  }

  const axis = Math.abs(a2.x - a1.x) >= Math.abs(a2.y - a1.y) ? "x" : "y";
  const aMin = Math.min(a1[axis], a2[axis]);
  const aMax = Math.max(a1[axis], a2[axis]);
  const bMin = Math.min(b1[axis], b2[axis]);
  const bMax = Math.max(b1[axis], b2[axis]);

  return Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin));
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
