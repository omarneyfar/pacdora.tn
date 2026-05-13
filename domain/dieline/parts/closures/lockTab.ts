import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { createDielineFace } from "../../geometry";
import type { DielineFace, Point } from "../../types";
import { crease } from "../body/bodyStrip";
import {
  assertNoSelfIntersection,
  assertPositiveFinite,
  clamp,
} from "../cutouts/cutoutValidation";

type LockTabConfig = ComponentRecipePart & {
  faceId?: string;
  height?: string | number;
  shoulder?: string | number;
  side?: "top" | "bottom";
  tipWidth?: string | number;
};

export const lockTabPart: DielinePartGenerator<LockTabConfig> = {
  type: "lock-tab",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`lock-tab part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`lock-tab part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const side = config.side ?? (anchor.edge === "top" ? "top" : "bottom");
    if (side !== anchor.edge) {
      throw new Error(`lock-tab part ${config.id} side must match attachTo anchor edge.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedTipWidth = ctx.numberValue(config.tipWidth ?? width * 0.72, `${config.id}.tipWidth`);
    const requestedShoulder = ctx.numberValue(config.shoulder ?? height * 0.28, `${config.id}.shoulder`);

    assertPositiveFinite(width, `lock-tab part ${config.id} anchor width`);
    assertPositiveFinite(height, `lock-tab part ${config.id} height`);
    assertPositiveFinite(requestedTipWidth, `lock-tab part ${config.id} tip width`);
    assertPositiveFinite(requestedShoulder, `lock-tab part ${config.id} shoulder`);

    const tipWidth = clamp(requestedTipWidth, Math.min(width, 0.001), width * 0.96);
    const shoulder = clamp(requestedShoulder, Math.min(height, 0.001), height * 0.75);
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = side === "top" ? anchor.start.y - height : anchor.start.y;
    const faceId = config.faceId ?? `${side}-lock-tab`;
    const face = createLockTabFace(faceId, x, y, width, height, tipWidth, shoulder, side);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings: [`${config.id}: lock tab geometry is experimental and must be compared with a reference.`],
      part: {
        id: config.id,
        label: `${capitalize(side)} lock tab`,
        role: "lock",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createLockTabFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  tipWidth: number,
  shoulder: number,
  side: "top" | "bottom",
): DielineFace {
  const inset = (width - tipWidth) / 2;
  const vertices = inset <= 0.000001
    ? createRectVertices(x, y, width, height, side)
    : createShoulderedVertices(x, y, width, height, inset, shoulder, side);

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: `${capitalize(side)} lock tab`,
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}

function createRectVertices(x: number, y: number, width: number, height: number, side: "top" | "bottom"): Point[] {
  return side === "top"
    ? [
        { x, y: y + height },
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
      ]
    : [
        { x, y },
        { x, y: y + height },
        { x: x + width, y: y + height },
        { x: x + width, y },
      ];
}

function createShoulderedVertices(
  x: number,
  y: number,
  width: number,
  height: number,
  inset: number,
  shoulder: number,
  side: "top" | "bottom",
): Point[] {
  return side === "top"
    ? [
        { x, y: y + height },
        { x, y: y + height - shoulder },
        { x: x + inset, y },
        { x: x + width - inset, y },
        { x: x + width, y: y + height - shoulder },
        { x: x + width, y: y + height },
      ]
    : [
        { x, y },
        { x, y: y + shoulder },
        { x: x + inset, y: y + height },
        { x: x + width - inset, y: y + height },
        { x: x + width, y: y + shoulder },
        { x: x + width, y },
      ];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
