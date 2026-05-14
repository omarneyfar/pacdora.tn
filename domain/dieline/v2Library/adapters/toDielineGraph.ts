import { createDielineFace, createExteriorCutPaths, getGraphBounds } from "../../geometry";
import type {
  DielineCrease,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  DielineLayer,
  DielinePartRole,
  GeometryPrimitive,
} from "../../types";
import type { V2Face, V2GeometryLayer, V2GeometryPrimitive, V2StructuralCrease } from "../contracts/types";
import type { V2AssemblyPartMetadata, V2TemplateAssembly } from "../assembly/types";

export function toDielineGraph(assembly: V2TemplateAssembly): DielineGraph {
  const idMap = createIdMap(assembly);
  const faces = assembly.faces.map((face) => toDielineFace(face, idMap));
  const creases = assembly.structuralCreases.map((crease) => toDielineCrease(crease, idMap));
  const cutPaths = createExteriorCutPaths(faces);
  const bounds = getGraphBounds({ faces });
  const faceTree = buildFaceTree(faces, creases, idMap.get(assembly.rootFaceId ?? "") ?? undefined);
  const geometry: GeometryPrimitive[] = [
    ...cutPaths.flatMap((path, index): GeometryPrimitive[] =>
      path.points && path.points.length >= 2
        ? [{ id: path.id || `cut-${index + 1}`, layer: "cut", type: "polyline", points: path.points }]
        : [],
    ),
    ...creases.map((crease): GeometryPrimitive => ({
      id: `${crease.id}-line`,
      layer: "crease",
      type: "line",
      start: crease.edgeStart,
      end: crease.edgeEnd,
    })),
    ...assembly.geometryPrimitives.map((primitive) => toGeometryPrimitive(primitive, idMap)),
    ...faces.map((face): GeometryPrimitive => ({
      id: `label-${face.id}`,
      layer: "label",
      type: "label",
      position: face.centroid,
      text: face.label,
    })),
  ];

  return {
    size: { width: bounds.width, height: bounds.height },
    faces,
    creases,
    cutPaths,
    faceTree,
    geometry,
    metadata: {
      category: "folding-box",
      family: "v2Library-template-assembly",
      familyLabel: assembly.label,
      parts: assembly.parts.map((part) => toDielinePart(part, idMap)),
      parameterValues: {
        ...assembly.parameters,
        generatorVersion: "v2Library-template-assembly",
      },
      catalog: {
        templateId: assembly.id,
        templateSlug: assembly.id,
        templateCatalogVersion: "v2-hidden-template-assembly",
        generatorId: "v2Library/template-assembly",
        status: "hidden-v2-template-assembly",
        requiresManualVerification: true,
        productionReady: false,
        source: {
          source: assembly.source,
          partCount: assembly.parts.length,
          contractIds: assembly.parts.map((part) => part.contractId),
        },
        warnings: assembly.warnings,
      },
    },
    source: {
      type: "template",
      templateId: `v2Library/template-assembly/${assembly.id}`,
    },
  };
}

function toDielineFace(face: V2Face, idMap: Map<string, string>): DielineFace {
  return createDielineFace({
    id: mappedId(idMap, face.id),
    label: face.label,
    vertices: face.points,
    role: face.role === "body" ? "panel" : face.role === "glue" ? "glue" : face.role === "guide" ? "unknown" : "flap",
    artworkEnabled: face.printable,
  });
}

function toDielineCrease(crease: V2StructuralCrease, idMap: Map<string, string>): DielineCrease {
  const foldAngleDegrees = crease.foldAngleDegrees ?? 90;
  const inward = crease.foldDirection === "inward" || crease.foldDirection === "valley" || !crease.foldDirection;

  return {
    id: mappedId(idMap, crease.id),
    faceA: mappedId(idMap, crease.faceA),
    faceB: mappedId(idMap, crease.faceB),
    edgeStart: crease.start,
    edgeEnd: crease.end,
    foldAngle: (foldAngleDegrees * Math.PI) / 180,
    direction: inward ? 1 : -1,
    foldSemantic: inward ? "valley" : "mountain",
  };
}

