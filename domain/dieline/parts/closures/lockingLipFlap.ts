import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { createDielineFace } from "../../geometry";
import type { DielineFace, GeometryPrimitive, Point } from "../../types";
import { assertPositiveFinite, pushAdjustmentWarning } from "../adaptiveGeometry";
import { crease } from "../body/bodyStrip";
import { assertNoSelfIntersection, clamp } from "../cutouts/cutoutValidation";

type LockingLipFlapConfig = ComponentRecipePart & {
  bodyDepth?: string | number;
  faceId?: string;
  side?: "top" | "bottom";
  tabDepth?: string | number;
  tabWidth?: string | number;
};

export const lockingLipFlapPart: DielinePartGenerator<LockingLipFlapConfig> = {
  type: "locking-lip-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`locking-lip-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`locking-lip-flap part ${config.id} must attach to a top or bottom edge anchor.`);
    }

    const side = config.side ?? (anchor.edge === "top" ? "top" : "bottom");
    if (side !== anchor.edge) {
      throw new Error(`locking-lip-flap part ${config.id} side must match attachTo anchor edge.`);
    }

    const width = anchor.length;
    const bodyDepth = ctx.numberValue(config.bodyDepth ?? width * 0.42, `${config.id}.bodyDepth`);
    const tabDepth = ctx.numberValue(config.tabDepth ?? Math.max(5, width * 0.08), `${config.id}.tabDepth`);
    const requestedTabWidth = ctx.numberValue(config.tabWidth ?? width * 0.45, `${config.id}.tabWidth`);
    const warnings: string[] = [];

    assertPositiveFinite(width, `locking-lip-flap part ${config.id} anchor width`);
    assertPositiveFinite(bodyDepth, `locking-lip-flap part ${config.id} body depth`);
    assertPositiveFinite(tabDepth, `locking-lip-flap part ${config.id} tab depth`);
    assertPositiveFinite(requestedTabWidth, `locking-lip-flap part ${config.id} tab width`);

    const tabWidth = clamp(requestedTabWidth, Math.min(width, 0.001), width * 0.86);
    pushAdjustmentWarning(warnings, config.id, "tab width", requestedTabWidth, tabWidth);

    if (tabDepth > bodyDepth * 0.45) {
      warnings.push(`${config.id}: locking tab depth is high relative to flap body; insertion force needs review.`);
    }

    if (width > 220) {
      warnings.push(`${config.id}: unusually wide locking lip; slot clearance must be checked on reference geometry.`);
    }

    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = side === "top" ? anchor.start.y - bodyDepth - tabDepth : anchor.start.y;
    const faceId = config.faceId ?? `${side}-locking-lip`;
    const face = createLockingLipFace(faceId, x, y, width, bodyDepth, tabDepth, tabWidth, side);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);
    const scoreY = side === "top" ? anchor.start.y - bodyDepth : anchor.start.y + bodyDepth;
    const geometry: GeometryPrimitive[] = [
      {
        id: `score-${faceId}-tab-shoulder`,
        layer: "crease",
        type: "line",
        start: { x: x + (width - tabWidth) / 2, y: scoreY },
        end: { x: x + width - (width - tabWidth) / 2, y: scoreY },
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
        label: `${capitalize(side)} locking lip flap`,
        role: "lock",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createLockingLipFace(
  id: string,
  x: number,
  y: number,
  width: number,
  bodyDepth: number,
  tabDepth: number,
  tabWidth: number,
  side: "top" | "bottom",
): DielineFace {
  const inset = (width - tabWidth) / 2;
  const totalDepth = bodyDepth + tabDepth;
  const vertices: Point[] = side === "top"
    ? [
        { x, y: y + totalDepth },
        { x, y: y + tabDepth },
        { x: x + inset, y: y + tabDepth },
        { x: x + inset, y },
        { x: x + width - inset, y },
        { x: x + width - inset, y: y + tabDepth },
        { x: x + width, y: y + tabDepth },
        { x: x + width, y: y + totalDepth },
      ]
    : [
        { x, y },
        { x, y: y + bodyDepth },
        { x: x + inset, y: y + bodyDepth },
        { x: x + inset, y: y + totalDepth },
        { x: x + width - inset, y: y + totalDepth },
        { x: x + width - inset, y: y + bodyDepth },
        { x: x + width, y: y + bodyDepth },
        { x: x + width, y },
      ];

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: `${capitalize(side)} locking lip flap`,
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
