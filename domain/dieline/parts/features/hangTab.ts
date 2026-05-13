import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { createDielineFace } from "../../geometry";
import type { DielineFace } from "../../types";
import { crease } from "../body/bodyStrip";
import {
  assertNoSelfIntersection,
  assertPositiveFinite,
  clamp,
} from "../cutouts/cutoutValidation";

type HangTabConfig = ComponentRecipePart & {
  faceId?: string;
  height?: string | number;
  shoulder?: string | number;
  side?: "top" | "bottom";
  topWidth?: string | number;
};

export const hangTabPart: DielinePartGenerator<HangTabConfig> = {
  type: "hang-tab",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`hang-tab part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`hang-tab part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const side = config.side ?? (anchor.edge === "top" ? "top" : "bottom");
    if (side !== anchor.edge) {
      throw new Error(`hang-tab part ${config.id} side must match attachTo anchor edge.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedTopWidth = ctx.numberValue(config.topWidth ?? width * 0.82, `${config.id}.topWidth`);
    const requestedShoulder = ctx.numberValue(config.shoulder ?? height * 0.22, `${config.id}.shoulder`);

    assertPositiveFinite(width, `hang-tab part ${config.id} anchor width`);
    assertPositiveFinite(height, `hang-tab part ${config.id} height`);
    assertPositiveFinite(requestedTopWidth, `hang-tab part ${config.id} top width`);
    assertPositiveFinite(requestedShoulder, `hang-tab part ${config.id} shoulder`);

    const topWidth = clamp(requestedTopWidth, Math.min(width, 0.001), width);
    const shoulder = clamp(requestedShoulder, Math.min(height, 0.001), height * 0.6);
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = side === "top" ? anchor.start.y - height : anchor.start.y;
    const faceId = config.faceId ?? `${side}-hang-tab`;
    const face = createHangTabFace(faceId, x, y, width, height, topWidth, shoulder, side);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings: [`${config.id}: hang tab geometry is experimental and must be visually compared with a reference.`],
      part: {
        id: config.id,
        label: `${capitalize(side)} hang tab`,
        role: "handle",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createHangTabFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  topWidth: number,
  shoulder: number,
  side: "top" | "bottom",
): DielineFace {
  const inset = (width - topWidth) / 2;
  const vertices = side === "top"
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

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: `${capitalize(side)} hang tab`,
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
