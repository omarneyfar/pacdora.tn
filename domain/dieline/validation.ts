import { createDielineFace, createExteriorCutPaths, getGraphBounds, pointsToPath } from "./geometry";
import { DIELINE_CATEGORY_ORDER } from "./structure";
import type {
  DielineCategory,
  DielineCrease,
  DielineCutPath,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  DielineGraphMetadata,
  DielineParameter,
  DielinePart,
  DielinePartRole,
  Point,
} from "./types";

const MAX_FACES = 80;
const MAX_VERTICES_PER_FACE = 120;
const MAX_PATH_LENGTH = 12000;
const MAX_SOURCE_SVG_LENGTH = 700_000;
const MAX_PARTS = 80;
const MAX_PARAMETERS = 32;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;
const FAMILY_PATTERN = /^[a-zA-Z0-9_-]{1,120}$/;
const PART_ROLES: DielinePartRole[] = [
  "body",
  "panel",
  "closure",
  "top-closure",
  "bottom-closure",
  "lid",
  "base",
  "wall",
  "dust-flap",
  "tuck-flap",
  "seal-flap",
  "bottom-flap",
  "glue-flap",
  "lock",
  "insert",
  "divider",
  "handle",
  "window",
  "tear-strip",
  "unknown",
];
const PARAMETER_KINDS: DielineParameter["kind"][] = ["dimension", "material", "closure", "export", "other"];

export function normalizeDielineGraph(value: unknown): DielineGraph | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<DielineGraph>;
  const rawFaces = Array.isArray(candidate.faces) ? candidate.faces.slice(0, MAX_FACES) : [];
  const faces = rawFaces.flatMap((face) => normalizeFace(face));
  const faceIds = new Set(faces.map((face) => face.id));

  if (faces.length === 0) {
    return null;
  }

  const bounds = getGraphBounds({ faces });
  const creases = Array.isArray(candidate.creases)
    ? candidate.creases.flatMap((crease) => normalizeCrease(crease, faceIds))
    : [];
  const creaseIds = new Set(creases.map((crease) => crease.id));
  const cutPaths = Array.isArray(candidate.cutPaths)
    ? candidate.cutPaths.flatMap((cutPath, index) => normalizeCutPath(cutPath, index))
    : createExteriorCutPaths(faces);
  const faceTree = normalizeFaceTree(candidate.faceTree, faceIds, creases);
  const metadata = normalizeGraphMetadata(candidate.metadata, faceIds, creaseIds);
  const sourceSvg =
    typeof candidate.sourceSvg === "string" && candidate.sourceSvg.length <= MAX_SOURCE_SVG_LENGTH
      ? candidate.sourceSvg
      : undefined;

  return {
    size: {
      width: normalizePositiveNumber(candidate.size?.width, bounds.width),
      height: normalizePositiveNumber(candidate.size?.height, bounds.height)
    },
    faces,
    creases,
    cutPaths: cutPaths.length > 0 ? cutPaths : createExteriorCutPaths(faces),
    faceTree: faceTree.length > 0 ? faceTree : createFallbackFaceTree(faces, creases),
    ...(metadata ? { metadata } : {}),
    ...(candidate.source ? { source: candidate.source } : {}),
    ...(sourceSvg ? { sourceSvg } : {})
  };
}

function normalizeFace(value: unknown): DielineFace[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<DielineFace>;
  if (!candidate.id || !ID_PATTERN.test(candidate.id)) {
    return [];
  }

  const vertices = Array.isArray(candidate.vertices)
    ? candidate.vertices.slice(0, MAX_VERTICES_PER_FACE).flatMap((point) => normalizePoint(point))
    : [];

  if (vertices.length < 3) {
    return [];
  }

  return [
    createDielineFace({
      id: candidate.id,
      label: typeof candidate.label === "string" && candidate.label.trim() ? candidate.label.trim().slice(0, 80) : candidate.id,
      vertices,
      role: candidate.role === "panel" || candidate.role === "flap" || candidate.role === "glue" ? candidate.role : "unknown",
      artworkEnabled: Boolean(candidate.artworkEnabled)
    })
  ];
}

function normalizeCrease(value: unknown, faceIds: Set<string>): DielineCrease[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<DielineCrease>;
  if (!candidate.id || !ID_PATTERN.test(candidate.id) || !candidate.faceA || !candidate.faceB) {
    return [];
  }

  if (!faceIds.has(candidate.faceA) || !faceIds.has(candidate.faceB)) {
    return [];
  }

  const edgeStart = normalizePoint(candidate.edgeStart)[0];
  const edgeEnd = normalizePoint(candidate.edgeEnd)[0];
  if (!edgeStart || !edgeEnd) {
    return [];
  }

  return [
    {
      id: candidate.id,
      faceA: candidate.faceA,
      faceB: candidate.faceB,
      edgeStart,
      edgeEnd,
      foldAngle: normalizePositiveNumber(candidate.foldAngle, Math.PI / 2),
      direction: candidate.direction === -1 ? -1 : 1
    }
  ];
}

function normalizeCutPath(value: unknown, index: number): DielineCutPath[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<DielineCutPath>;
  const points = Array.isArray(candidate.points) ? candidate.points.flatMap((point) => normalizePoint(point)) : undefined;
  const d = typeof candidate.d === "string" && candidate.d.length <= MAX_PATH_LENGTH
    ? candidate.d
    : points && points.length >= 2
      ? pointsToPath(points, false)
      : "";

  if (!d) {
    return [];
  }

  return [
    {
      id: candidate.id && ID_PATTERN.test(candidate.id) ? candidate.id : `cut-${index + 1}`,
      d,
      ...(points && points.length >= 2 ? { points } : {})
    }
  ];
}

