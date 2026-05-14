import type { V2PartImplementation } from "../../contracts/types";
import { roundedRectPrimitive } from "../../primitives/roundedRect";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter, positiveParameter } from "../buildingBlocks";

type WindowCutoutParameters = {
  WL?: number;
  WH?: number;
  WR?: number;
  centerX?: number;
  centerY?: number;
  margin?: number;
};

export const windowCutout: V2PartImplementation<WindowCutoutParameters> = {
  id: "windowCutout",
  label: "Window cutout",
  contractId: "windowCutout",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const width = positiveParameter(input, "WL", face.bounds.width * 0.45);
    const height = positiveParameter(input, "WH", face.bounds.height * 0.42);
    const margin = Math.max(0, numberParameter(input, "margin", 8));
    const centerX = face.bounds.x + numberParameter(input, "centerX", face.bounds.width / 2);
    const centerY = face.bounds.y + numberParameter(input, "centerY", face.bounds.height / 2);
    const primitive = roundedRectPrimitive({
      id: `${input.id}.window`,
      label: "Rounded rectangle window cutout",
      layer: "window",
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      radius: numberParameter(input, "WR", 3),
      ownerFaceId: face.id,
    });
    const warnings = width * height > face.bounds.width * face.bounds.height * 0.45
      ? [`${input.id}: window removes a large share of the panel and needs stiffness review.`]
      : [];

    assertPrimitiveInsideFace(primitive, face, margin);
    return { ...emptyPartResult(), geometryPrimitives: [primitive], warnings };
  },
};
