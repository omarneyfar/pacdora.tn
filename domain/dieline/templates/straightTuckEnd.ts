/**
 * Straight Tuck End (STE) — The most common folding carton.
 *
 * Structure (flat layout):
 *   Top tuck flap
 *   ┌───────────┐
 *   │   Back    │
 *   ├───────────┤
 *   │   Left    │ → │ Top │ → │ Right │ → │ Bottom │
 *   ├───────────┤
 *   │   Front   │
 *   ├───────────┤
 *   │ Dust flap │
 *   └───────────┘
 *   + glue tab on left side
 *   + top/bottom tuck flaps
 *   + dust flaps (small flaps inside the tuck)
 *
 * Both top and bottom flaps tuck in the SAME direction.
 */

import { createDielineFace, createExteriorCutPaths } from "../geometry";
import type { DielineCrease, DielineFaceNode, DielineGraph, Point } from "../types";

const RIGHT_ANGLE = Math.PI / 2;
const FLAP_RATIO = 0.5;    // dust flap height = 50% of depth
const TUCK_RATIO = 0.78;   // tuck flap height = 78% of depth
const GLUE_TAB_WIDTH = 15; // mm

export function generateStraightTuckEnd(dims: {
  width: number;
  height: number;
  depth: number;
}): DielineGraph {
  const { width: W, height: H, depth: D } = dims;
  const flapH = D * FLAP_RATIO;
  const tuckH = D * TUCK_RATIO;
  const glueW = GLUE_TAB_WIDTH;

  // Layout: columns left→right: glue | left | front | right | back
  //         rows: top tuck | top dust | top | panels | bottom | bottom dust | bottom tuck

  const col0 = 0;            // glue tab start
  const col1 = glueW;        // left panel start
  const col2 = col1 + D;     // front panel start
  const col3 = col2 + W;     // right panel start
  const col4 = col3 + D;     // back panel start
  const col5 = col4 + W;     // end

  const row1 = tuckH;           // top dust flap top
  const row2 = row1 + flapH;    // top of panels
  const row3 = row2 + H;        // bottom of panels
  const row5 = row3 + Math.max(flapH, tuckH); // bottom closure band

  const faces = [
    // Main panels
    rect("front", col2, row2, W, H, "panel", "Front"),
    rect("back", col4, row2, W, H, "panel", "Back"),
    rect("left", col1, row2, D, H, "panel", "Left"),
    rect("right", col3, row2, D, H, "panel", "Right"),

    // Glue tab
    rect("glue-tab", col0, row2, glueW, H, "glue", "Glue tab"),

    // Top flaps (dust flaps on left and right)
    rect("top-dust-left", col1, row1, D, flapH, "flap", "Top dust flap (L)"),
    rect("top-dust-right", col3, row1, D, flapH, "flap", "Top dust flap (R)"),
    // Top tuck flap on front
    trapezoid("top-tuck", col2, row2 - tuckH, W, tuckH, 0.15, "top", "flap", "Top tuck flap"),
    // Top panel area (the part that the tuck goes into)
    rect("top-panel", col4, row1, W, flapH, "flap", "Top panel"),

    // Bottom flaps (dust flaps on left and right)
    rect("bottom-dust-left", col1, row3, D, flapH, "flap", "Bottom dust flap (L)"),
    rect("bottom-dust-right", col3, row3, D, flapH, "flap", "Bottom dust flap (R)"),
    // Bottom tuck flap on front
    trapezoid("bottom-tuck", col2, row3, W, tuckH, 0.15, "bottom", "flap", "Bottom tuck flap"),
    // Bottom panel area
    rect("bottom-panel", col4, row3, W, flapH, "flap", "Bottom panel"),
  ];

  const creases: DielineCrease[] = [
    // Panel-to-panel creases (horizontal strip)
    crease("cr-glue-left", "glue-tab", "left", { x: col1, y: row2 }, { x: col1, y: row3 }),
    crease("cr-left-front", "left", "front", { x: col2, y: row2 }, { x: col2, y: row3 }),
    crease("cr-front-right", "front", "right", { x: col3, y: row2 }, { x: col3, y: row3 }),
    crease("cr-right-back", "right", "back", { x: col4, y: row2 }, { x: col4, y: row3 }),

    // Top flap creases
    crease("cr-left-topdust", "left", "top-dust-left", { x: col1, y: row2 }, { x: col2, y: row2 }),
    crease("cr-front-toptuck", "front", "top-tuck", { x: col2, y: row2 }, { x: col3, y: row2 }),
    crease("cr-right-topdust", "right", "top-dust-right", { x: col3, y: row2 }, { x: col4, y: row2 }),
    crease("cr-back-toppanel", "back", "top-panel", { x: col4, y: row2 }, { x: col5, y: row2 }),

    // Bottom flap creases
    crease("cr-left-bottomdust", "left", "bottom-dust-left", { x: col1, y: row3 }, { x: col2, y: row3 }),
    crease("cr-front-bottomtuck", "front", "bottom-tuck", { x: col2, y: row3 }, { x: col3, y: row3 }),
    crease("cr-right-bottomdust", "right", "bottom-dust-right", { x: col3, y: row3 }, { x: col4, y: row3 }),
    crease("cr-back-bottompanel", "back", "bottom-panel", { x: col4, y: row3 }, { x: col5, y: row3 }),
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
            { faceId: "top-dust-left", creaseId: "cr-left-topdust", children: [] },
            { faceId: "bottom-dust-left", creaseId: "cr-left-bottomdust", children: [] },
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
                { faceId: "top-panel", creaseId: "cr-back-toppanel", children: [] },
                { faceId: "bottom-panel", creaseId: "cr-back-bottompanel", children: [] },
              ],
            },
            { faceId: "top-dust-right", creaseId: "cr-right-topdust", children: [] },
            { faceId: "bottom-dust-right", creaseId: "cr-right-bottomdust", children: [] },
          ],
        },
        { faceId: "top-tuck", creaseId: "cr-front-toptuck", children: [] },
        { faceId: "bottom-tuck", creaseId: "cr-front-bottomtuck", children: [] },
      ],
    },
  ];

  return {
    size: { width: col5, height: row5 },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    source: { type: "template", templateId: "straight-tuck-end" },
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */

function rect(
  id: string, x: number, y: number, w: number, h: number,
  role: "panel" | "flap" | "glue", label: string,
) {
  return createDielineFace({
    id, label,
    vertices: [
      { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
    ],
    role,
    artworkEnabled: role === "panel",
  });
}

function trapezoid(
  id: string, x: number, y: number, w: number, h: number,
  taper: number, direction: "top" | "bottom",
  role: "panel" | "flap" | "glue", label: string,
) {
  const inset = w * taper / 2;
  const verts = direction === "top"
    ? [
        { x, y: y + h }, { x: x + w, y: y + h },
        { x: x + w - inset, y }, { x: x + inset, y },
      ]
    : [
        { x, y }, { x: x + w, y },
        { x: x + w - inset, y: y + h }, { x: x + inset, y: y + h },
      ];

  return createDielineFace({
    id, label, vertices: verts, role, artworkEnabled: false,
  });
}

function crease(
  id: string, faceA: string, faceB: string,
  edgeStart: Point, edgeEnd: Point,
): DielineCrease {
  return { id, faceA, faceB, edgeStart, edgeEnd, foldAngle: RIGHT_ANGLE, direction: 1 };
}
