import { createDielineFace, createExteriorCutPaths, getGraphBounds } from "../geometry";
import type { DielineCrease, DielineFaceNode, DielineGraph, GeometryPrimitive } from "../types";
import type { ComponentGraphAssemblyInput, ComponentGraphAssemblyResult } from "./types";

export function assembleGraphFromContext(input: ComponentGraphAssemblyInput): ComponentGraphAssemblyResult {
  const cutPaths = createExteriorCutPaths(input.faces);
  const faceTree = buildFaceTree(input);
  const bounds = getGraphBounds({ faces: input.faces });
  const geometry: GeometryPrimitive[] = [
    ...cutPaths.flatMap((path, index) =>
      path.points && path.points.length >= 2
        ? [{ id: path.id || `cut-${index + 1}`, layer: "cut" as const, type: "polyline" as const, points: path.points }]
        : [],
    ),
    ...input.creases.map((crease): GeometryPrimitive => ({
      id: crease.id,
      layer: "crease",
      type: "line",
      start: crease.edgeStart,
      end: crease.edgeEnd,
    })),
    ...input.geometry,
    ...input.faces.map((face): GeometryPrimitive => ({
      id: `label-${face.id}`,
      layer: "label",
      type: "label",
      position: face.centroid,
      text: face.label,
    })),
  ];

  const graph: DielineGraph = {
    size: { width: bounds.width, height: bounds.height },
    faces: input.faces.map((face) =>
      createDielineFace({
        id: face.id,
        label: face.label,
        vertices: face.vertices,
        role: face.role,
        artworkEnabled: face.artworkEnabled,
      }),
    ),
    creases: input.creases,
    cutPaths,
    faceTree,
    geometry,
    metadata: {
      category: input.recipe.category,
      family: input.recipe.family,
      familyLabel: input.recipe.label ?? input.recipe.family,
      parts: input.parts,
      parameterSpecs: input.parameterSpecs,
      parameterValues: {
        ...input.params,
        generatorVersion: "component-engine-v2",
      },
      parameters: input.parameterSpecs.map((spec) => ({
        id: spec.id,
        label: spec.label,
        kind: spec.kind,
        value: input.params[spec.id],
        ...(spec.unit ? { unit: spec.unit } : {}),
      })),
    },
    source: { type: "template", templateId: input.recipe.id },
  };

  return { graph, faceTree };
}

function buildFaceTree(input: ComponentGraphAssemblyInput): DielineFaceNode[] {
  const rootFace = input.recipe.folding.rootFace;
  const faceIds = new Set(input.faces.map((face) => face.id));
  const adjacency = new Map<string, Array<{ faceId: string; creaseId: string }>>();

  const addEdge = (faceA: string, faceB: string, creaseId: string) => {
    if (!faceIds.has(faceA) || !faceIds.has(faceB)) return;
    adjacency.set(faceA, [...(adjacency.get(faceA) ?? []), { faceId: faceB, creaseId }]);
    adjacency.set(faceB, [...(adjacency.get(faceB) ?? []), { faceId: faceA, creaseId }]);
  };

  for (const hint of input.faceTreeHints) {
    addEdge(hint.parentFaceId, hint.childFaceId, hint.creaseId);
  }

  for (const crease of input.creases) {
    if (!hasAdjacency(adjacency, crease)) {
      addEdge(crease.faceA, crease.faceB, crease.id);
    }
  }

  if (!faceIds.has(rootFace)) {
    throw new Error(`Face tree root "${rootFace}" does not exist.`);
  }

  const visited = new Set<string>();
  const buildNode = (faceId: string, creaseId: string | null): DielineFaceNode => {
    visited.add(faceId);
    const children = (adjacency.get(faceId) ?? [])
      .filter((edge) => !visited.has(edge.faceId))
      .map((edge) => buildNode(edge.faceId, edge.creaseId));

    return { faceId, creaseId, children };
  };

  const tree = [buildNode(rootFace, null)];
  const missing = [...faceIds].filter((faceId) => !visited.has(faceId));

  if (missing.length > 0) {
    throw new Error(`Face tree does not include all faces: ${missing.join(", ")}`);
  }

  return tree;
}

function hasAdjacency(adjacency: Map<string, Array<{ faceId: string; creaseId: string }>>, crease: DielineCrease): boolean {
  return Boolean(adjacency.get(crease.faceA)?.some((edge) => edge.faceId === crease.faceB && edge.creaseId === crease.id));
}
