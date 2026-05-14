import type { V2PartImplementation } from "../../contracts/types";
import {
  anchoredTrapezoidFace,
  anchorsForFace,
  emptyPartResult,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type StandardDustFlapParameters = {
  DFW?: number;
  taper?: number;
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
    const defaultTaper = Math.min(anchor.length * 0.08, depth * 0.3);
    const taper = clamp(numberParameter(input, "taper", defaultTaper), 0, Math.max(0, anchor.length / 2 - 1));
    const warnings: string[] = [];
    if (depth >= anchor.length / 2) {
      warnings.push(`${input.id}: DFW should be less than half box width to avoid dust flap jamming.`);
    }
    if (taper > anchor.length * 0.18) {
      warnings.push(`${input.id}: dust flap taper is large and may reduce side sealing area.`);
    }

    const face = anchoredTrapezoidFace({
      id: `${input.id}.face`,
      label: "Standard Dust Flap",
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
      label: "Dust flap hinge",
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 90,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
