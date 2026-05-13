import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, GeometryPrimitive, Point } from "../../types";
import { assertFinite } from "../adaptiveGeometry";
import { crease } from "../body/bodyStrip";
import {
  assertNoSelfIntersection,
  assertPositiveFinite,
  clamp,
  sampleQuarterArc,
  validateCutPolyline,
  validateRectCutoutPlacement,
} from "../cutouts/cutoutValidation";

type SlotConfig = {
  enabled?: boolean;
  centeredOnAnchor?: boolean;
  height?: string | number;
  id?: string;
  offsetFromBase?: string | number;
  radius?: string | number;
  width?: string | number;
};

type ReliefConfig = {
  enabled?: boolean;
  depth?: string | number;
  positions?: "start" | "end" | "both";
  width?: string | number;
};

type SlottedTuckFlapConfig = ComponentRecipePart & {
  cornerRadius?: string | number;
  faceId?: string;
  height?: string | number;
  lipHeight?: string | number;
  margin?: string | number;
  relief?: ReliefConfig;
  scoreOffsetFromBase?: string | number;
  side?: "top" | "bottom";
  slot?: SlotConfig;
};

export const slottedTuckFlapPart: DielinePartGenerator<SlottedTuckFlapConfig> = {
  type: "slotted-tuck-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`slotted-tuck-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`slotted-tuck-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const side = config.side ?? (anchor.edge === "top" ? "top" : "bottom");
    if (side !== anchor.edge) {
      throw new Error(`slotted-tuck-flap part ${config.id} side must match attachTo anchor edge.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const lipHeight = ctx.numberValue(config.lipHeight ?? height * 0.18, `${config.id}.lipHeight`);
    const requestedCornerRadius = ctx.numberValue(config.cornerRadius ?? Math.min(width, height) * 0.08, `${config.id}.cornerRadius`);
    const margin = ctx.numberValue(config.margin ?? Math.max(1.5, Math.min(width, height) * 0.035), `${config.id}.margin`);

    assertPositiveFinite(width, `slotted-tuck-flap part ${config.id} anchor width`);
    assertPositiveFinite(height, `slotted-tuck-flap part ${config.id} height`);
    assertFinite(lipHeight, `slotted-tuck-flap part ${config.id} lip height`);
    assertFinite(requestedCornerRadius, `slotted-tuck-flap part ${config.id} corner radius`);
    assertPositiveFinite(margin, `slotted-tuck-flap part ${config.id} margin`);

    const cornerRadius = clamp(Math.max(0, requestedCornerRadius), 0, Math.max(0, Math.min(width, height) * 0.49));
    const baseY = anchor.start.y;
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = side === "top" ? baseY - height : baseY;
    const faceId = config.faceId ?? `${side}-tuck`;
    const face = createSlottedTuckFace(faceId, x, y, width, height, cornerRadius, side, `${capitalize(side)} slotted tuck flap`);
    const structuralCrease = crease(`cr-${anchor.faceId}-${side}slottedtuck`, anchor.faceId, faceId, anchor.start, anchor.end);
    const geometry: GeometryPrimitive[] = [];

    const scoreOffsetFromBase = ctx.numberValue(
      config.scoreOffsetFromBase ?? Math.max(margin, height - Math.max(0, lipHeight)),
      `${config.id}.scoreOffsetFromBase`,
    );
    const scoreOffset = clamp(scoreOffsetFromBase, margin, height - margin);
    const scoreY = side === "top" ? baseY - scoreOffset : baseY + scoreOffset;
    geometry.push({
      id: `score-${faceId}-lip`,
      layer: "crease",
      type: "line",
      start: { x, y: scoreY },
      end: { x: x + width, y: scoreY },
    });

    if (config.slot?.enabled !== false) {
      const slotWidth = ctx.numberValue(config.slot?.width ?? width * 0.68, `${config.id}.slot.width`);
      const slotHeight = ctx.numberValue(config.slot?.height ?? Math.max(2, height * 0.045), `${config.id}.slot.height`);
      const slotOffset = ctx.numberValue(config.slot?.offsetFromBase ?? height * 0.28, `${config.id}.slot.offsetFromBase`);
      const requestedSlotRadius = ctx.numberValue(config.slot?.radius ?? slotHeight / 2, `${config.id}.slot.radius`);

      assertPositiveFinite(slotWidth, `slotted-tuck-flap part ${config.id} slot width`);
      assertPositiveFinite(slotHeight, `slotted-tuck-flap part ${config.id} slot height`);
      assertPositiveFinite(slotOffset, `slotted-tuck-flap part ${config.id} slot offset`);
      assertFinite(requestedSlotRadius, `slotted-tuck-flap part ${config.id} slot radius`);

      const slot = createSlotPrimitive(
        config.slot?.id ?? `${faceId}-slot`,
        x + width / 2 - slotWidth / 2,
        side === "top" ? baseY - slotOffset - slotHeight / 2 : baseY + slotOffset - slotHeight / 2,
        slotWidth,
        slotHeight,
        requestedSlotRadius,
      );
      validateRectCutoutPlacement(slot.id, slot, face, [...ctx.creases, structuralCrease], ctx.faces, margin);
      geometry.push(slot);
    }

    if (config.relief?.enabled) {
      const reliefWidth = ctx.numberValue(config.relief.width ?? Math.min(width * 0.08, height * 0.15), `${config.id}.relief.width`);
      const reliefDepth = ctx.numberValue(config.relief.depth ?? Math.min(height * 0.08, width * 0.05), `${config.id}.relief.depth`);
      const positions = config.relief.positions ?? "both";
      assertPositiveFinite(reliefWidth, `slotted-tuck-flap part ${config.id} relief width`);
      assertPositiveFinite(reliefDepth, `slotted-tuck-flap part ${config.id} relief depth`);

      for (const endpoint of positions === "both" ? ["start", "end"] as const : [positions]) {
        const points = createReliefPoints(anchor, endpoint, reliefWidth, reliefDepth, side);
        validateCutPolyline(`${config.id}-relief-${endpoint}`, points, ctx.creases);
        geometry.push({
          id: `${config.id}-relief-${endpoint}`,
          layer: "cut",
          type: "polyline",
          points,
        });
      }
    }

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      geometry,
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings: [`${config.id}: slotted tuck flap geometry is reference-pending and must be visually compared.`],
      part: {
        id: config.id,
        label: `${capitalize(side)} slotted tuck flap`,
        role: "tuck-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createSlottedTuckFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  cornerRadius: number,
  side: "top" | "bottom",
  label: string,
): DielineFace {
  const r = cornerRadius;
  const vertices = side === "top"
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

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function createSlotPrimitive(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  requestedRadius: number,
): GeometryPrimitive & { type: "slot"; x: number; y: number; width: number; height: number; radius: number } {
  return {
    id,
    layer: "hole",
    type: "slot",
    x,
    y,
    width,
    height,
    radius: clamp(Math.max(0, requestedRadius), 0, Math.min(width, height) / 2),
  };
}

function createReliefPoints(
  anchor: { start: Point; end: Point; tangent: Point },
  endpoint: "start" | "end",
  width: number,
  depth: number,
  side: "top" | "bottom",
): Point[] {
  const base = endpoint === "start" ? anchor.start : anchor.end;
  const alongSign = endpoint === "start" ? 1 : -1;
  const tangent = { x: anchor.tangent.x * alongSign, y: anchor.tangent.y * alongSign };
  const normal = side === "top" ? { x: 0, y: -1 } : { x: 0, y: 1 };

  return [
    base,
    {
      x: base.x + tangent.x * width + normal.x * depth,
      y: base.y + tangent.y * width + normal.y * depth,
    },
  ];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
