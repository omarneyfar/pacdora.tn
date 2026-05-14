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

type LockingLipClosureParameters = {
  TFW?: number;
  TL?: number;
  TD1?: number;
  TR?: number;
};

export const lockingLipClosureFlap: V2PartImplementation<LockingLipClosureParameters> = {
  id: "lockingLipClosureFlap",
  label: "Locking lip closure flap",
  contractId: "lockingLipClosureFlap",
  build(input, context) {
    if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
    const anchor = context.getAnchor(input.attachTo);
    if (anchor.edge !== "top" && anchor.edge !== "bottom") {
      throw new Error(`${input.id}: locking lip closure must attach to top or bottom anchors.`);
    }

    const bodyDepth = positiveParameter(input, "TFW", anchor.length * 0.45);
    const tabDepth = positiveParameter(input, "TD1", Math.max(5, bodyDepth * 0.22));
    const tabWidth = Math.min(positiveParameter(input, "TL", anchor.length * 0.45), anchor.length - 20);
    const warnings: string[] = [];

    if (tabWidth > anchor.length - 20) warnings.push(`${input.id}: TL should leave at least 10mm side margin on each side.`);
    if (tabDepth < 5) warnings.push(`${input.id}: TD1 is below the documented 5mm minimum.`);

    const face = createFace({
      id: `${input.id}.face`,
      label: "Locking Lip Closure Flap",
      role: "closure",
      sourcePartId: input.id,
      points: lockingLipPoints(anchor, bodyDepth, tabDepth, tabWidth),
    });
    const result = emptyPartResult();
    const scoreStart = offset(offset(anchor.start, anchor.tangent, (anchor.length - tabWidth) / 2), anchor.normal, bodyDepth);
    const scoreEnd = offset(scoreStart, anchor.tangent, tabWidth);

    result.faces.push(face);
    result.structuralCreases.push(structuralCrease({
      id: `${input.id}.hinge`,
      label: "Locking lip hinge",
      anchor,
      childFaceId: face.id,
      foldAngle: 90,
      foldDirection: "inward",
    }));
    result.geometryPrimitives.push(linePrimitive({
      id: `${input.id}.tab-shoulder-score`,
      label: "Geometry-only tab shoulder score",
      layer: "score",
      start: scoreStart,
      end: scoreEnd,
      ownerFaceId: face.id,
    }));
    result.anchors.push(...anchorsForFace(input.id, face));

    return { ...result, warnings };
  },
};

function lockingLipPoints(anchor: V2Anchor, bodyDepth: number, tabDepth: number, tabWidth: number): V2Point[] {
  const inset = (anchor.length - tabWidth) / 2;
  const bodyStart = offset(anchor.start, anchor.normal, bodyDepth);
  const bodyEnd = offset(anchor.end, anchor.normal, bodyDepth);
  const tabStart = offset(bodyStart, anchor.tangent, inset);
  const tabEnd = offset(bodyEnd, anchor.tangent, -inset);
  return [
    anchor.start,
    bodyStart,
    tabStart,
    offset(tabStart, anchor.normal, tabDepth),
    offset(tabEnd, anchor.normal, tabDepth),
    tabEnd,
    bodyEnd,
    anchor.end,
  ];
}
