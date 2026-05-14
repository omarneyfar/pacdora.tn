import type { V2PartImplementation } from "../../contracts/types";
import {
  anchoredRectangleFace,
  anchorsForFace,
  emptyPartResult,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type HangPanelParameters = {
  HL?: number;
};

export const hangPanel: V2PartImplementation<HangPanelParameters> = {
  id: "hangPanel",
  label: "Hang panel",
  contractId: "hangPanel",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top") {
      throw new Error(`${input.id}: hang panel must attach to a top anchor.`);
    }

    const height = positiveParameter(input, "HL", Math.max(24, anchor.length * 0.22));
    const face = anchoredRectangleFace({
      id: `${input.id}.face`,
      label: "Hang Panel Extension",
      sourcePartId: input.id,
      anchor,
      depth: height,
      role: "display",
      printable: true,
    });
    const result = emptyPartResult();

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Hang panel hinge",
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 180,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));
    result.warnings.push(`${input.id}: hang panel needs template-level reinforcement or double-layer validation.`);

    return result;
  },
};
