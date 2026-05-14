import type { V2Face, V2Point, V2StructuralCrease } from "../contracts/types";
import { distance, isFinitePoint } from "../primitives/points";
import { hasSelfIntersection, pointOnSegment } from "../primitives/polygon";
import { primitiveSamplePoints } from "../primitives/validation";
import type { V2AssemblyValidationResult, V2TemplateAssembly } from "./types";

export function validateV2Assembly(assembly: V2TemplateAssembly): V2AssemblyValidationResult {
  const errors: string[] = [];
  const warnings = [...assembly.warnings];
  const faceIds = new Set<string>();
  const creaseIds = new Set<string>();
  const geometryIds = new Set<string>();
  const anchorIds = new Set<string>();
  const globalIds = new Set<string>();
  const facesById = new Map<string, V2Face>();

  for (const part of assembly.parts) {
    if (part.productionReady !== false) {
      errors.push(`Part "${part.id}" must remain productionReady=false.`);
    }
    if (part.implementationStatus === "spec-only") {
      errors.push(`Spec-only part "${part.id}" was used as an implementation.`);
    }
  }

  for (const face of assembly.faces) {
    reserve(face.id, "face", globalIds, faceIds, errors);
    facesById.set(face.id, face);
    if (face.points.length < 3) errors.push(`Face "${face.id}" must have at least three points.`);
    if (!face.points.every(isFinitePoint)) errors.push(`Face "${face.id}" has non-finite points.`);
    if (face.points.some((point, index) => distance(point, face.points[(index + 1) % face.points.length]) <= 0.000001)) {
      errors.push(`Face "${face.id}" has a zero-length edge.`);
    }
    if (hasSelfIntersection(face.points)) errors.push(`Face "${face.id}" self-intersects.`);
  }

  for (const crease of assembly.structuralCreases) {
    reserve(crease.id, "crease", globalIds, creaseIds, errors);
    if (!facesById.has(crease.faceA) || !facesById.has(crease.faceB)) {
      errors.push(`Crease "${crease.id}" references a missing face.`);
    }
    if (crease.faceA === crease.faceB) {
      errors.push(`Crease "${crease.id}" connects a face to itself.`);
    }
    if (!isFinitePoint(crease.start) || !isFinitePoint(crease.end)) {
      errors.push(`Crease "${crease.id}" has non-finite endpoints.`);
    }
    if (distance(crease.start, crease.end) <= 0.000001) {
      errors.push(`Crease "${crease.id}" has zero length.`);
    }
    if (isGeometryOnlyCrease(crease)) {
      errors.push(`Crease "${crease.id}" looks like geometry-only output.`);
    }

    const faceA = facesById.get(crease.faceA);
    const faceB = facesById.get(crease.faceB);
    if (faceA && !isLineOnFaceBoundary(crease.start, crease.end, faceA)) {
      errors.push(`Crease "${crease.id}" is not on boundary of face "${faceA.id}".`);
    }
    if (faceB && !isLineOnFaceBoundary(crease.start, crease.end, faceB)) {
      errors.push(`Crease "${crease.id}" is not on boundary of face "${faceB.id}".`);
    }
  }

  for (const primitive of assembly.geometryPrimitives) {
    reserve(primitive.id, "geometry primitive", globalIds, geometryIds, errors);
    if (primitiveSamplePoints(primitive).some((point) => !isFinitePoint(point))) {
      errors.push(`Geometry primitive "${primitive.id}" has non-finite points.`);
    }
  }

  for (const anchor of assembly.anchors) {
    reserve(anchor.id, "anchor", globalIds, anchorIds, errors);
    if (!facesById.has(anchor.faceId)) {
      errors.push(`Anchor "${anchor.id}" references missing face "${anchor.faceId}".`);
    }
    if (!isFinitePoint(anchor.start) || !isFinitePoint(anchor.end) || !isFinitePoint(anchor.normal) || !isFinitePoint(anchor.tangent)) {
      errors.push(`Anchor "${anchor.id}" has non-finite geometry.`);
    }
    if (anchor.length <= 0 || !Number.isFinite(anchor.length)) {
      errors.push(`Anchor "${anchor.id}" has invalid length.`);
    }
  }

  if (assembly.rootFaceId && !facesById.has(assembly.rootFaceId)) {
    errors.push(`Root face "${assembly.rootFaceId}" does not exist.`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertValidV2Assembly(assembly: V2TemplateAssembly): V2AssemblyValidationResult {
  const result = validateV2Assembly(assembly);
  if (!result.ok) {
    throw new Error(`V2 assembly "${assembly.id}" is invalid: ${result.errors.join("; ")}`);
  }
  return result;
}

function reserve(
  id: string,
  label: string,
  globalIds: Set<string>,
  localIds: Set<string>,
  errors: string[],
): void {
  if (localIds.has(id)) errors.push(`Duplicate ${label} id "${id}".`);
  if (globalIds.has(id)) errors.push(`Duplicate global V2 entity id "${id}".`);
  localIds.add(id);
  globalIds.add(id);
}

function isLineOnFaceBoundary(start: V2Point, end: V2Point, face: V2Face): boolean {
  return face.points.some((edgeStart, index) => {
    const edgeEnd = face.points[(index + 1) % face.points.length];
    return pointOnSegment(start, edgeStart, edgeEnd) && pointOnSegment(end, edgeStart, edgeEnd);
  });
}

function isGeometryOnlyCrease(crease: V2StructuralCrease): boolean {
  return /score|slot|hole|window|relief|safe|bleed|perforation|notch|zone/i.test(`${crease.id} ${crease.label}`);
}
