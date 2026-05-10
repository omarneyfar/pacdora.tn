/**
 * Tray with Lid — Open tray with a hinged lid panel.
 *
 * Used for bakery, display, and gift packaging.
 * Low profile with all sides folding up from a flat base.
 */

import { createDielineFace, createExteriorCutPaths } from "../geometry";
import { createDimensionParameters, createTemplateMetadata } from "../structure";
import type { DielineCrease, DielineFaceNode, DielineGraph, Point } from "../types";

const RIGHT_ANGLE = Math.PI / 2;

export function generateTrayWithLid(dims: {
  width: number;
  height: number;
  depth: number;
}): DielineGraph {
  const { width: W, height: H, depth: D } = dims;

  // Layout: base is center, walls fold up, lid extends from back wall
  // The "depth" here is the wall height (tray is shallow)
  const wallH = D;

  const col0 = wallH;        // left wall left edge
  const col1 = col0 + W;     // right wall left edge
  const row0 = wallH;        // top wall top edge
  const row1 = row0 + H;     // base bottom edge
  const row2 = row1 + wallH; // bottom wall bottom
  const row3 = row2 + W;     // lid bottom (extends from bottom)

  const faces = [
    rect("base", col0, row0, W, H, "panel", "Base"),
    rect("wall-top", col0, 0, W, wallH, "panel", "Top wall"),
    rect("wall-bottom", col0, row1, W, wallH, "panel", "Bottom wall"),
    rect("wall-left", 0, row0, wallH, H, "panel", "Left wall"),
    rect("wall-right", col1, row0, wallH, H, "panel", "Right wall"),
    rect("lid", col0, row2, W, W, "panel", "Lid"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-base-top", "base", "wall-top", { x: col0, y: row0 }, { x: col1, y: row0 }),
    crease("cr-base-bottom", "base", "wall-bottom", { x: col0, y: row1 }, { x: col1, y: row1 }),
    crease("cr-base-left", "base", "wall-left", { x: col0, y: row0 }, { x: col0, y: row1 }),
    crease("cr-base-right", "base", "wall-right", { x: col1, y: row0 }, { x: col1, y: row1 }),
    crease("cr-bottom-lid", "wall-bottom", "lid", { x: col0, y: row2 }, { x: col1, y: row2 }),
  ];

  const faceTree: DielineFaceNode[] = [
    {
      faceId: "base",
      creaseId: null,
      children: [
        { faceId: "wall-top", creaseId: "cr-base-top", children: [] },
        {
          faceId: "wall-bottom",
          creaseId: "cr-base-bottom",
          children: [
            { faceId: "lid", creaseId: "cr-bottom-lid", children: [] },
          ],
        },
        { faceId: "wall-left", creaseId: "cr-base-left", children: [] },
        { faceId: "wall-right", creaseId: "cr-base-right", children: [] },
      ],
    },
  ];

  return {
    size: { width: col1 + wallH, height: row3 },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    metadata: createTemplateMetadata({
      category: "tray-and-cover",
      family: "tray-with-lid",
      familyLabel: "Tray with Lid",
      parts: [
        {
          id: "base",
          label: "Tray base",
          role: "base",
          faceIds: ["base"],
          creaseIds: ["cr-base-top", "cr-base-bottom", "cr-base-left", "cr-base-right"],
        },
        {
          id: "walls",
          label: "Tray walls",
          role: "wall",
          faceIds: ["wall-top", "wall-bottom", "wall-left", "wall-right"],
          creaseIds: ["cr-base-top", "cr-base-bottom", "cr-base-left", "cr-base-right"],
        },
        {
          id: "lid",
          label: "Hinged lid",
          role: "lid",
          faceIds: ["lid"],
          creaseIds: ["cr-bottom-lid"],
        },
      ],
      parameters: [
        ...createDimensionParameters(W, H, D),
        { id: "wall-height", label: "Wall height", kind: "dimension", value: wallH, unit: "mm" },
      ],
    }),
    source: { type: "template", templateId: "tray-with-lid" },
  };
}

function rect(
  id: string, x: number, y: number, w: number, h: number,
  role: "panel" | "flap" | "glue", label: string,
) {
  return createDielineFace({
    id, label,
    vertices: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }],
    role, artworkEnabled: role === "panel",
  });
}

function crease(
  id: string, faceA: string, faceB: string,
  edgeStart: Point, edgeEnd: Point,
): DielineCrease {
  return { id, faceA, faceB, edgeStart, edgeEnd, foldAngle: RIGHT_ANGLE, direction: 1 };
}
