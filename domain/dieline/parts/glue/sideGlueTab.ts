import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { assertPositiveFinite, pushAdjustmentWarning, safeBevel } from "../adaptiveGeometry";
import { crease } from "../body/bodyStrip";

type SideGlueTabConfig = ComponentRecipePart & {
  width?: string | number;
  faceId?: string;
};

export const sideGlueTabPart: DielinePartGenerator<SideGlueTabConfig> = {
  type: "glue-tab",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`glue-tab part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "left" && anchor.edge !== "right") {
      throw new Error(`glue-tab part ${config.id} must attach to a left or right edge anchor.`);
    }

    const width = ctx.numberValue(config.width, `${config.id}.width`);
    const height = anchor.length;
    const warnings: string[] = [];

    assertPositiveFinite(width, `glue-tab part ${config.id} width`);
    assertPositiveFinite(height, `glue-tab part ${config.id} height`);

    const faceId = config.faceId ?? "glue-tab";
    const x = anchor.edge === "right" ? anchor.start.x : anchor.start.x - width;
    const y = Math.min(anchor.start.y, anchor.end.y);
    const bevelSide = anchor.edge === "right" ? "right" : "left";
    const requestedBevel = Math.min(width * 0.34, height * 0.08);
    const bevel = safeBevel(width, height);
    pushAdjustmentWarning(warnings, config.id, "bevel", requestedBevel, bevel);

    const face = createGlueTabFace(faceId, x, y, width, height, bevelSide, bevel);
    const structuralCrease = crease(`cr-${anchor.faceId}-glue`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings,
      part: {
        id: config.id,
        label: "Glue tab",
        role: "glue-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createGlueTabFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  bevelSide: "left" | "right",
  bevel: number,
) {
  const vertices = bevelSide === "right"
    ? [
        { x, y },
        { x: x + width, y: y + bevel },
        { x: x + width, y: y + height - bevel },
        { x, y: y + height },
      ]
    : [
        { x, y: y + bevel },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height - bevel },
      ];

  return createDielineFace({
    id,
    label: "Glue tab",
    vertices,
    role: "glue",
    artworkEnabled: false,
  });
}
