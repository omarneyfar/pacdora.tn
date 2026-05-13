import { createFaceEdgeAnchor } from "../../componentEngine/anchorResolver";
import type {
  Anchor,
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { DielineFace, GeometryPrimitive, Point } from "../../types";
import {
  assertPositiveFinite,
  sampleQuarterArc,
  validateCutPolyline,
} from "./cutoutValidation";

type ReliefNotchConfig = ComponentRecipePart & {
  allowCreaseOverlap?: boolean;
  depth?: string | number;
  position?: "start" | "end" | "both";
  shape?: "straight" | "angled" | "rounded";
  side?: "inside" | "outside" | "top" | "right" | "bottom" | "left";
  width?: string | number;
};

export const reliefNotchPart: DielinePartGenerator<ReliefNotchConfig> = {
  type: "relief-notch",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`relief-notch part ${config.id} must declare attachTo.`);
    }

    const anchor = resolveAnchor(ctx.faces, ctx.anchors, config);
    const width = ctx.numberValue(config.width, `${config.id}.width`);
    const depth = ctx.numberValue(config.depth, `${config.id}.depth`);
    const position = config.position ?? "both";
    const shape = config.shape ?? "angled";
    const primitives: GeometryPrimitive[] = [];

    assertPositiveFinite(width, `relief-notch part ${config.id} width`);
    assertPositiveFinite(depth, `relief-notch part ${config.id} depth`);

    const endpoints = position === "both" ? ["start", "end"] as const : [position];
    for (const endpoint of endpoints) {
      const points = createNotchPoints(anchor, endpoint, width, depth, shape, config.side ?? "inside");
      validateCutPolyline(`${config.id}-${endpoint}`, points, ctx.creases, Boolean(config.allowCreaseOverlap));
      primitives.push({
        id: `${config.id}-${endpoint}`,
        layer: "cut",
        type: "polyline",
        points,
      });
    }

    return {
      geometry: primitives,
      part: {
        id: config.id,
        label: "Relief notch",
        role: "lock",
        faceIds: [anchor.faceId],
      },
    };
  },
};

function resolveAnchor(
  faces: DielineFace[],
  anchors: Map<string, Anchor>,
  config: ReliefNotchConfig,
): Anchor {
  const anchor = anchors.get(config.attachTo ?? "");
  if (anchor) return anchor;

  const face = faces.find((candidate) => candidate.id === config.attachTo);
  if (!face) {
    throw new Error(`relief-notch attachTo must resolve to a face or anchor: ${config.attachTo}`);
  }

  const edge = toFaceEdge(config.side);
  if (!edge) {
    throw new Error(`relief-notch part ${config.id} must use side top/right/bottom/left when attaching to a face.`);
  }

  return createFaceEdgeAnchor(config.id, face, edge, `${face.id}.${edge}`);
}

function createNotchPoints(
  anchor: Anchor,
  endpoint: "start" | "end",
  width: number,
  depth: number,
  shape: "straight" | "angled" | "rounded",
  side: NonNullable<ReliefNotchConfig["side"]>,
): Point[] {
  const base = endpoint === "start" ? anchor.start : anchor.end;
  const alongSign = endpoint === "start" ? 1 : -1;
  const tangent = { x: anchor.tangent.x * alongSign, y: anchor.tangent.y * alongSign };
  const normal = normalForSide(anchor, side);

  if (shape === "straight") {
    return [base, offset(base, normal, depth)];
  }

  if (shape === "rounded") {
    const along = offset(base, tangent, width);
    const out = offset(base, normal, depth);
    const center = offset(out, tangent, width);
    return [
      base,
      along,
      ...sampleQuarterArc(center, Math.min(width, depth), Math.PI, Math.PI * 1.5, 4).slice(1, -1),
      out,
    ];
  }

  return [
    base,
    offset(offset(base, tangent, width), normal, depth),
  ];
}

function normalForSide(anchor: Anchor, side: NonNullable<ReliefNotchConfig["side"]>): Point {
  if (side === "outside") return anchor.normal;
  if (side === "inside") return { x: -anchor.normal.x, y: -anchor.normal.y };
  return { x: -anchor.normal.x, y: -anchor.normal.y };
}

function toFaceEdge(side?: ReliefNotchConfig["side"]): "top" | "right" | "bottom" | "left" | null {
  return side === "top" || side === "right" || side === "bottom" || side === "left" ? side : null;
}

function offset(point: Point, vector: Point, amount: number): Point {
  return {
    x: point.x + vector.x * amount,
    y: point.y + vector.y * amount,
  };
}
