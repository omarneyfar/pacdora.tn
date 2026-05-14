import type { V2PartImplementation } from "../../contracts/types";
import { roundedRectPrimitive } from "../../primitives/roundedRect";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter } from "../buildingBlocks";

type GlueZoneGuideParameters = {
  inset?: number;
};

export const glueZoneGuide: V2PartImplementation<GlueZoneGuideParameters> = {
  id: "glueZoneGuide",
  label: "Glue zone guide",
  contractId: "glueZoneGuide",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const inset = Math.max(0, numberParameter(input, "inset", 2));
    const primitive = roundedRectPrimitive({
      id: `${input.id}.glue-zone`,
      label: "Glue zone guide",
      layer: "glue",
      x: face.bounds.x + inset,
      y: face.bounds.y + inset,
      width: face.bounds.width - inset * 2,
      height: face.bounds.height - inset * 2,
      radius: 0,
      ownerFaceId: face.id,
    });

    assertPrimitiveInsideFace(primitive, face);
    return { ...emptyPartResult(), geometryPrimitives: [primitive] };
  },
};
