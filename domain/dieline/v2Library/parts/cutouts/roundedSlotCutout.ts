import type { V2PartImplementation } from "../../contracts/types";
import { roundedSlotPrimitive } from "../../primitives/slots";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter, positiveParameter } from "../buildingBlocks";

type RoundedSlotCutoutParameters = {
  width?: number;
  height?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
  margin?: number;
};

export const roundedSlotCutout: V2PartImplementation<RoundedSlotCutoutParameters> = {
  id: "roundedSlotCutout",
  label: "Rounded slot cutout",
  contractId: "roundedSlotCutout",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const width = positiveParameter(input, "width", face.bounds.width * 0.42);
    const height = positiveParameter(input, "height", Math.max(3, face.bounds.height * 0.08));
    const margin = Math.max(0, numberParameter(input, "margin", 5));
    const centerX = face.bounds.x + numberParameter(input, "centerX", face.bounds.width / 2);
    const centerY = face.bounds.y + numberParameter(input, "centerY", face.bounds.height / 2);
    const primitive = roundedSlotPrimitive({
      id: `${input.id}.slot`,
      label: "Rounded slot cutout",
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      radius: numberParameter(input, "radius", height / 2),
      ownerFaceId: face.id,
    });
    const warnings = width > face.bounds.width * 0.7 ? [`${input.id}: slot width is large relative to the receiving face.`] : [];

    assertPrimitiveInsideFace(primitive, face, margin);
    return { ...emptyPartResult(), geometryPrimitives: [primitive], warnings };
  },
};
