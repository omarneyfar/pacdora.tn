import { createFaceEdgeAnchors } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { createDielineFace } from "../../geometry";
import type { DielineFace } from "../../types";
import { assertPositiveFinite, pushAdjustmentWarning } from "../adaptiveGeometry";
import { crease } from "../body/bodyStrip";
import { assertNoSelfIntersection, clamp } from "../cutouts/cutoutValidation";

type AngledBottomDustFlapConfig = ComponentRecipePart & {
  endInset?: string | number;
  faceId?: string;
  height?: string | number;
  startInset?: string | number;
};

export const angledBottomDustFlapPart: DielinePartGenerator<AngledBottomDustFlapConfig> = {
  type: "angled-bottom-dust-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`angled-bottom-dust-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "bottom") {
      throw new Error(`angled-bottom-dust-flap part ${config.id} must attach to a bottom edge anchor.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height ?? width * 0.42, `${config.id}.height`);
    const requestedStartInset = ctx.numberValue(config.startInset ?? Math.min(width * 0.08, height * 0.24), `${config.id}.startInset`);
    const requestedEndInset = ctx.numberValue(config.endInset ?? Math.min(width * 0.18, height * 0.34), `${config.id}.endInset`);
    const warnings: string[] = [];

    assertPositiveFinite(width, `angled-bottom-dust-flap part ${config.id} anchor width`);
    assertPositiveFinite(height, `angled-bottom-dust-flap part ${config.id} height`);
    assertPositiveFinite(requestedStartInset, `angled-bottom-dust-flap part ${config.id} start inset`);
    assertPositiveFinite(requestedEndInset, `angled-bottom-dust-flap part ${config.id} end inset`);

    const startInset = clamp(requestedStartInset, 0, Math.max(0, width * 0.42));
    const endInset = clamp(requestedEndInset, 0, Math.max(0, width * 0.42));
    pushAdjustmentWarning(warnings, config.id, "start inset", requestedStartInset, startInset);
    pushAdjustmentWarning(warnings, config.id, "end inset", requestedEndInset, endInset);

    if (height > width * 0.65) {
      warnings.push(`${config.id}: bottom dust flap is deep relative to its side edge; check bottom-lock clearance.`);
    }

    if (width > 220) {
      warnings.push(`${config.id}: unusually wide bottom dust flap; verify side-gap fit.`);
    }

    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = anchor.start.y;
    const faceId = config.faceId ?? `bottom-angled-dust-${anchor.faceId}`;
    const face = createAngledBottomDustFace(faceId, x, y, width, height, startInset, endInset);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings,
      part: {
        id: config.id,
        label: "Bottom angled dust flap",
        role: "dust-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createAngledBottomDustFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  startInset: number,
  endInset: number,
): DielineFace {
  const vertices = [
    { x, y },
    { x: x + startInset, y: y + height },
    { x: x + width - endInset, y: y + height },
    { x: x + width, y },
  ];

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: "Bottom angled dust flap",
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}
