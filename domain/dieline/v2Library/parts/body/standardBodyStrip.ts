import { createFaceEdgeAnchors } from "../../anchors/createAnchors";
import type { V2PartImplementation, V2StructuralCrease } from "../../contracts/types";
import { rectangleFace } from "../../primitives/polygon";
import { emptyPartResult, numberParameter, positiveParameter } from "../buildingBlocks";

type StandardBodyStripParameters = {
  L?: number;
  W?: number;
  H?: number;
  topAllowance?: number;
  bottomAllowance?: number;
};

export const standardBodyStrip: V2PartImplementation<StandardBodyStripParameters> = {
  id: "standardBodyStrip",
  label: "Standard body strip",
  contractId: "standardBodyStrip",
  build(input) {
    const length = positiveParameter(input, "L");
    const width = positiveParameter(input, "W");
    const height = positiveParameter(input, "H");
    const topAllowance = Math.max(0, numberParameter(input, "topAllowance", 0));
    const y = topAllowance;
    const result = emptyPartResult();
    const warnings: string[] = [];

    if (width > length) {
      warnings.push(`${input.id}: W is larger than L; documentation convention expects L to be the longer horizontal dimension.`);
    }

    const panels = [
      { id: "back", label: "Back Panel", width: length },
      { id: "sideB", label: "Side B Panel", width },
      { id: "front", label: "Front Panel", width: length },
      { id: "sideA", label: "Side A Panel", width },
    ];
    let cursor = 0;

    for (const panel of panels) {
      const face = rectangleFace({
        id: `${input.id}.${panel.id}`,
        label: panel.label,
        role: "body",
        x: cursor,
        y,
        width: panel.width,
        height,
        sourcePartId: input.id,
      });
      result.faces.push(face);
      result.anchors.push(...createFaceEdgeAnchors(input.id, face));
      cursor += panel.width;
    }

    for (let index = 0; index < result.faces.length - 1; index += 1) {
      const left = result.faces[index];
      const right = result.faces[index + 1];
      const x = left.bounds.x + left.bounds.width;
      result.structuralCreases.push(verticalCrease(`${input.id}.crease.${left.id}.${right.id}`, left.id, right.id, x, y, y + height));
    }

    if (numberParameter(input, "bottomAllowance", 0) < 0) {
      warnings.push(`${input.id}: bottomAllowance is negative and ignored by standard body strip.`);
    }

    return { ...result, warnings };
  },
};

function verticalCrease(id: string, faceA: string, faceB: string, x: number, y1: number, y2: number): V2StructuralCrease {
  return {
    id,
    label: "Vertical body corner hinge",
    faceA,
    faceB,
    start: { x, y: y1 },
    end: { x, y: y2 },
    foldAngleDegrees: 90,
    foldDirection: "inward",
  };
}
