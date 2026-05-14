import type { V2PartImplementation } from "../../contracts/types";
import { assertBaseEdgeMatchesAnchor } from "../../primitives/validation";
import {
  anchoredRectangleFace,
  anchorsForFace,
  emptyPartResult,
  polygonPrimitive,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type SideGlueSeamTabParameters = {
  GFW?: number;
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

    const face = anchoredRectangleFace({
      id: `${input.id}.face`,
      label: "Side Glue Seam Tab",
      sourcePartId: input.id,
      anchor,
      depth: glueWidth,
      role: "glue",
      printable: false,
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
