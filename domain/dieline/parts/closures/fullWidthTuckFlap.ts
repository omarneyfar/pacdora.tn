import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { createDielineFace } from "../../geometry";
import type { DielineFace, GeometryPrimitive } from "../../types";
import { assertFinite, assertPositiveFinite, pushAdjustmentWarning } from "../adaptiveGeometry";
import { crease } from "../body/bodyStrip";
import {
  assertNoSelfIntersection,
  clamp,
  sampleQuarterArc,
} from "../cutouts/cutoutValidation";

type FullWidthTuckFlapConfig = ComponentRecipePart & {
  cornerRadius?: string | number;
  faceId?: string;
  height?: string | number;
  scoreOffsetFromBase?: string | number;
  side?: "top" | "bottom";
};

const EPSILON = 0.000001;

export const fullWidthTuckFlapPart: DielinePartGenerator<FullWidthTuckFlapConfig> = {
  type: "full-width-tuck-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`full-width-tuck-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`full-width-tuck-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const side = config.side ?? (anchor.edge === "top" ? "top" : "bottom");
    if (side !== anchor.edge) {
      throw new Error(`full-width-tuck-flap part ${config.id} side must match attachTo anchor edge.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height ?? width * 0.55, `${config.id}.height`);
    const requestedRadius = ctx.numberValue(config.cornerRadius ?? Math.min(width, height) * 0.1, `${config.id}.cornerRadius`);
    const scoreOffsetFromBase = ctx.numberValue(
      config.scoreOffsetFromBase ?? Math.min(height * 0.28, Math.max(4, height - requestedRadius * 1.5)),
      `${config.id}.scoreOffsetFromBase`,
    );
    const warnings: string[] = [];

    assertPositiveFinite(width, `full-width-tuck-flap part ${config.id} anchor width`);
    assertPositiveFinite(height, `full-width-tuck-flap part ${config.id} height`);
    assertFinite(requestedRadius, `full-width-tuck-flap part ${config.id} corner radius`);
    assertPositiveFinite(scoreOffsetFromBase, `full-width-tuck-flap part ${config.id} score offset`);

    const radius = clamp(Math.max(0, requestedRadius), 0, Math.max(0, Math.min(width, height) * 0.35 - EPSILON));
    const scoreOffset = clamp(scoreOffsetFromBase, Math.min(height, EPSILON), Math.max(EPSILON, height - EPSILON));
    pushAdjustmentWarning(warnings, config.id, "corner radius", requestedRadius, radius);
    pushAdjustmentWarning(warnings, config.id, "score offset", scoreOffsetFromBase, scoreOffset);

    if (width > 220) {
      warnings.push(`${config.id}: unusually wide tuck flap; verify leading-edge stiffness against a reference.`);
    }

    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = side === "top" ? anchor.start.y - height : anchor.start.y;
    const faceId = config.faceId ?? `${side}-full-width-tuck`;
    const face = createFullWidthTuckFace(faceId, x, y, width, height, radius, side);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);
    const scoreY = side === "top" ? anchor.start.y - scoreOffset : anchor.start.y + scoreOffset;
    const geometry: GeometryPrimitive[] = [
      {
        id: `score-${faceId}-lip`,
        layer: "crease",
        type: "line",
        start: { x, y: scoreY },
        end: { x: x + width, y: scoreY },
      },
    ];

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      geometry,
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings,
      part: {
        id: config.id,
        label: `${capitalize(side)} full-width tuck flap`,
        role: "tuck-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createFullWidthTuckFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  side: "top" | "bottom",
): DielineFace {
  const vertices = side === "top"
    ? [
        { x, y: y + height },
        { x, y: y + radius },
        ...sampleQuarterArc({ x: x + radius, y: y + radius }, radius, Math.PI, Math.PI * 1.5).slice(1),
        { x: x + width - radius, y },
        ...sampleQuarterArc({ x: x + width - radius, y: y + radius }, radius, Math.PI * 1.5, Math.PI * 2).slice(1),
        { x: x + width, y: y + height },
      ]
    : [
        { x, y },
        { x, y: y + height - radius },
        ...sampleQuarterArc({ x: x + radius, y: y + height - radius }, radius, Math.PI, Math.PI * 0.5).slice(1),
        { x: x + width - radius, y: y + height },
        ...sampleQuarterArc({ x: x + width - radius, y: y + height - radius }, radius, Math.PI * 0.5, 0).slice(1),
        { x: x + width, y },
      ];

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: `${capitalize(side)} full-width tuck flap`,
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
