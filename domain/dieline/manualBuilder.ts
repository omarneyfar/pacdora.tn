/**
 * manualBuilder.ts — Pure functions for building a DielineGraph interactively.
 *
 * Instead of a full CAD editor, this is a "panel assembly" approach:
 *  - Start with a root rectangle
 *  - Attach new panels to edges of existing panels
 *  - Each attachment creates a crease
 *  - Supports rectangles and trapezoids (flaps)
 */

import { createDielineFace, createExteriorCutPaths, getPolygonBounds } from "./geometry";
import type {
  DielineCrease,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  Point,
} from "./types";

/* ── Types ────────────────────────────────────────────────────── */

export type EdgeSide = "top" | "right" | "bottom" | "left";

export type AddPanelOptions = {
  /** ID of the parent face to attach to */
  parentFaceId: string;
  /** Which edge of the parent to attach to */
  edge: EdgeSide;
  /** Width of the new panel (along the attachment edge) */
  width: number;
  /** Height/depth of the new panel (perpendicular to the attachment edge) */
  height: number;
  /** Label for the new face */
  label?: string;
  /** Face role */
  role?: DielineFace["role"];
  /** Whether artwork can be assigned */
  artworkEnabled?: boolean;
  /** If true, creates a trapezoidal flap instead of a rectangle */
  isTrapezoid?: boolean;
  /** For trapezoids: how much narrower the far edge is (0..1, 0 = full rectangle) */
  trapezoidTaper?: number;
};

/* ── Create root panel ────────────────────────────────────────── */

/**
 * Create a new DielineGraph with a single root panel.
 */
export function createRootPanel(
  width: number,
  height: number,
  label = "Main panel",
): DielineGraph {
  const faceId = "panel-1";
  const face = createDielineFace({
    id: faceId,
    label,
    vertices: [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ],
    role: "panel",
    artworkEnabled: true,
  });

  return {
    size: { width, height },
    faces: [face],
    creases: [],
    cutPaths: createExteriorCutPaths([face]),
    faceTree: [{ faceId, creaseId: null, children: [] }],
    source: { type: "svg-upload" },
  };
}

/* ── Add a panel to an edge ───────────────────────────────────── */

/**
 * Add a new panel attached to an edge of an existing face.
 * Returns a new DielineGraph (immutable update).
 */
export function addPanel(
  graph: DielineGraph,
  options: AddPanelOptions,
): DielineGraph {
  const parentFace = graph.faces.find((f) => f.id === options.parentFaceId);
  if (!parentFace) return graph;

  const newFaceId = generateFaceId(graph);
  const creaseId = `crease-${options.parentFaceId}-${newFaceId}`;

  // Compute the attachment edge from the parent's bounds
  const pb = parentFace.bounds;
  const edgeStart = getEdgeStart(pb, options.edge);
  const edgeEnd = getEdgeEnd(pb, options.edge);

  // Compute the new face vertices
  const edgeLength = Math.sqrt(
    Math.pow(edgeEnd.x - edgeStart.x, 2) + Math.pow(edgeEnd.y - edgeStart.y, 2),
  );
  const panelWidth = options.width || edgeLength;
  const panelHeight = options.height;

  const vertices = computeNewPanelVertices(
    edgeStart,
    edgeEnd,
    options.edge,
    panelWidth,
    panelHeight,
    options.isTrapezoid ?? false,
    options.trapezoidTaper ?? 0.3,
  );

  const newFace = createDielineFace({
    id: newFaceId,
    label: options.label || `Panel ${graph.faces.length + 1}`,
    vertices,
    role: options.role ?? "panel",
    artworkEnabled: options.artworkEnabled ?? true,
  });

  const crease: DielineCrease = {
    id: creaseId,
    faceA: options.parentFaceId,
    faceB: newFaceId,
    edgeStart,
    edgeEnd,
    foldAngle: Math.PI / 2,
    direction: 1,
  };

  // Update face tree
  const newFaceTree = addToFaceTree(
    graph.faceTree,
    options.parentFaceId,
    newFaceId,
    creaseId,
  );

  const allFaces = [...graph.faces, newFace];
  const allCreases = [...graph.creases, crease];

  // Recompute total bounds
  const allVertices = allFaces.flatMap((f) => f.vertices);
  const bounds = getPolygonBounds(allVertices);

  return {
    size: { width: bounds.x + bounds.width, height: bounds.y + bounds.height },
    faces: allFaces,
    creases: allCreases,
    cutPaths: createExteriorCutPaths(allFaces),
    faceTree: newFaceTree,
    source: { type: "svg-upload" },
  };
}

/* ── Remove a panel ───────────────────────────────────────────── */

/**
 * Remove a face and all its descendants from the graph.
 * Cannot remove the root face.
 */
