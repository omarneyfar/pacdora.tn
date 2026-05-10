/**
 * Full Seal End (FSE) — Both ends are sealed/glued shut.
 * Used for cereal boxes, tea boxes, and products that need tamper evidence.
 *
 * Similar to STE but with full closure panels instead of tuck flaps.
 */

import { createDielineFace, createExteriorCutPaths } from "../geometry";
import type { DielineCrease, DielineFaceNode, DielineGraph, Point } from "../types";

const RIGHT_ANGLE = Math.PI / 2;
const FLAP_RATIO = 0.5;
const GLUE_TAB_WIDTH = 15;

export function generateFullSealEnd(dims: {
  width: number;
  height: number;
  depth: number;
}): DielineGraph {
  const { width: W, height: H, depth: D } = dims;
  const flapH = D * FLAP_RATIO;
  const glueW = GLUE_TAB_WIDTH;

  const col0 = 0;
  const col1 = glueW;
  const col2 = col1 + D;
  const col3 = col2 + W;
  const col4 = col3 + D;
  const col5 = col4 + W;

  const row0 = 0;           // top seal panels
  const row1 = flapH;       // panels start
  const row2 = row1 + H;    // panels end
  const row3 = row2 + flapH; // bottom seal panels end

  const faces = [
    rect("front", col2, row1, W, H, "panel", "Front"),
    rect("back", col4, row1, W, H, "panel", "Back"),
    rect("left", col1, row1, D, H, "panel", "Left"),
    rect("right", col3, row1, D, H, "panel", "Right"),
    rect("glue-tab", col0, row1, glueW, H, "glue", "Glue tab"),

    // Top seal flaps (all four sides)
    rect("top-front", col2, row0, W, flapH, "flap", "Top seal (front)"),
    rect("top-back", col4, row0, W, flapH, "flap", "Top seal (back)"),
    rect("top-left", col1, row0, D, flapH, "flap", "Top seal (left)"),
    rect("top-right", col3, row0, D, flapH, "flap", "Top seal (right)"),

    // Bottom seal flaps
    rect("bottom-front", col2, row2, W, flapH, "flap", "Bottom seal (front)"),
    rect("bottom-back", col4, row2, W, flapH, "flap", "Bottom seal (back)"),
    rect("bottom-left", col1, row2, D, flapH, "flap", "Bottom seal (left)"),
    rect("bottom-right", col3, row2, D, flapH, "flap", "Bottom seal (right)"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-glue-left", "glue-tab", "left", { x: col1, y: row1 }, { x: col1, y: row2 }),
    crease("cr-left-front", "left", "front", { x: col2, y: row1 }, { x: col2, y: row2 }),
    crease("cr-front-right", "front", "right", { x: col3, y: row1 }, { x: col3, y: row2 }),
    crease("cr-right-back", "right", "back", { x: col4, y: row1 }, { x: col4, y: row2 }),

    crease("cr-front-topf", "front", "top-front", { x: col2, y: row1 }, { x: col3, y: row1 }),
    crease("cr-back-topb", "back", "top-back", { x: col4, y: row1 }, { x: col5, y: row1 }),
    crease("cr-left-topl", "left", "top-left", { x: col1, y: row1 }, { x: col2, y: row1 }),
    crease("cr-right-topr", "right", "top-right", { x: col3, y: row1 }, { x: col4, y: row1 }),

    crease("cr-front-botf", "front", "bottom-front", { x: col2, y: row2 }, { x: col3, y: row2 }),
    crease("cr-back-botb", "back", "bottom-back", { x: col4, y: row2 }, { x: col5, y: row2 }),
    crease("cr-left-botl", "left", "bottom-left", { x: col1, y: row2 }, { x: col2, y: row2 }),
    crease("cr-right-botr", "right", "bottom-right", { x: col3, y: row2 }, { x: col4, y: row2 }),
  ];

  const faceTree: DielineFaceNode[] = [
    {
      faceId: "front",
      creaseId: null,
      children: [
        {
          faceId: "left",
          creaseId: "cr-left-front",
          children: [
            { faceId: "glue-tab", creaseId: "cr-glue-left", children: [] },
            { faceId: "top-left", creaseId: "cr-left-topl", children: [] },
            { faceId: "bottom-left", creaseId: "cr-left-botl", children: [] },
          ],
        },
        {
          faceId: "right",
          creaseId: "cr-front-right",
          children: [
            {
              faceId: "back",
              creaseId: "cr-right-back",
              children: [
                { faceId: "top-back", creaseId: "cr-back-topb", children: [] },
                { faceId: "bottom-back", creaseId: "cr-back-botb", children: [] },
              ],
            },
            { faceId: "top-right", creaseId: "cr-right-topr", children: [] },
            { faceId: "bottom-right", creaseId: "cr-right-botr", children: [] },
          ],
        },
        { faceId: "top-front", creaseId: "cr-front-topf", children: [] },
        { faceId: "bottom-front", creaseId: "cr-front-botf", children: [] },
      ],
    },
  ];

  return {
    size: { width: col5, height: row3 },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    source: { type: "template", templateId: "full-seal-end" },
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
