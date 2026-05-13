import type {
  Anchor,
  ComponentLayoutContext,
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, Point } from "../../types";
import { assertFinite, assertPositiveFinite, pushAdjustmentWarning } from "../adaptiveGeometry";

type SlotCutoutConfig = ComponentRecipePart & {
  centerX?: string | number;
  centerY?: string | number;
  height?: string | number;
  inset?: string | number;
  offsetAlong?: string | number;
  radius?: string | number;
  safeDistance?: string | number;
  width?: string | number;
};

type SlotPrimitive = {
  id: string;
  layer: "hole";
  type: "slot";
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
};

const EPSILON = 0.000001;

export const slotCutoutPart: DielinePartGenerator<SlotCutoutConfig> = {
  type: "slot-cutout",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`slot-cutout part ${config.id} must declare attachTo.`);
    }

    const target = resolveSlotTarget(ctx.faces, ctx.anchors, config.attachTo);
    const requestedWidth = ctx.numberValue(config.width, `${config.id}.width`);
    const requestedHeight = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedRadius = ctx.numberValue(config.radius ?? requestedHeight / 2, `${config.id}.radius`);
    const safeDistance = ctx.numberValue(config.safeDistance ?? 2, `${config.id}.safeDistance`);
    const warnings: string[] = [];

    assertPositiveFinite(requestedWidth, `slot-cutout part ${config.id} width`);
    assertPositiveFinite(requestedHeight, `slot-cutout part ${config.id} height`);
    assertFinite(requestedRadius, `slot-cutout part ${config.id} radius`);
    assertPositiveFinite(safeDistance, `slot-cutout part ${config.id} safe distance`);

    if (target.face.role === "glue") {
      throw new Error(`slot-cutout part ${config.id} cannot be placed on glue face ${target.face.id}.`);
    }

    const placement = target.anchor
      ? placeFromAnchor(ctx, config, target.face, target.anchor, requestedWidth, requestedHeight, safeDistance)
      : placeFromFace(ctx, config, target.face, requestedWidth, requestedHeight);
    const radius = clamp(requestedRadius, 0, Math.max(0, Math.min(placement.width, placement.height) / 2));
    pushAdjustmentWarning(warnings, config.id, "radius", requestedRadius, radius);

    const slot: SlotPrimitive = {
      id: config.id,
      layer: "hole",
      type: "slot",
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      radius,
    };

    validateSlotPlacement(config.id, slot, target.face, ctx.creases, ctx.faces, safeDistance);

    return {
      geometry: [slot],
      warnings,
      part: {
        id: config.id,
        label: "Slot cutout",
        role: "lock",
        faceIds: [target.face.id],
      },
    };
  },
};

function resolveSlotTarget(
  faces: DielineFace[],
  anchors: Map<string, Anchor>,
  attachTo: string,
): { face: DielineFace; anchor?: Anchor } {
  const anchor = anchors.get(attachTo);
  if (anchor) {
    const face = faces.find((candidate) => candidate.id === anchor.faceId);
    if (!face) {
      throw new Error(`slot-cutout attachTo ${attachTo} references missing face ${anchor.faceId}.`);
    }
    return { face, anchor };
  }

  const face = faces.find((candidate) => candidate.id === attachTo);
  if (!face) {
    throw new Error(`slot-cutout attachTo must resolve to a face or anchor: ${attachTo}`);
  }

  return { face };
}

function placeFromAnchor(
  ctx: ComponentLayoutContext,
  config: SlotCutoutConfig,
  face: DielineFace,
  anchor: Anchor,
  requestedWidth: number,
  requestedHeight: number,
  safeDistance: number,
) {
  const offsetAlong = ctx.numberValue(config.offsetAlong ?? anchor.length / 2, `${config.id}.offsetAlong`);
  const inset = ctx.numberValue(config.inset ?? safeDistance + requestedHeight / 2, `${config.id}.inset`);
  assertFinite(offsetAlong, `slot-cutout part ${config.id} offset along anchor`);
  assertPositiveFinite(inset, `slot-cutout part ${config.id} inset`);

  const center = {
    x: anchor.start.x + anchor.tangent.x * offsetAlong - anchor.normal.x * inset,
    y: anchor.start.y + anchor.tangent.y * offsetAlong - anchor.normal.y * inset,
  };

  if (Math.abs(anchor.tangent.x) >= Math.abs(anchor.tangent.y)) {
    return {
      x: center.x - requestedWidth / 2,
      y: center.y - requestedHeight / 2,
      width: requestedWidth,
      height: requestedHeight,
    };
  }

  return {
    x: center.x - requestedHeight / 2,
    y: center.y - requestedWidth / 2,
    width: requestedHeight,
    height: requestedWidth,
  };
}