export function removePanel(graph: DielineGraph, faceId: string): DielineGraph {
  // Find all descendant face IDs
  const toRemove = new Set<string>();
  collectDescendants(graph.faceTree, faceId, toRemove);

  if (toRemove.size === 0) return graph;

  // Check we're not removing the root
  const roots = graph.faceTree.map((n) => n.faceId);
  if (roots.includes(faceId)) return graph;

  toRemove.add(faceId);

  const faces = graph.faces.filter((f) => !toRemove.has(f.id));
  const creases = graph.creases.filter(
    (c) => !toRemove.has(c.faceA) && !toRemove.has(c.faceB),
  );
  const faceTree = removeFaceFromTree(graph.faceTree, faceId);

  const allVertices = faces.flatMap((f) => f.vertices);
  const bounds = getPolygonBounds(allVertices);

  return {
    size: { width: bounds.x + bounds.width, height: bounds.y + bounds.height },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    source: graph.source,
  };
}

/* ── Update a face ────────────────────────────────────────────── */

export function updateFace(
  graph: DielineGraph,
  faceId: string,
  patch: Partial<Pick<DielineFace, "label" | "role" | "artworkEnabled">>,
): DielineGraph {
  return {
    ...graph,
    faces: graph.faces.map((f) => (f.id === faceId ? { ...f, ...patch } : f)),
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */

function generateFaceId(graph: DielineGraph): string {
  const existing = new Set(graph.faces.map((f) => f.id));
  let counter = graph.faces.length + 1;
  let id = `panel-${counter}`;
  while (existing.has(id)) {
    counter += 1;
    id = `panel-${counter}`;
  }
  return id;
}

function getEdgeStart(
  bounds: { x: number; y: number; width: number; height: number },
  edge: EdgeSide,
): Point {
  switch (edge) {
    case "top":
      return { x: bounds.x, y: bounds.y };
    case "right":
      return { x: bounds.x + bounds.width, y: bounds.y };
    case "bottom":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case "left":
      return { x: bounds.x, y: bounds.y + bounds.height };
  }
}

function getEdgeEnd(
  bounds: { x: number; y: number; width: number; height: number },
  edge: EdgeSide,
): Point {
  switch (edge) {
    case "top":
      return { x: bounds.x + bounds.width, y: bounds.y };
    case "right":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
    case "bottom":
      return { x: bounds.x, y: bounds.y + bounds.height };
    case "left":
      return { x: bounds.x, y: bounds.y };
  }
}

function computeNewPanelVertices(
  edgeStart: Point,
  edgeEnd: Point,
  side: EdgeSide,
  width: number,
  height: number,
  isTrapezoid: boolean,
  taper: number,
): Point[] {
  // Direction: the new panel grows "outward" from the parent edge
  const taperOffset = isTrapezoid ? (width * taper) / 2 : 0;

  switch (side) {
    case "top": {
      // Panel grows upward (y decreases)
      const y0 = edgeStart.y;
      const y1 = y0 - height;
      return [
        edgeStart,
        edgeEnd,
        { x: edgeEnd.x - taperOffset, y: y1 },
        { x: edgeStart.x + taperOffset, y: y1 },
      ];
    }
    case "bottom": {
      // Panel grows downward (y increases)
      const y0 = edgeStart.y;
      const y1 = y0 + height;
      return [
        edgeStart,
        edgeEnd,
        { x: edgeEnd.x + taperOffset, y: y1 },
        { x: edgeStart.x - taperOffset, y: y1 },
      ];
    }
    case "left": {
      // Panel grows leftward (x decreases)
      const x0 = edgeStart.x;
      const x1 = x0 - height;
      return [
        edgeStart,
        edgeEnd,
        { x: x1, y: edgeEnd.y + taperOffset },
        { x: x1, y: edgeStart.y - taperOffset },
      ];
    }
    case "right": {
      // Panel grows rightward (x increases)
      const x0 = edgeStart.x;
      const x1 = x0 + height;
      return [
        edgeStart,
        edgeEnd,
        { x: x1, y: edgeEnd.y - taperOffset },
        { x: x1, y: edgeStart.y + taperOffset },
      ];
    }
  }
}

function addToFaceTree(
  tree: DielineFaceNode[],
  parentFaceId: string,
  childFaceId: string,
  creaseId: string,
): DielineFaceNode[] {
  return tree.map((node) => {
    if (node.faceId === parentFaceId) {
      return {
        ...node,
        children: [
          ...node.children,
          { faceId: childFaceId, creaseId, children: [] },
        ],
      };
    }

    if (node.children.length > 0) {
      return {
        ...node,
        children: addToFaceTree(node.children, parentFaceId, childFaceId, creaseId),
      };
    }

    return node;
  });
}

function collectDescendants(
  tree: DielineFaceNode[],
  faceId: string,
  result: Set<string>,
): void {
  for (const node of tree) {
    if (node.faceId === faceId) {
      for (const child of node.children) {
        result.add(child.faceId);
        collectDescendants([child], child.faceId, result);
      }
      return;
    }
    collectDescendants(node.children, faceId, result);
  }
}

function removeFaceFromTree(
  tree: DielineFaceNode[],
  faceId: string,
): DielineFaceNode[] {
  return tree
    .filter((node) => node.faceId !== faceId)
    .map((node) => ({
      ...node,
      children: removeFaceFromTree(node.children, faceId),
    }));
}
