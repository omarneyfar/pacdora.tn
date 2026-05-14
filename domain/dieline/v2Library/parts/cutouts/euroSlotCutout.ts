import type { V2PartImplementation } from "../../contracts/types";
import { euroSlotPrimitive } from "../../primitives/slots";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter, positiveParameter } from "../buildingBlocks";

type EuroSlotCutoutParameters = {
  SL?: number;
  SW?: number;
  FR?: number;
  crownRadius?: number;
  centerX?: number;
  centerY?: number;
  margin?: number;
};

export const euroSlotCutout: V2PartImplementation<EuroSlotCutoutParameters> = {
  id: "euroSlotCutout",
  label: "Euro slot cutout",
  contractId: "euroSlotCutout",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const width = positiveParameter(input, "SL", face.bounds.width * 0.45);
    const height = positiveParameter(input, "SW", Math.max(4, face.bounds.height * 0.14));
    const margin = Math.max(0, numberParameter(input, "margin", 4));
    const centerX = face.bounds.x + numberParameter(input, "centerX", face.bounds.width / 2);
    const centerY = face.bounds.y + numberParameter(input, "centerY", face.bounds.height * 0.42);
    const primitive = euroSlotPrimitive({
      id: `${input.id}.euro-slot`,
      label: "Euro slot cutout",
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      radius: numberParameter(input, "FR", height / 2),
      crownRadius: numberParameter(input, "crownRadius", height * 0.82),
      ownerFaceId: face.id,
    });
    const warnings = width + margin * 2 > face.bounds.width ? [`${input.id}: euro slot leaves insufficient side margin.`] : [];

    assertPrimitiveInsideFace(primitive, face, margin);
    return { ...emptyPartResult(), geometryPrimitives: [primitive], warnings };
  },
};
