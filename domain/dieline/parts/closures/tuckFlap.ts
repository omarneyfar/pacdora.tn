import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, GeometryPrimitive, Point } from "../../types";
import { assertPositiveFinite, clampRadius, clampScoreOffset, pushAdjustmentWarning } from "../adaptiveGeometry";
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

    const position = anchor.edge === "top" ? "top" : "bottom";
    const x = Math.min(anchor.start.x, anchor.end.x);
    const width = anchor.length;
    const requestedHeight = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedLipHeight = ctx.numberValue(config.lipHeight, `${config.id}.lipHeight`);
    const requestedCornerRadius = ctx.numberValue(config.taper ?? 0, `${config.id}.taper`);
    const requestedScoreOffset = ctx.numberValue(config.scoreOffset, `${config.id}.scoreOffset`);
    const warnings: string[] = [];

    assertPositiveFinite(width, `tuck-flap part ${config.id} anchor width`);
    assertPositiveFinite(requestedHeight, `tuck-flap part ${config.id} height`);

    const height = requestedHeight;
    const lipHeight = Math.min(height, Math.max(0, requestedLipHeight));
    const cornerRadius = clampRadius(requestedCornerRadius, width, height);
    const scoreOffset = clampScoreOffset(requestedScoreOffset, height, cornerRadius, position);

    pushAdjustmentWarning(warnings, config.id, "lip height", requestedLipHeight, lipHeight);
    pushAdjustmentWarning(warnings, config.id, "corner radius", requestedCornerRadius, cornerRadius);
    pushAdjustmentWarning(warnings, config.id, "score offset", requestedScoreOffset, scoreOffset);

    const y = position === "top" ? anchor.start.y - height : anchor.start.y;
    const faceId = config.faceId ?? `${position}-tuck`;
    const face = createTuckFlapFace(
      faceId,
      x,
      y,
      width,
      height,
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
      warnings,
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
  cornerRadius: number,
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const r = cornerRadius;
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
