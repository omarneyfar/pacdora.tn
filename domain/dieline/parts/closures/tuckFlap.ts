import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, GeometryPrimitive, Point } from "../../types";
import { crease } from "../body/bodyStrip";

type TuckFlapConfig = ComponentRecipePart & {
  height?: string | number;
  lipHeight?: string | number;
  taper?: string | number;
  scoreOffset?: string | number;
  faceId?: string;
};

export const tuckFlapPart: DielinePartGenerator<TuckFlapConfig> = {
  type: "tuck-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`tuck-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`tuck-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const lipHeight = ctx.numberValue(config.lipHeight, `${config.id}.lipHeight`);
    const cornerRadius = ctx.numberValue(config.taper ?? 0, `${config.id}.taper`);
    const scoreOffset = ctx.numberValue(config.scoreOffset, `${config.id}.scoreOffset`);

    if (height <= 0 || lipHeight < 0 || scoreOffset < 0) {
      throw new Error(`tuck-flap part ${config.id} has invalid dimensions.`);
    }

    const position = anchor.edge === "top" ? "top" : "bottom";
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = position === "top" ? anchor.start.y - height : anchor.start.y;
    const width = anchor.length;
    const faceId = config.faceId ?? `${position}-tuck`;
    const face = createTuckFlapFace(
      faceId,
      x,
      y,
      width,
      height,
      lipHeight,
      cornerRadius,
      position,
      `${capitalize(position)} tuck flap`,
    );
    const structuralCrease = crease(`cr-${anchor.faceId}-${position}tuck`, anchor.faceId, faceId, anchor.start, anchor.end);
    const scoreLine: GeometryPrimitive = {
      id: `score-${faceId}-lip`,
      layer: "crease",
      type: "line",
      start: { x, y: y + scoreOffset },
      end: { x: x + width, y: y + scoreOffset },
    };

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      geometry: [scoreLine],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      part: {
        id: config.id,
        label: `${capitalize(position)} tuck flap`,
        role: "tuck-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createTuckFlapFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lipHeight: number,
  cornerRadius: number,
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const r = Math.max(0, Math.min(cornerRadius, lipHeight * 0.75, width * 0.16, height * 0.22, 8));
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x, y: y + r },
        ...sampleQuarterArc({ x: x + r, y: y + r }, r, Math.PI, Math.PI * 1.5).slice(1),
        { x: x + width - r, y },
        ...sampleQuarterArc({ x: x + width - r, y: y + r }, r, Math.PI * 1.5, Math.PI * 2).slice(1),
        { x: x + width, y: y + height },
      ]
    : [
        { x, y },
        { x, y: y + height - r },
        ...sampleQuarterArc({ x: x + r, y: y + height - r }, r, Math.PI, Math.PI * 0.5).slice(1),
        { x: x + width - r, y: y + height },
        ...sampleQuarterArc({ x: x + width - r, y: y + height - r }, r, Math.PI * 0.5, 0).slice(1),
        { x: x + width, y },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function sampleQuarterArc(center: Point, radius: number, startAngle: number, endAngle: number): Point[] {
  if (radius <= 0) {
    return [center];
  }

  return Array.from({ length: 7 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / 6;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
