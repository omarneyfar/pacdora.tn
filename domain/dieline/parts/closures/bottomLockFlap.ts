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

type BottomLockFlapConfig = ComponentRecipePart & {
  bodyDepth?: string | number;
  faceId?: string;
  tabDepth?: string | number;
  tongueWidth?: string | number;
};

export const bottomLockFlapPart: DielinePartGenerator<BottomLockFlapConfig> = {
  type: "bottom-lock-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`bottom-lock-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "bottom") {
      throw new Error(`bottom-lock-flap part ${config.id} must attach to a bottom edge anchor.`);
    }

    const width = anchor.length;
    const bodyDepth = ctx.numberValue(config.bodyDepth ?? width * 0.48, `${config.id}.bodyDepth`);
    const tabDepth = ctx.numberValue(config.tabDepth ?? Math.max(5, width * 0.08), `${config.id}.tabDepth`);
    const requestedTongueWidth = ctx.numberValue(config.tongueWidth ?? width * 0.5, `${config.id}.tongueWidth`);
    const warnings: string[] = [];

    assertPositiveFinite(width, `bottom-lock-flap part ${config.id} anchor width`);
    assertPositiveFinite(bodyDepth, `bottom-lock-flap part ${config.id} body depth`);
    assertPositiveFinite(tabDepth, `bottom-lock-flap part ${config.id} tab depth`);
    assertPositiveFinite(requestedTongueWidth, `bottom-lock-flap part ${config.id} tongue width`);

    const tongueWidth = clamp(requestedTongueWidth, Math.min(width, 0.001), width * 0.82);
    pushAdjustmentWarning(warnings, config.id, "tongue width", requestedTongueWidth, tongueWidth);

    if (tabDepth > 10) {
      warnings.push(`${config.id}: lock tongue depth is above typical hand-assembly range; check slot fit.`);
    }

    if (width > 220) {
      warnings.push(`${config.id}: unusually wide bottom lock flap; verify snap-lock stiffness.`);
    }

    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = anchor.start.y;
    const faceId = config.faceId ?? "bottom-lock-flap";
    const face = createBottomLockFace(faceId, x, y, width, bodyDepth, tabDepth, tongueWidth);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);
    const scoreY = anchor.start.y + bodyDepth;
    const geometry: GeometryPrimitive[] = [
      {
        id: `score-${faceId}-tongue`,
        layer: "crease",
        type: "line",
        start: { x: x + (width - tongueWidth) / 2, y: scoreY },
        end: { x: x + width - (width - tongueWidth) / 2, y: scoreY },
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
        label: "Bottom lock flap",
        role: "bottom-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createBottomLockFace(
  id: string,
  x: number,
  y: number,
  width: number,
  bodyDepth: number,
  tabDepth: number,
  tongueWidth: number,
): DielineFace {
  const inset = (width - tongueWidth) / 2;
  const totalDepth = bodyDepth + tabDepth;
  const vertices: Point[] = [
    { x, y },
    { x, y: y + bodyDepth },
    { x: x + inset, y: y + totalDepth },
    { x: x + width - inset, y: y + totalDepth },
    { x: x + width, y: y + bodyDepth },
    { x: x + width, y },
  ];

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: "Bottom lock flap",
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}
