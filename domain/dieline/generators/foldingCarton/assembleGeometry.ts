import { createExteriorCutPaths } from "../../geometry";
import type { DielineCrease, DielineCutPath, DielineFace, GeometryPrimitive } from "../../types";

/**
 * Assemble all geometry primitives for a folding carton graph.
 *
 * Layer assignment:
 * - Exterior cut paths → layer "cut"
 * - Structural crease edges → layer "crease"
 * - Internal score lines → layer "crease" (from closures, NOT structural)
 * - Face labels → layer "label"
 */
export function assembleGeometryPrimitives(
  faces: DielineFace[],
  creases: DielineCrease[],
  scoreLines: GeometryPrimitive[],
): { cutPaths: DielineCutPath[]; geometry: GeometryPrimitive[] } {
  const cutPaths = createExteriorCutPaths(faces);

  const geometry: GeometryPrimitive[] = [
    // Cut paths as polylines
    ...cutPaths.flatMap((path, index) =>
      path.points && path.points.length >= 2
        ? [{ id: path.id || `cut-${index + 1}`, layer: "cut" as const, type: "polyline" as const, points: path.points }]
        : [],
    ),
    // Structural crease lines (visual representation of hinges)
    ...creases.map((crease): GeometryPrimitive => ({
      id: crease.id,
      layer: "crease",
      type: "line",
      start: crease.edgeStart,
      end: crease.edgeEnd,
    })),
    // Internal score lines from closures (lip bends, etc.)
    ...scoreLines,
    // Face labels
    ...faces.map((face): GeometryPrimitive => ({
      id: `label-${face.id}`,
      layer: "label",
      type: "label",
      position: face.centroid,
      text: face.label,
    })),
  ];

  return { cutPaths, geometry };
}
