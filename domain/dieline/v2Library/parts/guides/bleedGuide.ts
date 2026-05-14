import type { V2PartImplementation } from "../../contracts/types";
import { roundedRectPrimitive } from "../../primitives/roundedRect";
import { emptyPartResult, numberParameter } from "../buildingBlocks";

type BleedGuideParameters = {
  bleed?: number;
};

export const bleedGuide: V2PartImplementation<BleedGuideParameters> = {
  id: "bleedGuide",
  label: "Bleed guide",
  contractId: "bleedGuide",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const bleed = Math.max(0, numberParameter(input, "bleed", 3));
    const warnings = bleed < 3 ? [`${input.id}: bleed is below common 3mm carton artwork practice.`] : [];
    const primitive = roundedRectPrimitive({
      id: `${input.id}.bleed`,
      label: "Bleed guide",
      layer: "bleed",
      x: face.bounds.x - bleed,
      y: face.bounds.y - bleed,
      width: face.bounds.width + bleed * 2,
      height: face.bounds.height + bleed * 2,
      radius: 0,
      ownerFaceId: face.id,
    });

    return { ...emptyPartResult(), geometryPrimitives: [primitive], warnings };
  },
};
