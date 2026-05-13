import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace } from "../../types";
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

    const height = ctx.numberValue(config.height, `${config.id}.height`);
    if (height <= 0) {
      throw new Error(`dust-flap part ${config.id} height must be positive.`);
    }

    const position = anchor.edge === "top" ? "top" : "bottom";
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = position === "top" ? anchor.start.y - height : anchor.start.y;
    const width = anchor.length;
    const faceId = config.faceId ?? `${position}-dust-${anchor.faceId}`;
    const face = createDustFlapFace(
      faceId,
      x,
      y,
      width,
      height,
      position,
      `${capitalize(position)} dust flap (${anchor.faceId.charAt(0).toUpperCase()})`,
    );
    const structuralCrease = crease(`cr-${anchor.faceId}-${position}dust`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
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
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const taper = Math.min(width * 0.15, height * 0.3);
  const shoulder = Math.min(3, height * 0.1);
  const topY = direction === "top" ? y : y + height;
  const lidY = direction === "top" ? y + height : y;
  const shoulderY = direction === "top" ? lidY - shoulder : lidY + shoulder;
  const vertices = [
    { x, y: lidY },
    { x, y: shoulderY },
    { x: x + taper, y: topY },
    { x: x + width - taper, y: topY },
    { x: x + width, y: shoulderY },
    { x: x + width, y: lidY },
  ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
