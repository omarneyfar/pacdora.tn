import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace } from "../../types";
import { assertPositiveFinite, clampTaper, pushAdjustmentWarning } from "../adaptiveGeometry";
import { crease } from "../body/bodyStrip";

type DustFlapConfig = ComponentRecipePart & {
  height?: string | number;
  faceId?: string;
};

export const dustFlapPart: DielinePartGenerator<DustFlapConfig> = {
  type: "dust-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`dust-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`dust-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const position = anchor.edge === "top" ? "top" : "bottom";
    const x = Math.min(anchor.start.x, anchor.end.x);
    const width = anchor.length;
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    assertPositiveFinite(height, `dust-flap part ${config.id} height`);

    const requestedTaper = Math.min(width * 0.08, height * 0.16, Math.max(2, width * 0.18));
    const taper = clampTaper(requestedTaper, width, height);
    const warnings: string[] = [];

    pushAdjustmentWarning(warnings, config.id, "taper", requestedTaper, taper);

    const y = position === "top" ? anchor.start.y - height : anchor.start.y;
    const faceId = config.faceId ?? `${position}-dust-${anchor.faceId}`;
    const face = createDustFlapFace(
      faceId,
      x,
      y,
      width,
      height,
      taper,
      position,
      `${capitalize(position)} dust flap (${anchor.faceId.charAt(0).toUpperCase()})`,
    );
    const structuralCrease = crease(`cr-${anchor.faceId}-${position}dust`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings,
      part: {
        id: config.id,
        label: `${capitalize(position)} dust flap`,
        role: "dust-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createDustFlapFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  taper: number,
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x: x + taper, y },
        { x: x + width - taper, y },
        { x: x + width, y: y + height },
      ]
    : [
        { x, y },
        { x: x + taper, y: y + height },
        { x: x + width - taper, y: y + height },
        { x: x + width, y },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
