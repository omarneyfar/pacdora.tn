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

type TrapezoidTopDustFlapConfig = ComponentRecipePart & {
  faceId?: string;
  height?: string | number;
  taper?: string | number;
};

export const trapezoidTopDustFlapPart: DielinePartGenerator<TrapezoidTopDustFlapConfig> = {
  type: "trapezoid-top-dust-flap",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`trapezoid-top-dust-flap part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    if (anchor.edge !== "top") {
      throw new Error(`trapezoid-top-dust-flap part ${config.id} must attach to a top edge anchor.`);
    }

    const width = anchor.length;
    const height = ctx.numberValue(config.height ?? width * 0.42, `${config.id}.height`);
    const requestedTaper = ctx.numberValue(config.taper ?? Math.min(width * 0.16, height * 0.28), `${config.id}.taper`);
    const warnings: string[] = [];

    assertPositiveFinite(width, `trapezoid-top-dust-flap part ${config.id} anchor width`);
    assertPositiveFinite(height, `trapezoid-top-dust-flap part ${config.id} height`);
    assertPositiveFinite(requestedTaper, `trapezoid-top-dust-flap part ${config.id} taper`);

    const taper = clamp(requestedTaper, 0, Math.max(0, width * 0.45));
    pushAdjustmentWarning(warnings, config.id, "taper", requestedTaper, taper);

    if (height > width * 0.65) {
      warnings.push(`${config.id}: top dust flap is deep relative to its side edge; check closure clearance.`);
    }

    if (width > 220) {
      warnings.push(`${config.id}: unusually wide top dust flap; verify side-gap fit.`);
    }

    const x = Math.min(anchor.start.x, anchor.end.x);
    const y = anchor.start.y - height;
    const faceId = config.faceId ?? `top-trapezoid-dust-${anchor.faceId}`;
    const face = createTrapezoidTopDustFace(faceId, x, y, width, height, taper);
    const structuralCrease = crease(`cr-${anchor.faceId}-${faceId}`, anchor.faceId, faceId, anchor.start, anchor.end);

    return {
      faces: [face],
      structuralCreases: [structuralCrease],
      anchors: createFaceEdgeAnchors(config.id, face),
      faceTreeHints: [{ parentFaceId: anchor.faceId, childFaceId: faceId, creaseId: structuralCrease.id }],
      warnings,
      part: {
        id: config.id,
        label: "Top trapezoid dust flap",
        role: "dust-flap",
        faceIds: [faceId],
        creaseIds: [structuralCrease.id],
      },
    };
  },
};

function createTrapezoidTopDustFace(id: string, x: number, y: number, width: number, height: number, taper: number): DielineFace {
  const vertices = [
    { x, y: y + height },
    { x: x + taper, y },
    { x: x + width - taper, y },
    { x: x + width, y: y + height },
  ];

  assertNoSelfIntersection(id, vertices);
  return createDielineFace({
    id,
    label: "Top trapezoid dust flap",
    vertices,
    role: "flap",
    artworkEnabled: false,
  });
}
