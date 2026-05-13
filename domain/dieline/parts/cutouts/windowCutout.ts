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

type WindowCutoutConfig = ComponentRecipePart & {
  attachToFace?: string;
  centerX?: string | number;
  centerY?: string | number;
  height?: string | number;
  margin?: string | number;
  radius?: string | number;
  width?: string | number;
};

export const windowCutoutPart: DielinePartGenerator<WindowCutoutConfig> = {
  type: "window-cutout",
  build(ctx, config) {
    const target = resolveTarget(ctx.faces, ctx.anchors, config.attachToFace ?? config.attachTo);
    const width = ctx.numberValue(config.width, `${config.id}.width`);
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedRadius = ctx.numberValue(config.radius ?? 0, `${config.id}.radius`);
    const margin = ctx.numberValue(config.margin ?? 4, `${config.id}.margin`);

    assertPositiveFinite(width, `window-cutout part ${config.id} width`);
    assertPositiveFinite(height, `window-cutout part ${config.id} height`);
    assertFinite(requestedRadius, `window-cutout part ${config.id} radius`);
    assertPositiveFinite(margin, `window-cutout part ${config.id} margin`);

    if (target.face.role === "glue") {
      throw new Error(`window-cutout part ${config.id} cannot be placed on glue face ${target.face.id}.`);
    }

    const center = target.anchor
      ? placeFromAnchor(ctx, config, target.anchor, width, height, margin)
      : placeFromFace(ctx, config, target.face);
    const primitive: GeometryPrimitive = {
      id: config.id,
      layer: "window",
      type: "rounded-rect",
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      radius: clamp(Math.max(0, requestedRadius), 0, Math.min(width, height) / 2),
    };

    validateRectCutoutPlacement(config.id, primitive, target.face, ctx.creases, ctx.faces, margin);

    return {
      geometry: [primitive],
      warnings: [`${config.id}: window cutout is experimental and must be visually compared with a reference.`],
      part: {
        id: config.id,
        label: "Window cutout",
        role: "window",
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
    throw new Error("window-cutout part must declare attachTo or attachToFace.");
  }

  const anchor = anchors.get(attachTo);
  if (anchor) {
    const face = faces.find((candidate) => candidate.id === anchor.faceId);
    if (!face) throw new Error(`window-cutout attachTo ${attachTo} references missing face ${anchor.faceId}.`);
    return { face, anchor };
  }

  const face = faces.find((candidate) => candidate.id === attachTo);
  if (!face) throw new Error(`window-cutout attachTo must resolve to a face or anchor: ${attachTo}`);
  return { face };
}

function placeFromAnchor(
  ctx: ComponentLayoutContext,
  config: WindowCutoutConfig,
  anchor: Anchor,
  width: number,
  height: number,
  margin: number,
) {
  const offset = ctx.numberValue(config.centerY ?? margin + height / 2, `${config.id}.centerY`);
  const along = ctx.numberValue(config.centerX ?? anchor.length / 2, `${config.id}.centerX`);
  assertPositiveFinite(offset, `window-cutout part ${config.id} centerY`);
  assertFinite(along, `window-cutout part ${config.id} centerX`);

  return {
    x: anchor.start.x + anchor.tangent.x * along - anchor.normal.x * offset,
    y: anchor.start.y + anchor.tangent.y * along - anchor.normal.y * offset,
  };
}

function placeFromFace(ctx: ComponentLayoutContext, config: WindowCutoutConfig, face: DielineFace) {
  const centerX = ctx.numberValue(config.centerX ?? face.bounds.width / 2, `${config.id}.centerX`);
  const centerY = ctx.numberValue(config.centerY ?? face.bounds.height / 2, `${config.id}.centerY`);
  assertFinite(centerX, `window-cutout part ${config.id} centerX`);
  assertFinite(centerY, `window-cutout part ${config.id} centerY`);

  return {
    x: face.bounds.x + centerX,
    y: face.bounds.y + centerY,
  };
}
