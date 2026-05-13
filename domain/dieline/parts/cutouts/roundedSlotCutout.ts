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

type RoundedSlotCutoutConfig = ComponentRecipePart & {
  attachToFace?: string;
  centeredOnAnchor?: boolean;
  height?: string | number;
  margin?: string | number;
  offsetFromBase?: string | number;
  orientation?: "horizontal" | "vertical";
  radius?: string | number;
  referencePending?: boolean;
  width?: string | number;
};

export const roundedSlotCutoutPart: DielinePartGenerator<RoundedSlotCutoutConfig> = {
  type: "rounded-slot-cutout",
  build(ctx, config) {
    const target = resolveTarget(ctx.faces, ctx.anchors, config.attachToFace ?? config.attachTo);
    const requestedWidth = ctx.numberValue(config.width, `${config.id}.width`);
    const requestedHeight = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedRadius = ctx.numberValue(config.radius ?? requestedHeight / 2, `${config.id}.radius`);
    const margin = ctx.numberValue(config.margin ?? 2, `${config.id}.margin`);
    const orientation = config.orientation ?? "horizontal";
    const width = orientation === "horizontal" ? requestedWidth : requestedHeight;
    const height = orientation === "horizontal" ? requestedHeight : requestedWidth;
    const warnings: string[] = [];

    assertPositiveFinite(width, `rounded-slot-cutout part ${config.id} width`);
    assertPositiveFinite(height, `rounded-slot-cutout part ${config.id} height`);
    assertFinite(requestedRadius, `rounded-slot-cutout part ${config.id} radius`);
    assertPositiveFinite(margin, `rounded-slot-cutout part ${config.id} margin`);

    const placement = target.anchor
      ? placeFromAnchor(ctx, config, target.anchor, width, height, margin)
      : {
          x: target.face.bounds.x + target.face.bounds.width / 2 - width / 2,
          y: target.face.bounds.y + target.face.bounds.height / 2 - height / 2,
          width,
          height,
        };
    const radius = clamp(Math.max(0, requestedRadius), 0, Math.min(placement.width, placement.height) / 2);
    const slot: GeometryPrimitive = {
      id: config.id,
      layer: "hole",
      type: "slot",
      ...placement,
      radius,
    };

    validateRectCutoutPlacement(config.id, placementWithId(config.id, placement), target.face, ctx.creases, ctx.faces, margin);

    if (config.referencePending) {
      warnings.push(`${config.id}: rounded slot placement is reference-pending and must be visually compared.`);
    }

    return {
      geometry: [slot],
      warnings,
      part: {
        id: config.id,
        label: "Rounded slot cutout",
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
    throw new Error("rounded-slot-cutout part must declare attachTo or attachToFace.");
  }

  const anchor = anchors.get(attachTo);
  if (anchor) {
    const face = faces.find((candidate) => candidate.id === anchor.faceId);
    if (!face) throw new Error(`rounded-slot-cutout attachTo ${attachTo} references missing face ${anchor.faceId}.`);
    return { face, anchor };
  }

  const face = faces.find((candidate) => candidate.id === attachTo);
  if (!face) throw new Error(`rounded-slot-cutout attachTo must resolve to a face or anchor: ${attachTo}`);
  return { face };
}

function placeFromAnchor(
  ctx: ComponentLayoutContext,
  config: RoundedSlotCutoutConfig,
  anchor: Anchor,
  width: number,
  height: number,
  margin: number,
) {
  const offset = ctx.numberValue(config.offsetFromBase ?? margin + height / 2, `${config.id}.offsetFromBase`);
  assertPositiveFinite(offset, `rounded-slot-cutout part ${config.id} offsetFromBase`);

  const along = config.centeredOnAnchor === false ? 0 : anchor.length / 2;
  const center = {
    x: anchor.start.x + anchor.tangent.x * along - anchor.normal.x * offset,
    y: anchor.start.y + anchor.tangent.y * along - anchor.normal.y * offset,
  };

  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}

function placementWithId(id: string, rect: { x: number; y: number; width: number; height: number }) {
  return { id, ...rect };
}
