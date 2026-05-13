import { createAnchor } from "../../componentEngine/anchorResolver";
import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import { assertFinite, assertPositiveFinite, pushAdjustmentWarning } from "../adaptiveGeometry";
import { clamp } from "../cutouts/cutoutValidation";

type PartialEdgeAnchorConfig = ComponentRecipePart & {
  anchorId?: string;
  centered?: boolean;
  length?: string | number;
  margin?: string | number;
  offsetAlong?: string | number;
};

export const partialEdgeAnchorPart: DielinePartGenerator<PartialEdgeAnchorConfig> = {
  type: "partial-edge-anchor",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`partial-edge-anchor part ${config.id} must declare attachTo.`);
    }

    const parent = ctx.getAnchor(config.attachTo);
    const requestedMargin = ctx.numberValue(config.margin ?? 0, `${config.id}.margin`);
    const requestedLength = ctx.numberValue(config.length ?? parent.length, `${config.id}.length`);
    const warnings: string[] = [];

    assertFinite(requestedMargin, `partial-edge-anchor part ${config.id} margin`);
    assertPositiveFinite(requestedLength, `partial-edge-anchor part ${config.id} length`);

    const margin = clamp(Math.max(0, requestedMargin), 0, parent.length * 0.45);
    const maxLength = Math.max(0, parent.length - margin * 2);
    const length = clamp(requestedLength, Math.min(parent.length, 0.001), maxLength);
    pushAdjustmentWarning(warnings, config.id, "length", requestedLength, length);

    const requestedOffset = config.centered === false
      ? ctx.numberValue(config.offsetAlong ?? margin, `${config.id}.offsetAlong`)
      : (parent.length - length) / 2;
    assertFinite(requestedOffset, `partial-edge-anchor part ${config.id} offsetAlong`);

    const offset = clamp(requestedOffset, margin, parent.length - margin - length);
    pushAdjustmentWarning(warnings, config.id, "offset", requestedOffset, offset);

    const start = {
      x: parent.start.x + parent.tangent.x * offset,
      y: parent.start.y + parent.tangent.y * offset,
    };
    const end = {
      x: start.x + parent.tangent.x * length,
      y: start.y + parent.tangent.y * length,
    };

    return {
      anchors: [
        createAnchor(
          config.id,
          parent.faceId,
          parent.edge,
          config.anchorId ?? config.id,
          start,
          end,
          parent.normal,
        ),
      ],
      warnings,
      part: {
        id: config.id,
        label: "Partial edge anchor",
        role: "unknown",
        faceIds: [parent.faceId],
      },
    };
  },
};
