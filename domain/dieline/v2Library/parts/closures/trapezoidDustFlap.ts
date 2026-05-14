import type { V2PartImplementation } from "../../contracts/types";
import {
  anchoredTrapezoidFace,
  anchorsForFace,
  emptyPartResult,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type TrapezoidDustFlapParameters = {
  DFW?: number;
  taper?: number;
};

export const trapezoidDustFlap: V2PartImplementation<TrapezoidDustFlapParameters> = {
  id: "trapezoidDustFlap",
  label: "Trapezoid dust flap",
  contractId: "trapezoidDustFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`${input.id}: trapezoid dust flap must attach to top or bottom anchors.`);
    }

    const depth = positiveParameter(input, "DFW", Math.max(8, anchor.length * 0.42));
    const taper = Math.max(0, Math.min(numberParameter(input, "taper", anchor.length * 0.12), anchor.length * 0.42));
    const warnings = taper > anchor.length * 0.25 ? [`${input.id}: taper is large and may reduce dust sealing.`] : [];
    const face = anchoredTrapezoidFace({
      id: `${input.id}.face`,
      label: "Trapezoid Dust Flap",
      sourcePartId: input.id,
      anchor,
      depth,
      startInset: taper,
      endInset: taper,
      role: "dust",
      printable: false,
    });
    const result = emptyPartResult();

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Trapezoid dust flap hinge",
      anchor,
      childFaceId: face.id,
      foldAngle: 90,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};
