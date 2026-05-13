import type {
  Anchor,
  ComponentLayoutContext,
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, GeometryPrimitive } from "../../types";
import { assertFinite } from "../adaptiveGeometry";
import {
  assertPositiveFinite,
  distanceToSegment,
  expandBounds,
  minDistanceToPolygon,
  pointInOrOnPolygon,
  rectanglesOverlap,
} from "./cutoutValidation";

type CircularHoleCutoutConfig = ComponentRecipePart & {
  attachToFace?: string;
  centerX?: string | number;
  centerY?: string | number;
  margin?: string | number;
  offsetFromBase?: string | number;
  radius?: string | number;
};

export const circularHoleCutoutPart: DielinePartGenerator<CircularHoleCutoutConfig> = {
  type: "circular-hole-cutout",
  build(ctx, config) {
    const target = resolveTarget(ctx.faces, ctx.anchors, config.attachToFace ?? config.attachTo);
    const radius = ctx.numberValue(config.radius, `${config.id}.radius`);
    const margin = ctx.numberValue(config.margin ?? 2, `${config.id}.margin`);

    assertPositiveFinite(radius, `circular-hole-cutout part ${config.id} radius`);
    assertPositiveFinite(margin, `circular-hole-cutout part ${config.id} margin`);

    if (target.face.role === "glue") {
      throw new Error(`circular-hole-cutout part ${config.id} cannot be placed on glue face ${target.face.id}.`);
    }

    const center = target.anchor
      ? placeFromAnchor(ctx, config, target.anchor, radius, margin)
      : placeFromFace(ctx, config, target.face);
    const primitive: GeometryPrimitive = {
      id: config.id,
      layer: "hole",
      type: "circle",
      center,
      radius,
    };

    validateCircleCutoutPlacement(config.id, center, radius, target.face, ctx.creases, ctx.faces, margin);

    return {
      geometry: [primitive],
      warnings: [`${config.id}: circular hole placement is experimental and must be compared with a reference.`],
      part: {
        id: config.id,
        label: "Circular hole cutout",
        role: "lock",
        faceIds: [target.face.id],
      },
    };
  },
};

function resolveTarget(
  faces: DielineFace[],
  anchors: Map<string, Anchor>,
  attachTo?: string,
): { face: DielineFace; anchor?: Anchor } {
  if (!attachTo) {
    throw new Error("circular-hole-cutout part must declare attachTo or attachToFace.");
  }

  const anchor = anchors.get(attachTo);
  if (anchor) {
    const face = faces.find((candidate) => candidate.id === anchor.faceId);
    if (!face) throw new Error(`circular-hole-cutout attachTo ${attachTo} references missing face ${anchor.faceId}.`);
    return { face, anchor };
  }

  const face = faces.find((candidate) => candidate.id === attachTo);
  if (!face) throw new Error(`circular-hole-cutout attachTo must resolve to a face or anchor: ${attachTo}`);
  return { face };
}

function validateCircleCutoutPlacement(
  partId: string,
  center: { x: number; y: number },
  radius: number,
  face: DielineFace,
  creases: Array<{ faceA: string; faceB: string; edgeStart: { x: number; y: number }; edgeEnd: { x: number; y: number }; id: string }>,
  faces: DielineFace[],
  margin: number,
) {
  const samples = [
    center,
    { x: center.x - radius, y: center.y },
    { x: center.x, y: center.y - radius },
    { x: center.x + radius, y: center.y },
    { x: center.x, y: center.y + radius },
  ];

  for (const point of samples) {
    if (!pointInOrOnPolygon(point, face.vertices)) {
      throw new Error(`${partId} must stay inside face ${face.id}.`);
    }

    if (minDistanceToPolygon(point, face.vertices) + 0.000001 < margin) {
      throw new Error(`${partId} is too close to cut boundary of face ${face.id}.`);
    }
  }

  for (const crease of creases) {
    if (crease.faceA !== face.id && crease.faceB !== face.id) continue;
    if (distanceToSegment(center, crease.edgeStart, crease.edgeEnd) + 0.000001 < radius + margin) {
      throw new Error(`${partId} is too close to structural crease ${crease.id}.`);
    }
  }

  const bounds = { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 };
  for (const glueFace of faces.filter((candidate) => candidate.role === "glue")) {
    if (rectanglesOverlap(expandBounds(glueFace.bounds, margin), bounds)) {
      throw new Error(`${partId} is too close to glue zone ${glueFace.id}.`);
    }
  }
}

function placeFromAnchor(
  ctx: ComponentLayoutContext,
  config: CircularHoleCutoutConfig,
  anchor: Anchor,
  radius: number,
  margin: number,
) {
  const offset = ctx.numberValue(config.offsetFromBase ?? margin + radius, `${config.id}.offsetFromBase`);
  assertPositiveFinite(offset, `circular-hole-cutout part ${config.id} offsetFromBase`);

  return {
    x: anchor.start.x + anchor.tangent.x * (anchor.length / 2) - anchor.normal.x * offset,
    y: anchor.start.y + anchor.tangent.y * (anchor.length / 2) - anchor.normal.y * offset,
  };
}

function placeFromFace(ctx: ComponentLayoutContext, config: CircularHoleCutoutConfig, face: DielineFace) {
  const centerX = ctx.numberValue(config.centerX ?? face.bounds.width / 2, `${config.id}.centerX`);
  const centerY = ctx.numberValue(config.centerY ?? face.bounds.height / 2, `${config.id}.centerY`);
  assertFinite(centerX, `circular-hole-cutout part ${config.id} centerX`);
  assertFinite(centerY, `circular-hole-cutout part ${config.id} centerY`);

  return {
    x: face.bounds.x + centerX,
    y: face.bounds.y + centerY,
  };
}
