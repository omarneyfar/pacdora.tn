import type { V2PartImplementation } from "../../contracts/types";
import {
  anchoredRectangleFace,
  anchorsForFace,
  emptyPartResult,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type StandardDustFlapParameters = {
  DFW?: number;
};

export const standardDustFlap: V2PartImplementation<StandardDustFlapParameters> = {
  id: "standardDustFlap",
  label: "Standard dust flap",
  contractId: "standardDustFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`${input.id}: dust flap must attach to top or bottom anchors.`);
    }

    const depth = positiveParameter(input, "DFW", Math.max(8, anchor.length * 0.45));
    const warnings = depth >= anchor.length / 2
      ? [`${input.id}: DFW should be less than half box width to avoid dust flap jamming.`]
      : [];
    const face = anchoredRectangleFace({
      id: `${input.id}.face`,
      label: "Standard Dust Flap",
      sourcePartId: input.id,
      anchor,
      depth,
      role: "dust",
      printable: false,
    });
    const result = emptyPartResult();

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Dust flap hinge",
      anchor,
      childFaceId: face.id,
      foldAngle: 90,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};
