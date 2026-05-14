import type { V2PartImplementation } from "../../contracts/types";
import { assertPrimitiveInsideFace } from "../../primitives/validation";
import { emptyPartResult, numberParameter, positiveParameter } from "../buildingBlocks";

type CircularCutoutParameters = {
  OD?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
  margin?: number;
};

export const circularCutout: V2PartImplementation<CircularCutoutParameters> = {
  id: "circularCutout",
  label: "Circular cutout",
  contractId: "circularCutout",
  build(input, context) {
    const faceId = input.attachToFace ?? input.attachTo;
    if (!faceId) throw new Error(`${input.id}: attachToFace is required.`);
    const face = context.getFace(faceId);
    const radius = positiveParameter(input, "radius", positiveParameter(input, "OD", 8) / 2);
    const margin = Math.max(0, numberParameter(input, "margin", 5));
    const center = {
      x: face.bounds.x + numberParameter(input, "centerX", face.bounds.width / 2),
      y: face.bounds.y + numberParameter(input, "centerY", face.bounds.height / 2),
    };
    const primitive = {
      id: `${input.id}.circle`,
      label: "Circular cutout",
      type: "circle" as const,
      layer: "hole" as const,
      center,
      radius,
      ownerFaceId: face.id,
    };
    const warnings: string[] = [];

    if (radius * 2 < 5 || radius * 2 > 12) {
      warnings.push(`${input.id}: circular hole diameter is outside the documented 5-12mm peg-hook range.`);
    }

    assertPrimitiveInsideFace(primitive, face, margin);
    return { ...emptyPartResult(), geometryPrimitives: [primitive], warnings };
  },
};
