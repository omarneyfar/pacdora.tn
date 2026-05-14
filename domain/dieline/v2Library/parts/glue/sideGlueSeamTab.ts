import type { V2PartImplementation } from "../../contracts/types";
import { assertBaseEdgeMatchesAnchor } from "../../primitives/validation";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import {
  anchorsForFace,
  emptyPartResult,
  numberParameter,
  polygonPrimitive,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type SideGlueSeamTabParameters = {
  GFW?: number;
  reliefBevel?: number;
};

export const sideGlueSeamTab: V2PartImplementation<SideGlueSeamTabParameters> = {
  id: "sideGlueSeamTab",
  label: "Side glue seam tab",
  contractId: "sideGlueSeamTab",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "left" && anchor.edge !== "right") {
      throw new Error(`${input.id}: side glue seam tab must attach to a left or right edge anchor.`);
    }

    const glueWidth = positiveParameter(input, "GFW", 12);
    const warnings: string[] = [];
    if (glueWidth < 10 || glueWidth > 20) {
      warnings.push(`${input.id}: GFW is outside the documented typical 10-20mm glue range.`);
    }

    const reliefBevel = clamp(
      numberParameter(input, "reliefBevel", glueWidth * 0.34),
      0,
      Math.min(anchor.length * 0.18, glueWidth * 0.75),
    );
    const outerStart = offset(offset(anchor.start, anchor.normal, glueWidth), anchor.tangent, reliefBevel);
    const outerEnd = offset(offset(anchor.end, anchor.normal, glueWidth), anchor.tangent, -reliefBevel);
    const face = createFace({
      id: `${input.id}.face`,
      label: "Side Glue Seam Tab",
      role: "glue",
      sourcePartId: input.id,
      printable: false,
      points: [
        anchor.start,
        outerStart,
        outerEnd,
        anchor.end,
      ],
    });
    assertBaseEdgeMatchesAnchor(face, anchor, input.id);

    const result = emptyPartResult();
    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Glue seam hinge",
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 90,
      foldDirection: "inward",
    }));
    result.geometryPrimitives.push(polygonPrimitive({
      id: `${input.id}.glue-zone`,
      label: "No-print glue zone",
      layer: "glue",
      points: face.points,
      ownerFaceId: face.id,
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
