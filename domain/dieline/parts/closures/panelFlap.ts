import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { createRectFace, crease } from "../body/bodyStrip";

type PanelFlapConfig = ComponentRecipePart & {
  height?: string | number;
  faceId?: string;
};

export const panelFlapPart: DielinePartGenerator<PanelFlapConfig> = {
  type: "panel-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`panel-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`panel-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const height = ctx.numberValue(config.height, `${config.id}.height`);
    if (height <= 0) {
      throw new Error(`panel-flap part ${config.id} height must be positive.`);
    }

    const position = anchor.edge === "top" ? "top" : "bottom";
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = position === "top" ? anchor.start.y - height : anchor.start.y;
    const width = anchor.length;
    const faceId = config.faceId ?? `${position}-panel`;
    const face = createRectFace(faceId, x, y, width, height, "flap", `${capitalize(position)} panel`);
    const structuralCrease = crease(`cr-${anchor.faceId}-${position}panel`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      part: {
        id: config.id,
        label: `${capitalize(position)} panel flap`,
        role: "closure",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
