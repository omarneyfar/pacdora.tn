import type { V2Anchor, V2PartImplementation, V2Point } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import { assertBaseEdgeMatchesAnchor } from "../../primitives/validation";
import {
  anchorsForFace,
  emptyPartResult,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type StandardDustFlapParameters = {
  DFW?: number;
  taper?: number;
  shoulder?: number;
  reliefDepth?: number;
  sidePosition?: "left" | "right";
};

export const standardDustFlap: V2PartImplementation<StandardDustFlapParameters> = {
  id: "standardDustFlap",
  label: "Standard dust flap",
  contractId: "standardDustFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`${input.id}: dust flap must attach to top or bottom anchors.`);
    }

    const depth = positiveParameter(input, "DFW", Math.max(8, anchor.length * 0.45));
    const defaultTaper = Math.min(anchor.length * 0.08, depth * 0.3);
    const taper = clamp(numberParameter(input, "taper", defaultTaper), 0, Math.max(0, anchor.length / 2 - 1));
    const shoulder = clamp(numberParameter(input, "shoulder", Math.min(depth * 0.14, anchor.length * 0.08)), 0, depth * 0.45);
    const reliefInset = clamp(numberParameter(input, "reliefDepth", taper), 0, Math.min(taper, anchor.length * 0.18));
    const sidePosition = input.parameters.sidePosition === "right" ? "right" : "left";
    const warnings: string[] = [];
    if (depth >= anchor.length / 2) {
      warnings.push(`${input.id}: DFW should be less than half box width to avoid dust flap jamming.`);
    }
    if (taper > anchor.length * 0.18) {
      warnings.push(`${input.id}: dust flap taper is large and may reduce side sealing area.`);
    }

    const face = createFace({
      id: `${input.id}.face`,
      label: "Standard Dust Flap",
      role: "dust",
      sourcePartId: input.id,
      printable: false,
      points: handedDustPoints(anchor, depth, taper, shoulder, reliefInset, sidePosition),
    });
    assertBaseEdgeMatchesAnchor(face, anchor, input.id);
    const result = emptyPartResult();

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Dust flap hinge",
      anchor,
      childFaceId: face.id,
      foldAngleDegrees: 90,
      foldDirection: "inward",
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};

function handedDustPoints(anchor: V2Anchor, depth: number, taper: number, shoulder: number, reliefInset: number, sidePosition: "left" | "right"): V2Point[] {
  const lowerReliefInset = reliefInset * 0.18;
  const lowerReliefDepth = shoulder * 0.12;
  const shoulderInset = reliefInset * 0.55;
  const shoulderDepth = shoulder * 0.78;
  const outerTopInset = clamp(
    Math.max(reliefInset + taper * 0.32, taper * 1.2),
    shoulderInset + 0.5,
    Math.max(shoulderInset + 0.5, anchor.length - taper - 1),
  );
  const innerReturnInset = clamp(
    Math.max(reliefInset * 0.7, taper * 0.62),
    0.5,
    Math.max(0.5, taper - 0.25),
  );
  const innerReturnDepth = clamp(
    Math.max(shoulder * 1.15, depth * 0.16),
    shoulder,
    Math.max(shoulder, depth * 0.35),
  );

  if (sidePosition === "right") {
    return [
      anchor.start,
      offset(offset(anchor.start, anchor.tangent, lowerReliefInset), anchor.normal, lowerReliefDepth),
      offset(offset(anchor.start, anchor.tangent, shoulderInset), anchor.normal, shoulderDepth),
      offset(offset(anchor.start, anchor.tangent, outerTopInset), anchor.normal, depth),
      offset(offset(anchor.end, anchor.tangent, -taper), anchor.normal, depth),
      offset(offset(anchor.end, anchor.tangent, -innerReturnInset), anchor.normal, innerReturnDepth),
      anchor.end,
    ];
  }

  return [
    anchor.start,
    offset(offset(anchor.start, anchor.tangent, innerReturnInset), anchor.normal, innerReturnDepth),
    offset(offset(anchor.start, anchor.tangent, taper), anchor.normal, depth),
    offset(offset(anchor.end, anchor.tangent, -outerTopInset), anchor.normal, depth),
    offset(offset(anchor.end, anchor.tangent, -shoulderInset), anchor.normal, shoulderDepth),
    offset(offset(anchor.end, anchor.tangent, -lowerReliefInset), anchor.normal, lowerReliefDepth),
    anchor.end,
  ];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
