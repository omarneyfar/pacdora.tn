import type { V2PartImplementation } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { emptyPartResult, linePrimitive, numberParameter } from "../buildingBlocks";

type ScoreGuideParameters = {
  offset?: number;
  length?: number;
};

export const scoreGuide: V2PartImplementation<ScoreGuideParameters> = {
  id: "scoreGuide",
  label: "Score guide",
  contractId: "scoreGuide",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    const inset = numberParameter(input, "offset", 0);
    const length = Math.min(Math.max(0, numberParameter(input, "length", anchor.length)), anchor.length);
    const start = offset(offset(anchor.start, anchor.normal, inset), anchor.tangent, (anchor.length - length) / 2);
    const end = offset(start, anchor.tangent, length);

    return {
      ...emptyPartResult(),
      geometryPrimitives: [linePrimitive({
        id: `${input.id}.score`,
        label: "Geometry-only score guide",
        layer: "score",
        start,
        end,
        ownerFaceId: anchor.faceId,
      })],
    };
  },
};
