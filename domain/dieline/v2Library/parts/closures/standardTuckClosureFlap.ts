import type { V2Anchor, V2GeometryPrimitive, V2PartImplementation, V2Point } from "../../contracts/types";
import { sampleArc } from "../../primitives/arcs";
import { offset } from "../../primitives/points";
import { createFace } from "../../primitives/polygon";
import {
  anchorsForFace,
  emptyPartResult,
  linePrimitive,
  numberParameter,
  positiveParameter,
  structuralCrease,
} from "../buildingBlocks";

export type TuckClosureParameters = {
  TFW?: number;
  TFR?: number;
  DFW?: number;
  lipScoreOffset?: number;
};

export const standardTuckClosureFlap: V2PartImplementation<TuckClosureParameters> = {
  id: "standardTuckClosureFlap",
  label: "Standard tuck closure flap",
  contractId: "standardTuckClosureFlap",
  build(input, context) {
    return buildTuckClosureFlap(input, context, {
      label: "Standard Tuck Closure Flap",
      includeLockNotches: false,
      includeLipScore: true,
    });
  },
};

export function buildTuckClosureFlap(
  input: Parameters<V2PartImplementation<TuckClosureParameters>["build"]>[0],
  context: Parameters<V2PartImplementation<TuckClosureParameters>["build"]>[1],
  options: { label: string; includeLockNotches: boolean; includeLipScore?: boolean },
) {
  if (!input.attachTo) throw new Error(`${input.id}: attachTo is required.`);
  const anchor = context.getAnchor(input.attachTo);
  if (anchor.edge !== "top" && anchor.edge !== "bottom") {
    throw new Error(`${input.id}: tuck closure flaps attach only to top or bottom anchors.`);
  }

  const depth = positiveParameter(input, "TFW", anchor.length * 0.55);
  const radius = Math.max(0, Math.min(positiveParameter(input, "TFR", Math.min(6, depth * 0.18)), anchor.length * 0.18, depth * 0.45));
  const dustDepth = positiveParameter(input, "DFW", depth * 0.65);
  const warnings: string[] = [];

  if (depth < 12) warnings.push(`${input.id}: TFW is below the documented 12mm minimum for reliable tuck closure.`);
  if (depth > anchor.length * 0.9) warnings.push(`${input.id}: TFW exceeds 90% of anchor width and may buckle.`);
  if (radius < 2) warnings.push(`${input.id}: TFR is below the documented common die radius minimum.`);

  const face = createFace({
    id: `${input.id}.face`,
    label: options.label,
    role: "closure",
    sourcePartId: input.id,
    points: roundedTuckPoints(anchor, depth, radius),
  });
  const result = emptyPartResult();
  result.faces.push(face);
  result.structuralCreases.push(structuralCrease({
    id: `${input.id}.hinge`,
    label: `${options.label} hinge`,
    anchor,
    childFaceId: face.id,
    foldAngleDegrees: 180,
    foldDirection: "inward",
  }));

  if (options.includeLockNotches) {
    result.geometryPrimitives.push(...lockNotchPrimitives(input.id, face.id, anchor, Math.min(3, anchor.length * 0.025), Math.min(depth - 1, Math.max(2, dustDepth))));
  }

  if (options.includeLipScore) {
    const scoreOffsetFromLeadingEdge = clamp(
      numberParameter(input, "lipScoreOffset", Math.max(radius * 1.8, depth * 0.24)),
      Math.max(1, radius + 0.5),
      depth - 1,
    );
    const scoreOffsetFromBase = depth - scoreOffsetFromLeadingEdge;
    result.geometryPrimitives.push(linePrimitive({
      id: `${input.id}.lip-score`,
      label: "Geometry-only lip score",
      layer: "score",
      start: offset(anchor.start, anchor.normal, scoreOffsetFromBase),
      end: offset(anchor.end, anchor.normal, scoreOffsetFromBase),
      ownerFaceId: face.id,
    }));
  }

  result.anchors.push(...anchorsForFace(input.id, face));
  return { ...result, warnings };
}

function roundedTuckPoints(anchor: V2Anchor, depth: number, radius: number): V2Point[] {
  const x0 = anchor.start.x;
  const x1 = anchor.end.x;
  const baseY = anchor.start.y;
  const outward = anchor.normal.y;

  if (radius <= 0.000001) {
    return [
      anchor.start,
      { x: x0, y: baseY + outward * depth },
      { x: x1, y: baseY + outward * depth },
      anchor.end,
    ];
  }

  if (anchor.edge === "top") {
    const y = baseY - depth;
    return [
      anchor.start,
      { x: x0, y: y + radius },
      ...sampleArc({ x: x0 + radius, y: y + radius }, radius, Math.PI, Math.PI * 1.5, 6).slice(1),
      { x: x1 - radius, y },
      ...sampleArc({ x: x1 - radius, y: y + radius }, radius, Math.PI * 1.5, Math.PI * 2, 6).slice(1),
      anchor.end,
    ];
  }

  const y = baseY + depth;
  return [
    anchor.start,
    { x: x0, y: y - radius },
    ...sampleArc({ x: x0 + radius, y: y - radius }, radius, Math.PI, Math.PI * 0.5, 6).slice(1),
    { x: x1 - radius, y },
    ...sampleArc({ x: x1 - radius, y: y - radius }, radius, Math.PI * 0.5, 0, 6).slice(1),
    anchor.end,
  ];
}

function lockNotchPrimitives(partId: string, faceId: string, anchor: V2Anchor, notchDepth: number, offsetFromBase: number): V2GeometryPrimitive[] {
  const leftBase = offset(anchor.start, anchor.normal, offsetFromBase);
  const rightBase = offset(anchor.end, anchor.normal, offsetFromBase);
  return [
    triangularNotch(`${partId}.lock-notch-start`, "Start lock notch cut guide", faceId, leftBase, anchor.tangent, anchor.normal, notchDepth),
    triangularNotch(`${partId}.lock-notch-end`, "End lock notch cut guide", faceId, rightBase, { x: -anchor.tangent.x, y: -anchor.tangent.y }, anchor.normal, notchDepth),
  ];
}

function triangularNotch(id: string, label: string, ownerFaceId: string, base: V2Point, tangent: V2Point, normal: V2Point, depth: number): V2GeometryPrimitive {
  return {
    id,
    label,
    type: "polyline",
    layer: "cut",
    ownerFaceId,
    points: [
      base,
      offset(offset(base, tangent, depth), normal, depth),
      offset(base, normal, depth * 2),
    ],
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
