import { createDielineFace } from "../../geometry";
import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, GeometryPrimitive, Point } from "../../types";
import { crease } from "../body/bodyStrip";
import {
  assertNoSelfIntersection,
  assertPositiveFinite,
  clamp,
  validateCutPolyline,
} from "../cutouts/cutoutValidation";

type NotchConfig = {
  enabled?: boolean;
  depth?: string | number;
  width?: string | number;
};

type CustomDustFlapConfig = ComponentRecipePart & {
  faceId?: string;
  height?: string | number;
  notch?: NotchConfig;
  shape?: "reference-tuck-end" | "simple";
  shoulder?: string | number;
  side?: "top" | "bottom";
  taper?: string | number;
};

export const customDustFlapPart: DielinePartGenerator<CustomDustFlapConfig> = {
  type: "custom-dust-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`custom-dust-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`custom-dust-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const side = config.side ?? (anchor.edge === "top" ? "top" : "bottom");
    if (side !== anchor.edge) {
      throw new Error(`custom-dust-flap part ${config.id} side must match attachTo anchor edge.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height, `${config.id}.height`);
    const requestedShoulder = ctx.numberValue(config.shoulder ?? Math.min(width * 0.12, height * 0.2), `${config.id}.shoulder`);
    const requestedTaper = ctx.numberValue(config.taper ?? Math.min(width * 0.08, height * 0.16), `${config.id}.taper`);

    assertPositiveFinite(width, `custom-dust-flap part ${config.id} anchor width`);
    assertPositiveFinite(height, `custom-dust-flap part ${config.id} height`);

    const shoulder = clamp(Math.max(0, requestedShoulder), 0, Math.min(width * 0.25, height * 0.35));
    const taper = clamp(Math.max(0, requestedTaper), 0, Math.min(width * 0.25, height * 0.35));
    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = side === "top" ? anchor.start.y - height : anchor.start.y;
    const faceId = config.faceId ?? `${side}-dust-${anchor.faceId}`;
    const face = createCustomDustFace(
      faceId,
      x,
      y,
      width,
      height,
      taper,
      shoulder,
      side,
      config.shape ?? "reference-tuck-end",
      `${capitalize(side)} custom dust flap`,
    );
    const structuralCrease = crease(`cr-${anchor.faceId}-${side}customdust`, anchor.faceId, faceId, anchor.start, anchor.end);
    const geometry: GeometryPrimitive[] = [];

    if (config.notch?.enabled) {
      const notchWidth = ctx.numberValue(config.notch.width ?? Math.max(1, width * 0.08), `${config.id}.notch.width`);
      const notchDepth = ctx.numberValue(config.notch.depth ?? Math.max(1, height * 0.1), `${config.id}.notch.depth`);
      assertPositiveFinite(notchWidth, `custom-dust-flap part ${config.id} notch width`);
      assertPositiveFinite(notchDepth, `custom-dust-flap part ${config.id} notch depth`);

      for (const endpoint of ["start", "end"] as const) {
        const points = createNotchPoints(anchor, endpoint, notchWidth, notchDepth, side);
        validateCutPolyline(`${config.id}-notch-${endpoint}`, points, ctx.creases);
        geometry.push({
          id: `${config.id}-notch-${endpoint}`,
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
      warnings: [`${config.id}: custom dust flap geometry is reference-pending and must be visually compared.`],
      part: {
        id: config.id,
        label: `${capitalize(side)} custom dust flap`,
        role: "dust-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createCustomDustFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  taper: number,
  shoulder: number,
  side: "top" | "bottom",
  shape: "reference-tuck-end" | "simple",
  label: string,
): DielineFace {
  const vertices = shape === "simple"
    ? createSimpleDustVertices(x, y, width, height, taper, side)
    : createReferenceDustVertices(x, y, width, height, taper, shoulder, side);

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function createReferenceDustVertices(
  x: number,
  y: number,
  width: number,
  height: number,
  taper: number,
  shoulder: number,
  side: "top" | "bottom",
): Point[] {
  if (side === "top") {
    return [
      { x, y: y + height },
      { x, y: y + shoulder },
      { x: x + taper, y },
      { x: x + width - taper, y },
      { x: x + width, y: y + shoulder },
      { x: x + width, y: y + height },
    ];
  }

  return [
    { x, y },
    { x, y: y + height - shoulder },
    { x: x + taper, y: y + height },
    { x: x + width - taper, y: y + height },
    { x: x + width, y: y + height - shoulder },
    { x: x + width, y },
  ];
}

function createSimpleDustVertices(
  x: number,
  y: number,
  width: number,
  height: number,
  taper: number,
  side: "top" | "bottom",
): Point[] {
  return side === "top"
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
}

function createNotchPoints(
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
