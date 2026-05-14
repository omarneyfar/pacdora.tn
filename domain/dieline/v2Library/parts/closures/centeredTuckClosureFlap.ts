import type { V2Anchor, V2PartImplementation, V2Point } from "../../contracts/types";
import { midpoint, offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import {
  anchorsForFace,
  emptyPartResult,
  linePrimitive,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type CenteredTuckClosureFlapParameters = {
  TFW1?: number;
  TFW2?: number;
  D1?: number;
};

export const centeredTuckClosureFlap: V2PartImplementation<CenteredTuckClosureFlapParameters> = {
  id: "centeredTuckClosureFlap",
  label: "Centered tuck closure flap",
  contractId: "centeredTuckClosureFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`${input.id}: centered tuck flap must attach to a top or bottom anchor.`);
    }

    const baseDepth = positiveParameter(input, "TFW1", Math.max(18, anchor.length * 0.36));
    const peakRise = positiveParameter(input, "D1", Math.max(6, anchor.length * 0.08));
    const sideShoulder = Math.max(2, numberParameter(input, "TFW2", baseDepth * 0.68));
    const face = createFace({
      id: `${input.id}.face`,
      label: "Centered Tuck Closure Flap",
      role: "closure",
      sourcePartId: input.id,
      points: centeredTuckPoints(anchor, baseDepth, peakRise, sideShoulder),
      printable: true,
    });
    const result = emptyPartResult();
    const leadingLeft = offset(anchor.start, anchor.normal, sideShoulder);
    const leadingRight = offset(anchor.end, anchor.normal, sideShoulder);

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Centered tuck hinge",
      anchor,
      childFaceId: face.id,
      foldAngle: 90,
      foldDirection: "inward",
    }));
    result.geometryPrimitives.push(linePrimitive({
      id: `${input.id}.center-peak-guide`,
      label: "Geometry-only centered leading edge guide",
      layer: "guide",
      start: leadingLeft,
      end: leadingRight,
      ownerFaceId: face.id,
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return {
      ...result,
      warnings: [`${input.id}: centered/angled leading edge is partial-experimental and needs visual overlay against a verified reference.`],
    };
  },
};

function centeredTuckPoints(anchor: V2Anchor, baseDepth: number, peakRise: number, sideShoulder: number): V2Point[] {
  const center = midpoint(anchor.start, anchor.end);
  return [
    anchor.start,
    offset(anchor.start, anchor.normal, sideShoulder),
    offset(center, anchor.normal, baseDepth + peakRise),
    offset(anchor.end, anchor.normal, sideShoulder),
    anchor.end,
  ];
}
