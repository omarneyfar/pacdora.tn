import { createFaceEdgeAnchors } from "../anchors/createAnchors";
import type {
  V2Anchor,
  V2Face,
  V2GeometryPrimitive,
  V2PartBuildInput,
  V2PartResult,
  V2Point,
  V2StructuralCrease,
} from "../contracts/types";
import { offset } from "../primitives/points";
import { createFace } from "../primitives/polygon";
import { assertBaseEdgeMatchesAnchor, assertPositive } from "../primitives/validation";

export function numberParameter(input: V2PartBuildInput, name: string, fallback?: number): number {
  const raw = input.parameters[name];
  const value = typeof raw === "number" ? raw : fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${input.id}.${name} must be finite.`);
  }
  return value;
}

export function positiveParameter(input: V2PartBuildInput, name: string, fallback?: number): number {
  const value = numberParameter(input, name, fallback);
  assertPositive(value, `${input.id}.${name}`);
  return value;
}

export function emptyPartResult(): V2PartResult {
  return {
    faces: [],
    structuralCreases: [],
    geometryPrimitives: [],
    anchors: [],
    warnings: [],
  };
}

export function structuralCrease(input: {
  id: string;
  label: string;
  anchor: V2Anchor;
  childFaceId: string;
  foldAngleDegrees?: number;
  foldDirection?: "valley" | "mountain" | "inward" | "outward";
}): V2StructuralCrease {
  return {
    id: input.id,
    label: input.label,
    faceA: input.anchor.faceId,
    faceB: input.childFaceId,
    start: input.anchor.start,
    end: input.anchor.end,
    foldAngleDegrees: input.foldAngleDegrees,
    foldDirection: input.foldDirection,
  };
}

export function anchoredRectangleFace(input: {
  id: string;
  label: string;
  sourcePartId: string;
  anchor: V2Anchor;
  depth: number;
  role: V2Face["role"];
  printable?: boolean;
}): V2Face {
  const face = createFace({
    id: input.id,
    label: input.label,
    role: input.role,
    points: [
      input.anchor.start,
      offset(input.anchor.start, input.anchor.normal, input.depth),
      offset(input.anchor.end, input.anchor.normal, input.depth),
      input.anchor.end,
    ],
    sourcePartId: input.sourcePartId,
    printable: input.printable,
  });
  assertBaseEdgeMatchesAnchor(face, input.anchor, input.id);
  return face;
}

export function anchoredTrapezoidFace(input: {
  id: string;
  label: string;
  sourcePartId: string;
  anchor: V2Anchor;
  depth: number;
  startInset: number;
  endInset: number;
  role: V2Face["role"];
  printable?: boolean;
}): V2Face {
  const face = createFace({
    id: input.id,
    label: input.label,
    role: input.role,
    points: [
      input.anchor.start,
      offset(offset(input.anchor.start, input.anchor.tangent, input.startInset), input.anchor.normal, input.depth),
      offset(offset(input.anchor.end, input.anchor.tangent, -input.endInset), input.anchor.normal, input.depth),
      input.anchor.end,
    ],
    sourcePartId: input.sourcePartId,
    printable: input.printable,
  });
  assertBaseEdgeMatchesAnchor(face, input.anchor, input.id);
  return face;
}

export function anchorsForFace(ownerPartId: string, face: V2Face): V2Anchor[] {
  return createFaceEdgeAnchors(ownerPartId, face);
}

export function linePrimitive(input: {
  id: string;
  label: string;
  layer: V2GeometryPrimitive["layer"];
  start: V2Point;
  end: V2Point;
  ownerFaceId?: string;
}): V2GeometryPrimitive {
  return {
    id: input.id,
    label: input.label,
    type: "line",
    layer: input.layer,
    start: input.start,
    end: input.end,
    ownerFaceId: input.ownerFaceId,
  };
}

export function polygonPrimitive(input: {
  id: string;
  label: string;
  layer: V2GeometryPrimitive["layer"];
  points: V2Point[];
  ownerFaceId?: string;
}): V2GeometryPrimitive {
  return {
    id: input.id,
    label: input.label,
    type: "polygon",
    layer: input.layer,
    points: input.points,
    ownerFaceId: input.ownerFaceId,
  };
}

export function mergeWarnings(partWarnings: string[], contextWarnings: string[]): string[] {
  return [...partWarnings, ...contextWarnings];
}
