import type { V2PartImplementation } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import {
  anchorsForFace,
  emptyPartResult,
  polygonPrimitive,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type RelievedGlueSeamTabParameters = {
  GFW?: number;
  reliefDepth?: number;
  reliefInset?: number;
};

export const relievedGlueSeamTab: V2PartImplementation<RelievedGlueSeamTabParameters> = {
  id: "relievedGlueSeamTab",
  label: "Relieved glue seam tab",
  contractId: "relievedGlueSeamTab",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "left" && anchor.edge !== "right") {
      throw new Error(`${input.id}: relieved glue seam tab must attach to a left or right edge anchor.`);
    }

    const glueWidth = positiveParameter(input, "GFW", 12);
    const reliefDepth = Math.min(positiveParameter(input, "reliefDepth", Math.max(1.5, glueWidth * 0.18)), glueWidth * 0.45);
    const reliefInset = Math.min(positiveParameter(input, "reliefInset", Math.max(2, anchor.length * 0.04)), anchor.length * 0.25);
    const warnings: string[] = [];

    if (reliefDepth > glueWidth * 0.33) {
      warnings.push(`${input.id}: relief depth removes a large share of glue width; adhesive area needs review.`);
    }

    const outerStart = offset(anchor.start, anchor.normal, glueWidth);
    const outerEnd = offset(anchor.end, anchor.normal, glueWidth);
    const face = createFace({
      id: `${input.id}.face`,
      label: "Relieved Glue Seam Tab",
      role: "glue",
      sourcePartId: input.id,
      printable: false,
      points: [
        anchor.start,
        offset(anchor.start, anchor.tangent, reliefInset),
        offset(offset(anchor.start, anchor.tangent, reliefInset), anchor.normal, reliefDepth),
        outerStart,
        outerEnd,
        offset(offset(anchor.end, anchor.tangent, -reliefInset), anchor.normal, reliefDepth),
        offset(anchor.end, anchor.tangent, -reliefInset),
        anchor.end,
      ],
    });
    const result = emptyPartResult();

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Relieved glue seam hinge",
      anchor,
      childFaceId: face.id,
      foldAngle: 90,
      foldDirection: "inward",
    }));
    result.geometryPrimitives.push(polygonPrimitive({
      id: `${input.id}.glue-zone`,
      label: "Relieved glue zone",
      layer: "glue",
      points: face.points,
      ownerFaceId: face.id,
    }));
    result.geometryPrimitives.push(polygonPrimitive({
      id: `${input.id}.relief-cuts`,
      label: "Glue tab relief cut guides",
      layer: "cut",
      points: [anchor.start, offset(offset(anchor.start, anchor.tangent, reliefInset), anchor.normal, reliefDepth), anchor.end],
      ownerFaceId: face.id,
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};
