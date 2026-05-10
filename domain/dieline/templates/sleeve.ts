/**
 * Sleeve / Open-End Box — No tuck flaps, open at both ends.
 * Used for product sleeves, multi-packs, and packaging that slides over a product.
 *
 * Simple layout: glue | left | front | right | back
 * No top/bottom flaps at all.
 */

import { createDielineFace, createExteriorCutPaths } from "../geometry";
import type { DielineCrease, DielineFaceNode, DielineGraph, Point } from "../types";

const RIGHT_ANGLE = Math.PI / 2;
const GLUE_TAB_WIDTH = 15;

export function generateSleeve(dims: {
  width: number;
  height: number;
  depth: number;
}): DielineGraph {
  const { width: W, height: H, depth: D } = dims;
  const glueW = GLUE_TAB_WIDTH;

  const col0 = 0;
  const col1 = glueW;
  const col2 = col1 + D;
  const col3 = col2 + W;
  const col4 = col3 + D;
  const col5 = col4 + W;

  const faces = [
    rect("front", col2, 0, W, H, "panel", "Front"),
    rect("back", col4, 0, W, H, "panel", "Back"),
    rect("left", col1, 0, D, H, "panel", "Left"),
    rect("right", col3, 0, D, H, "panel", "Right"),
    rect("glue-tab", col0, 0, glueW, H, "glue", "Glue tab"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-glue-left", "glue-tab", "left", { x: col1, y: 0 }, { x: col1, y: H }),
    crease("cr-left-front", "left", "front", { x: col2, y: 0 }, { x: col2, y: H }),
    crease("cr-front-right", "front", "right", { x: col3, y: 0 }, { x: col3, y: H }),
    crease("cr-right-back", "right", "back", { x: col4, y: 0 }, { x: col4, y: H }),
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
          ],
        },
        {
          faceId: "right",
          creaseId: "cr-front-right",
          children: [
            { faceId: "back", creaseId: "cr-right-back", children: [] },
          ],
        },
      ],
    },
  ];

  return {
    size: { width: col5, height: H },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    source: { type: "template", templateId: "sleeve" },
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
