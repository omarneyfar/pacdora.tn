import { createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2PartImplementation, V2StructuralCrease } from "../../contracts/types";
import { rectangleFace } from "../../primitives/polygon";
import { emptyPartResult, positiveParameter } from "../buildingBlocks";

type SleeveBodyParameters = {
  L?: number;
  W?: number;
  H?: number;
};

export const sleeveBody: V2PartImplementation<SleeveBodyParameters> = {
  id: "sleeveBody",
  label: "Sleeve body",
  contractId: "sleeveBody",
  build(input) {
    const length = positiveParameter(input, "L");
    const width = positiveParameter(input, "W", length * 0.35);
    const height = positiveParameter(input, "H");
    const result = emptyPartResult();
    const warnings: string[] = [];

    if (length <= width) {
      warnings.push(`${input.id}: sleeve/skillet documentation expects a landscape body with L > W.`);
    }

    const back = rectangleFace({
      id: `${input.id}.back`,
      label: "Sleeve Back Panel",
      role: "body",
      x: 0,
      y: 0,
      width: length,
      height,
      sourcePartId: input.id,
    });
    const front = rectangleFace({
      id: `${input.id}.front`,
      label: "Sleeve Front Panel",
      role: "body",
      x: length,
      y: 0,
      width: length,
      height,
      sourcePartId: input.id,
    });

    result.faces.push(back, front);
    result.anchors.push(...createFaceEdgeAnchors(input.id, back), ...createFaceEdgeAnchors(input.id, front));
    result.structuralCreases.push(sleeveCrease(input.id, back.id, front.id, length, height));

    return { ...result, warnings };
  },
};

function sleeveCrease(partId: string, faceA: string, faceB: string, x: number, height: number): V2StructuralCrease {
  return {
    id: `${partId}.crease.back.front`,
    label: "Sleeve front/back hinge",
    faceA,
    faceB,
    start: { x, y: 0 },
    end: { x, y: height },
    foldAngle: 180,
    foldDirection: "inward",
  };
}