function toGeometryPrimitive(primitive: V2GeometryPrimitive, idMap: Map<string, string>): GeometryPrimitive {
  const id = mappedId(idMap, primitive.id);
  const layer = mapLayer(primitive.layer);
  switch (primitive.type) {
    case "line":
      return { id, layer, type: "line", start: primitive.start, end: primitive.end };
    case "circle":
      return { id, layer, type: "circle", center: primitive.center, radius: primitive.radius };
    case "polyline":
    case "polygon":
      return { id, layer, type: primitive.type, points: primitive.points };
    case "rounded-rect":
    case "slot":
    case "euro-slot":
      return {
        id,
        layer,
        type: primitive.type === "euro-slot" ? "slot" : primitive.type,
        x: primitive.x,
        y: primitive.y,
        width: primitive.width,
        height: primitive.height,
        radius: primitive.radius,
      };
  }
}

function mapLayer(layer: V2GeometryLayer): DielineLayer {
  if (layer === "score") return "crease";
  if (layer === "perforation") return "perf";
  if (layer === "safe-area" || layer === "guide" || layer === "glue" || layer === "no-print" || layer === "film") return "safe";
  return layer;
}

function toDielinePart(part: V2AssemblyPartMetadata, idMap: Map<string, string>) {
  return {
    id: mappedId(idMap, part.id),
    label: part.label,
    role: mapPartRole(part),
    faceIds: part.faceIds.map((faceId) => mappedId(idMap, faceId)),
    creaseIds: part.creaseIds.map((creaseId) => mappedId(idMap, creaseId)),
  };
}

function mapPartRole(part: V2AssemblyPartMetadata): DielinePartRole {
  if (part.contractId.includes("Body")) return "body";
  if (part.contractId.includes("Glue")) return "glue-flap";
  if (part.contractId.includes("Dust")) return "dust-flap";
  if (part.contractId.includes("Tuck")) return "tuck-flap";
  if (part.contractId.includes("bottom") || part.contractId.includes("Bottom")) return "bottom-flap";
  if (part.contractId.includes("lock") || part.contractId.includes("Lock")) return "lock";
  return "unknown";
}

function buildFaceTree(faces: DielineFace[], creases: DielineCrease[], requestedRoot?: string): DielineFaceNode[] {
  const faceIds = new Set(faces.map((face) => face.id));
  const root = requestedRoot && faceIds.has(requestedRoot)
    ? requestedRoot
    : [...faces].sort((a, b) => b.bounds.width * b.bounds.height - a.bounds.width * a.bounds.height)[0]?.id;
  if (!root) return [];

  const adjacency = new Map<string, Array<{ faceId: string; creaseId: string }>>();
  for (const crease of creases) {
    addEdge(adjacency, crease.faceA, crease.faceB, crease.id);
    addEdge(adjacency, crease.faceB, crease.faceA, crease.id);
  }

  const visited = new Set<string>();
  const buildNode = (faceId: string, creaseId: string | null): DielineFaceNode => {
    visited.add(faceId);
    return {
      faceId,
      creaseId,
      children: (adjacency.get(faceId) ?? [])
        .filter((edge) => !visited.has(edge.faceId))
        .map((edge) => buildNode(edge.faceId, edge.creaseId)),
    };
  };

  return [buildNode(root, null)];
}

function addEdge(adjacency: Map<string, Array<{ faceId: string; creaseId: string }>>, faceA: string, faceB: string, creaseId: string): void {
  adjacency.set(faceA, [...(adjacency.get(faceA) ?? []), { faceId: faceB, creaseId }]);
}

function createIdMap(assembly: V2TemplateAssembly): Map<string, string> {
  const rawIds = [
    assembly.id,
    ...assembly.parts.map((part) => part.id),
    ...assembly.faces.map((face) => face.id),
    ...assembly.structuralCreases.map((crease) => crease.id),
    ...assembly.geometryPrimitives.map((primitive) => primitive.id),
  ];
  const used = new Set<string>();
  const map = new Map<string, string>();

  for (const id of rawIds) {
    map.set(id, uniqueSanitizedId(id, used));
  }
  return map;
}

function mappedId(idMap: Map<string, string>, id: string): string {
  return idMap.get(id) ?? sanitizeId(id);
}

function uniqueSanitizedId(id: string, used: Set<string>): string {
  const base = sanitizeId(id);
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function sanitizeId(id: string): string {
  const sanitized = id.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "v2-id";
}
