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
  clamp,
  validateRectCutoutPlacement,
} from "./cutoutValidation";

type EuroSlotCutoutConfig = ComponentRecipePart & {
  attachToFace?: string;
  centerX?: string | number;
  centerY?: string | number;
  crownOffset?: string | number;
  crownRadius?: string | number;
  height?: string | number;
  margin?: string | number;
  offsetFromBase?: string | number;
  radius?: string | number;
  width?: string | number;
};

export const euroSlotCutoutPart: DielinePartGenerator<EuroSlotCutoutConfig> = {
  type: "euro-slot-cutout",
  build(ctx, config) {
    const target = resolveTarget(ctx.faces, ctx.anchors, config.attachToFace ?? config.attachTo);
    const width = ctx.numberValue(config.width, `${config.id}.width`);
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedRadius = ctx.numberValue(config.radius ?? height / 2, `${config.id}.radius`);
    const requestedCrownRadius = ctx.numberValue(config.crownRadius ?? height * 0.78, `${config.id}.crownRadius`);
    const crownOffset = ctx.numberValue(config.crownOffset ?? height * 0.12, `${config.id}.crownOffset`);
    const margin = ctx.numberValue(config.margin ?? 2, `${config.id}.margin`);

    assertPositiveFinite(width, `euro-slot-cutout part ${config.id} width`);
    assertPositiveFinite(height, `euro-slot-cutout part ${config.id} height`);
    assertFinite(requestedRadius, `euro-slot-cutout part ${config.id} radius`);
    assertPositiveFinite(requestedCrownRadius, `euro-slot-cutout part ${config.id} crown radius`);
    assertFinite(crownOffset, `euro-slot-cutout part ${config.id} crown offset`);
    assertPositiveFinite(margin, `euro-slot-cutout part ${config.id} margin`);

    if (target.face.role === "glue") {
      throw new Error(`euro-slot-cutout part ${config.id} cannot be placed on glue face ${target.face.id}.`);
    }

    const center = target.anchor
      ? placeFromAnchor(ctx, config, target.anchor, height, margin)
      : placeFromFace(ctx, config, target.face);
    const slot = {
      id: `${config.id}-slot`,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      radius: clamp(Math.max(0, requestedRadius), 0, Math.min(width, height) / 2),
    };
    const crownRadius = clamp(requestedCrownRadius, height * 0.35, Math.min(width, height * 2.2) / 2);
    const crown = {
      id: `${config.id}-crown`,
      center: { x: center.x, y: center.y - crownOffset },
      radius: crownRadius,
    };
    const combined = {
      id: config.id,
      x: Math.min(slot.x, crown.center.x - crown.radius),
      y: Math.min(slot.y, crown.center.y - crown.radius),
      width: Math.max(slot.x + slot.width, crown.center.x + crown.radius) - Math.min(slot.x, crown.center.x - crown.radius),
      height: Math.max(slot.y + slot.height, crown.center.y + crown.radius) - Math.min(slot.y, crown.center.y - crown.radius),
    };

    validateRectCutoutPlacement(config.id, combined, target.face, ctx.creases, ctx.faces, margin);

    const geometry: GeometryPrimitive[] = [
      {
        id: slot.id,
        layer: "hole",
        type: "slot",
        x: slot.x,
        y: slot.y,
        width: slot.width,
        height: slot.height,
        radius: slot.radius,
      },
      {
        id: crown.id,
        layer: "hole",
        type: "circle",
        center: crown.center,
        radius: crown.radius,
      },
    ];

    return {
      geometry,
      warnings: [`${config.id}: euro slot geometry is experimental and must be visually compared with a reference.`],
      part: {
        id: config.id,
        label: "Euro slot cutout",
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
    throw new Error("euro-slot-cutout part must declare attachTo or attachToFace.");
  }

  const anchor = anchors.get(attachTo);
  if (anchor) {
    const face = faces.find((candidate) => candidate.id === anchor.faceId);
    if (!face) throw new Error(`euro-slot-cutout attachTo ${attachTo} references missing face ${anchor.faceId}.`);
    return { face, anchor };
  }

  const face = faces.find((candidate) => candidate.id === attachTo);
  if (!face) throw new Error(`euro-slot-cutout attachTo must resolve to a face or anchor: ${attachTo}`);
  return { face };
}

function placeFromAnchor(
  ctx: ComponentLayoutContext,
  config: EuroSlotCutoutConfig,
  anchor: Anchor,
  height: number,
  margin: number,
) {
  const offset = ctx.numberValue(config.offsetFromBase ?? margin + height, `${config.id}.offsetFromBase`);
  assertPositiveFinite(offset, `euro-slot-cutout part ${config.id} offsetFromBase`);

  return {
    x: anchor.start.x + anchor.tangent.x * (anchor.length / 2) - anchor.normal.x * offset,
    y: anchor.start.y + anchor.tangent.y * (anchor.length / 2) - anchor.normal.y * offset,
  };
}

function placeFromFace(ctx: ComponentLayoutContext, config: EuroSlotCutoutConfig, face: DielineFace) {
  const centerX = ctx.numberValue(config.centerX ?? face.bounds.width / 2, `${config.id}.centerX`);
  const centerY = ctx.numberValue(config.centerY ?? face.bounds.height / 2, `${config.id}.centerY`);
  assertFinite(centerX, `euro-slot-cutout part ${config.id} centerX`);
  assertFinite(centerY, `euro-slot-cutout part ${config.id} centerY`);

  return {
    x: face.bounds.x + centerX,
    y: face.bounds.y + centerY,
  };
}
