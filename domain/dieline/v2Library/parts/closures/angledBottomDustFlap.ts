import type { V2PartImplementation } from "../../contracts/types";
import {
  anchoredTrapezoidFace,
  anchorsForFace,
  emptyPartResult,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type AngledBottomDustFlapParameters = {
  DFW?: number;
  startInset?: number;
  endInset?: number;
};

export const angledBottomDustFlap: V2PartImplementation<AngledBottomDustFlapParameters> = {
  id: "angledBottomDustFlap",
  label: "Angled bottom dust flap",
  contractId: "angledBottomDustFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "bottom") {
      throw new Error(`${input.id}: angled bottom dust flap must attach to a bottom anchor.`);
    }

    const depth = positiveParameter(input, "DFW", Math.max(8, anchor.length * 0.42));
    const startInset = Math.max(0, Math.min(numberParameter(input, "startInset", anchor.length * 0.08), anchor.length * 0.42));
    const endInset = Math.max(0, Math.min(numberParameter(input, "endInset", anchor.length * 0.18), anchor.length * 0.42));
    const warnings = depth >= anchor.length / 2 ? [`${input.id}: bottom dust depth may interfere with lock-bottom geometry.`] : [];
    const face = anchoredTrapezoidFace({
      id: `${input.id}.face`,
      label: "Angled Bottom Dust Flap",
      sourcePartId: input.id,
      anchor,
      depth,
      startInset,
      endInset,
      role: "dust",
      printable: false,
    });
    const result = emptyPartResult();

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Angled bottom dust hinge",
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 90,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};
