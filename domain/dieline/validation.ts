import { createDielineFace, createExteriorCutPaths, getGraphBounds, pointsToPath } from "./geometry";
import type { DielineCrease, DielineCutPath, DielineFace, DielineFaceNode, DielineGraph, Point } from "./types";

const MAX_FACES = 80;
const MAX_VERTICES_PER_FACE = 120;
const MAX_PATH_LENGTH = 12000;
const MAX_SOURCE_SVG_LENGTH = 700_000;
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

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
  const cutPaths = Array.isArray(candidate.cutPaths)
    ? candidate.cutPaths.flatMap((cutPath, index) => normalizeCutPath(cutPath, index))
    : createExteriorCutPaths(faces);
  const faceTree = normalizeFaceTree(candidate.faceTree, faceIds, creases);
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