function normalizeFaceTree(
  value: unknown,
  faceIds: Set<string>,
  creases: DielineCrease[]
): DielineFaceNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const creaseIds = new Set(creases.map((crease) => crease.id));
  return value.flatMap((node) => normalizeFaceTreeNode(node, faceIds, creaseIds));
}

function normalizeFaceTreeNode(value: unknown, faceIds: Set<string>, creaseIds: Set<string>): DielineFaceNode[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<DielineFaceNode>;
  if (!candidate.faceId || !faceIds.has(candidate.faceId)) {
    return [];
  }

  const creaseId = typeof candidate.creaseId === "string" && creaseIds.has(candidate.creaseId) ? candidate.creaseId : null;

  return [
    {
      faceId: candidate.faceId,
      creaseId,
      children: Array.isArray(candidate.children)
        ? candidate.children.flatMap((child) => normalizeFaceTreeNode(child, faceIds, creaseIds))
        : []
    }
  ];
}

function normalizeGraphMetadata(
  value: unknown,
  faceIds: Set<string>,
  creaseIds: Set<string>
): DielineGraphMetadata | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<DielineGraphMetadata>;
  const category = DIELINE_CATEGORY_ORDER.includes(candidate.category as DielineCategory)
    ? (candidate.category as DielineCategory)
    : undefined;
  const family = typeof candidate.family === "string" && FAMILY_PATTERN.test(candidate.family)
    ? candidate.family
    : undefined;
  const familyLabel = normalizeShortText(candidate.familyLabel, family ?? "");

  if (!category || !family || !familyLabel) {
    return undefined;
  }

  const parts = Array.isArray(candidate.parts)
    ? candidate.parts.slice(0, MAX_PARTS).flatMap((part) => normalizePart(part, faceIds, creaseIds))
    : [];
  const parameters = Array.isArray(candidate.parameters)
    ? candidate.parameters.slice(0, MAX_PARAMETERS).flatMap((parameter) => normalizeParameter(parameter))
    : [];

  return {
    category,
    family,
    familyLabel,
    parts,
    ...(parameters.length > 0 ? { parameters } : {})
  };
}

function normalizePart(value: unknown, faceIds: Set<string>, creaseIds: Set<string>): DielinePart[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<DielinePart>;
  if (!candidate.id || !ID_PATTERN.test(candidate.id)) {
    return [];
  }

  const partFaceIds = uniqueStrings(candidate.faceIds).filter((faceId) => faceIds.has(faceId));
  const partCreaseIds = uniqueStrings(candidate.creaseIds).filter((creaseId) => creaseIds.has(creaseId));

  if (partFaceIds.length === 0 && partCreaseIds.length === 0) {
    return [];
  }

  return [
    {
      id: candidate.id,
      label: normalizeShortText(candidate.label, candidate.id),
      role: PART_ROLES.includes(candidate.role as DielinePartRole) ? (candidate.role as DielinePartRole) : "unknown",
      faceIds: partFaceIds,
      ...(partCreaseIds.length > 0 ? { creaseIds: partCreaseIds } : {})
    }
  ];
}

function normalizeParameter(value: unknown): DielineParameter[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<DielineParameter>;
  if (!candidate.id || !ID_PATTERN.test(candidate.id)) {
    return [];
  }

  const parameterValue = candidate.value;
  if (
    typeof parameterValue !== "string" &&
    typeof parameterValue !== "number" &&
    typeof parameterValue !== "boolean"
  ) {
    return [];
  }

  if (typeof parameterValue === "number" && !Number.isFinite(parameterValue)) {
    return [];
  }

  return [
    {
      id: candidate.id,
      label: normalizeShortText(candidate.label, candidate.id),
      kind: PARAMETER_KINDS.includes(candidate.kind as DielineParameter["kind"]) ? (candidate.kind as DielineParameter["kind"]) : "other",
      value: typeof parameterValue === "string" ? parameterValue.slice(0, 120) : parameterValue,
      ...(typeof candidate.unit === "string" && candidate.unit.trim() ? { unit: candidate.unit.trim().slice(0, 24) } : {})
    }
  ];
}

function createFallbackFaceTree(faces: DielineFace[], creases: DielineCrease[]): DielineFaceNode[] {
  const root = [...faces].sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)[0];
  if (!root) {
    return [];
  }

  const visited = new Set<string>();
  const buildNode = (faceId: string, creaseId: string | null): DielineFaceNode => {
    visited.add(faceId);
    const children = creases
      .filter((crease) => crease.faceA === faceId || crease.faceB === faceId)
      .map((crease) => ({
        crease,
        childFaceId: crease.faceA === faceId ? crease.faceB : crease.faceA
      }))
      .filter(({ childFaceId }) => !visited.has(childFaceId))
      .map(({ childFaceId, crease }) => buildNode(childFaceId, crease.id));

    return { faceId, creaseId, children };
  };

  const roots = [buildNode(root.id, null)];

  for (const face of faces) {
    if (!visited.has(face.id)) {
      roots.push(buildNode(face.id, null));
    }
  }

  return roots;
}

function normalizePoint(value: unknown): Point[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const candidate = value as Partial<Point>;
  const x = Number(candidate.x);
  const y = Number(candidate.y);

  return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : fallback;
}

function normalizeShortText(value: unknown, fallback: string): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  return (candidate || fallback).slice(0, 120);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item === "string" && ID_PATTERN.test(item) && !seen.has(item)) {
      ids.push(item);
      seen.add(item);
    }
  }

  return ids;
}
