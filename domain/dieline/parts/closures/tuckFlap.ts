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
    const taper = ctx.numberValue(config.taper ?? 0, `${config.id}.taper`);
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
      taper,
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
  taper: number,
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const innerY = direction === "top" ? y + lipHeight : y + height - lipHeight;
  const topY = direction === "top" ? y : y + height;
  const lidY = direction === "top" ? y + height : y;
  const r = Math.min(5, taper, lipHeight * 0.5);
  const slit = Math.min(3, taper * 0.5);
  const leftSlitX = x + slit;
  const rightSlitX = x + width - slit;
  const leftArcCenterX = x + taper + r;
  const rightArcCenterX = x + width - taper - r;
  const arcCenterY = direction === "top" ? topY + r : topY - r;

  const vertices = direction === "top"
    ? [
        { x, y: lidY },
        { x, y: innerY },
        { x: leftSlitX, y: innerY },
        { x: leftSlitX, y: innerY - slit * 0.5 },
        ...sampleQuarterArc({ x: leftArcCenterX, y: arcCenterY }, r, Math.PI, Math.PI * 1.5),
        { x: rightArcCenterX, y: topY },
        ...sampleQuarterArc({ x: rightArcCenterX, y: arcCenterY }, r, Math.PI * 1.5, Math.PI * 2).slice(1),
        { x: rightSlitX, y: innerY - slit * 0.5 },
        { x: rightSlitX, y: innerY },
        { x: x + width, y: innerY },
        { x: x + width, y: lidY },
      ]
    : [
        { x, y: lidY },
        { x, y: innerY },
        { x: leftSlitX, y: innerY },
        { x: leftSlitX, y: innerY + slit * 0.5 },
        ...sampleQuarterArc({ x: leftArcCenterX, y: arcCenterY }, r, Math.PI, Math.PI * 0.5),
        { x: rightArcCenterX, y: topY },
        ...sampleQuarterArc({ x: rightArcCenterX, y: arcCenterY }, r, Math.PI * 0.5, 0).slice(1),
        { x: rightSlitX, y: innerY + slit * 0.5 },
        { x: rightSlitX, y: innerY },
        { x: x + width, y: innerY },
        { x: x + width, y: lidY },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function sampleQuarterArc(center: Point, radius: number, startAngle: number, endAngle: number): Point[] {
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
