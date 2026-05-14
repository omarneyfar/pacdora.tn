import type { V2Anchor, V2PartImplementation, V2Point } from "../../contracts/types";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import {
  anchorsForFace,
  emptyPartResult,
  linePrimitive,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

type BottomLockFlapParameters = {
  bodyDepth?: number;
  tongueDepth?: number;
  tongueWidth?: number;
};

export const bottomLockFlap: V2PartImplementation<BottomLockFlapParameters> = {
  id: "bottomLockFlap",
  label: "Bottom lock flap",
  contractId: "bottomLockFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "bottom") {
      throw new Error(`${input.id}: bottom lock flap must attach to a bottom anchor.`);
    }

    const bodyDepth = positiveParameter(input, "bodyDepth", anchor.length * 0.48);
    const tongueDepth = positiveParameter(input, "tongueDepth", Math.max(5, anchor.length * 0.08));
    const tongueWidth = Math.min(positiveParameter(input, "tongueWidth", anchor.length * 0.5), anchor.length * 0.82);
    const warnings = [`${input.id}: bottom lock flap is only a prerequisite piece; full snap-lock bottom remains spec-only.`];
    const face = createFace({
      id: `${input.id}.face`,
      label: "Bottom Lock Flap",
      role: "closure",
      sourcePartId: input.id,
      points: bottomLockPoints(anchor, bodyDepth, tongueDepth, tongueWidth),
      printable: true,
    });
    const result = emptyPartResult();
    const scoreStart = offset(offset(anchor.start, anchor.tangent, (anchor.length - tongueWidth) / 2), anchor.normal, bodyDepth);
    const scoreEnd = offset(scoreStart, anchor.tangent, tongueWidth);

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Bottom lock hinge",
      anchor,
      childFaceId: face.id,
      foldAngle: 90,
      foldDirection: "inward",
    }));
    result.geometryPrimitives.push(linePrimitive({
      id: `${input.id}.tongue-shoulder-score`,
      label: "Geometry-only tongue shoulder score",
      layer: "score",
      start: scoreStart,
      end: scoreEnd,
      ownerFaceId: face.id,
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};

function bottomLockPoints(anchor: V2Anchor, bodyDepth: number, tongueDepth: number, tongueWidth: number): V2Point[] {
  const inset = (anchor.length - tongueWidth) / 2;
  const bodyStart = offset(anchor.start, anchor.normal, bodyDepth);
  const bodyEnd = offset(anchor.end, anchor.normal, bodyDepth);
  return [
    anchor.start,
    bodyStart,
    offset(bodyStart, anchor.tangent, inset),
    offset(offset(bodyStart, anchor.tangent, inset), anchor.normal, tongueDepth),
    offset(offset(bodyEnd, anchor.tangent, -inset), anchor.normal, tongueDepth),
    offset(bodyEnd, anchor.tangent, -inset),
    bodyEnd,
    anchor.end,
  ];
}