function placeFromFace(
  ctx: ComponentLayoutContext,
  config: SlotCutoutConfig,
  face: DielineFace,
  requestedWidth: number,
  requestedHeight: number,
) {
  const centerX = ctx.numberValue(config.centerX ?? face.bounds.width / 2, `${config.id}.centerX`);
  const centerY = ctx.numberValue(config.centerY ?? face.bounds.height / 2, `${config.id}.centerY`);
  assertFinite(centerX, `slot-cutout part ${config.id} centerX`);
  assertFinite(centerY, `slot-cutout part ${config.id} centerY`);

  return {
    x: face.bounds.x + centerX - requestedWidth / 2,
    y: face.bounds.y + centerY - requestedHeight / 2,
    width: requestedWidth,
    height: requestedHeight,
  };
}

function validateSlotPlacement(
  partId: string,
  slot: SlotPrimitive,
  face: DielineFace,
  creases: Array<{ faceA: string; faceB: string; edgeStart: Point; edgeEnd: Point; id: string }>,
  faces: DielineFace[],
  safeDistance: number,
) {
  const samples = slotSamplePoints(slot);
  const slotEdges = rectangleEdges(slot);

  for (const point of samples) {
    if (!pointInOrOnPolygon(point, face.vertices)) {
      throw new Error(`slot-cutout part ${partId} must stay inside face ${face.id}.`);
    }

    const distanceToCut = minDistanceToPolygon(point, face.vertices);
    if (distanceToCut + EPSILON < safeDistance) {
      throw new Error(`slot-cutout part ${partId} is too close to cut boundary of face ${face.id}.`);
    }
  }

  for (const crease of creases) {
    if (crease.faceA !== face.id && crease.faceB !== face.id) continue;
    for (const edge of slotEdges) {
      if (segmentsIntersect(edge.start, edge.end, crease.edgeStart, crease.edgeEnd)) {
        throw new Error(`slot-cutout part ${partId} overlaps structural crease ${crease.id}.`);
      }
    }

    const distance = Math.min(...samples.map((point) => distanceToSegment(point, crease.edgeStart, crease.edgeEnd)));
    if (distance + EPSILON < safeDistance) {
      throw new Error(`slot-cutout part ${partId} is too close to structural crease ${crease.id}.`);
    }
  }

  for (const glueFace of faces.filter((candidate) => candidate.role === "glue")) {
    if (rectanglesOverlap(expandBounds(glueFace.bounds, safeDistance), slot)) {
      throw new Error(`slot-cutout part ${partId} is too close to glue zone ${glueFace.id}.`);
    }
  }
}

function slotSamplePoints(slot: SlotPrimitive): Point[] {
  const centerX = slot.x + slot.width / 2;
  const centerY = slot.y + slot.height / 2;
  return [
    { x: slot.x, y: slot.y },
    { x: slot.x + slot.width, y: slot.y },
    { x: slot.x + slot.width, y: slot.y + slot.height },
    { x: slot.x, y: slot.y + slot.height },
    { x: centerX, y: slot.y },
    { x: slot.x + slot.width, y: centerY },
    { x: centerX, y: slot.y + slot.height },
    { x: slot.x, y: centerY },
    { x: centerX, y: centerY },
  ];
}

function rectangleEdges(rect: { x: number; y: number; width: number; height: number }) {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];

  return points.map((start, index) => ({ start, end: points[(index + 1) % points.length] }));
}

function pointInOrOnPolygon(point: Point, points: Point[]): boolean {
  if (points.some((start, index) => pointOnSegment(point, start, points[(index + 1) % points.length]))) {
    return true;
  }

  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const a = points[current];
    const b = points[previous];
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function minDistanceToPolygon(point: Point, points: Point[]): number {
  return Math.min(...points.map((start, index) => distanceToSegment(point, start, points[(index + 1) % points.length])));
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  return distanceToSegment(point, start, end) <= EPSILON;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 * o2 < -EPSILON && o3 * o4 < -EPSILON) {
    return true;
  }

  return pointOnSegment(b1, a1, a2)
    || pointOnSegment(b2, a1, a2)
    || pointOnSegment(a1, b1, b2)
    || pointOnSegment(a2, b1, b2);
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function rectanglesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function expandBounds(bounds: { x: number; y: number; width: number; height: number }, amount: number) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
