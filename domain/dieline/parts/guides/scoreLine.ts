import type {
  ComponentRecipePart,
  DielinePartGenerator,
} from "../../componentEngine/types";
import type { GeometryPrimitive } from "../../types";

type ScoreLineConfig = ComponentRecipePart & {
  offset?: string | number;
  id?: string;
};

export const scoreLinePart: DielinePartGenerator<ScoreLineConfig> = {
  type: "score-line",
  build(ctx, config) {
    if (!config.attachTo) {
      throw new Error(`score-line part ${config.id} must declare attachTo.`);
    }

    const anchor = ctx.getAnchor(config.attachTo);
    const offset = ctx.numberValue(config.offset ?? 0, `${config.id}.offset`);
    const primitive: GeometryPrimitive = {
      id: `score-${config.id}`,
      layer: "crease",
      type: "line",
      start: {
        x: anchor.start.x + anchor.normal.x * offset,
        y: anchor.start.y + anchor.normal.y * offset,
      },
      end: {
        x: anchor.end.x + anchor.normal.x * offset,
        y: anchor.end.y + anchor.normal.y * offset,
      },
    };

    return {
      geometry: [primitive],
      part: {
        id: config.id,
        label: "Score line",
        role: "unknown",
        faceIds: [anchor.faceId],
      },
    };
  },
};
