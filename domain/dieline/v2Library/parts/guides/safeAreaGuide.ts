import type { V2PartImplementation } from "../../contracts/types";
import { roundedRectPrimitive } from "../../primitives/roundedRect";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter } from "../buildingBlocks";

type SafeAreaGuideParameters = {
  inset?: number;
};

export const safeAreaGuide: V2PartImplementation<SafeAreaGuideParameters> = {
  id: "safeAreaGuide",
  label: "Safe area guide",
  contractId: "safeAreaGuide",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const inset = Math.max(0, numberParameter(input, "inset", 5));
    const primitive = roundedRectPrimitive({
      id: `${input.id}.safe-area`,
      label: "Safe area guide",
      layer: "safe-area",
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
