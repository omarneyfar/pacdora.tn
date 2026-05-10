/**
 * Reverse Tuck End (RTE) — Similar to STE but tuck flaps tuck in opposite directions.
 * Very common for retail packaging, cosmetics, and consumer goods.
 *
 * The top flap tucks from the front, bottom flap tucks from the back.
 */

import { createDielineFace, createExteriorCutPaths } from "../geometry";
import { createDimensionParameters, createTemplateMetadata } from "../structure";
import type { DielineCrease, DielineFaceNode, DielineGraph, Point } from "../types";

const RIGHT_ANGLE = Math.PI / 2;
const FLAP_RATIO = 0.5;
const TUCK_RATIO = 0.78;
const GLUE_TAB_WIDTH = 15;

export function generateReverseTuckEnd(dims: {
  width: number;
  height: number;
  depth: number;
}): DielineGraph {
  const { width: W, height: H, depth: D } = dims;
  const flapH = D * FLAP_RATIO;
  const tuckH = D * TUCK_RATIO;
  const glueW = GLUE_TAB_WIDTH;

  const col0 = 0;
  const col1 = glueW;
  const col2 = col1 + D;
  const col3 = col2 + W;
  const col4 = col3 + D;
  const col5 = col4 + W;

  const row1 = tuckH;
  const row2 = row1 + flapH;
  const row3 = row2 + H;
  const row5 = row3 + Math.max(flapH, tuckH);

  const faces = [
    rect("front", col2, row2, W, H, "panel", "Front"),
    rect("back", col4, row2, W, H, "panel", "Back"),
    rect("left", col1, row2, D, H, "panel", "Left"),
    rect("right", col3, row2, D, H, "panel", "Right"),
    rect("glue-tab", col0, row2, glueW, H, "glue", "Glue tab"),

    // Top: tuck on FRONT, dust flaps on sides, panel on BACK
    rect("top-dust-left", col1, row1, D, flapH, "flap", "Top dust flap (L)"),
    rect("top-dust-right", col3, row1, D, flapH, "flap", "Top dust flap (R)"),
    trapezoid("top-tuck", col2, row2 - tuckH, W, tuckH, 0.15, "top", "flap", "Top tuck flap"),
    rect("top-panel", col4, row1, W, flapH, "flap", "Top panel"),

    // Bottom: tuck on BACK (reversed!), dust flaps on sides, panel on FRONT
    rect("bottom-dust-left", col1, row3, D, flapH, "flap", "Bottom dust flap (L)"),
    rect("bottom-dust-right", col3, row3, D, flapH, "flap", "Bottom dust flap (R)"),
    trapezoid("bottom-tuck", col4, row3, W, tuckH, 0.15, "bottom", "flap", "Bottom tuck flap"),
    rect("bottom-panel", col2, row3, W, flapH, "flap", "Bottom panel"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-glue-left", "glue-tab", "left", { x: col1, y: row2 }, { x: col1, y: row3 }),
    crease("cr-left-front", "left", "front", { x: col2, y: row2 }, { x: col2, y: row3 }),
    crease("cr-front-right", "front", "right", { x: col3, y: row2 }, { x: col3, y: row3 }),
    crease("cr-right-back", "right", "back", { x: col4, y: row2 }, { x: col4, y: row3 }),

    crease("cr-left-topdust", "left", "top-dust-left", { x: col1, y: row2 }, { x: col2, y: row2 }),
    crease("cr-front-toptuck", "front", "top-tuck", { x: col2, y: row2 }, { x: col3, y: row2 }),
    crease("cr-right-topdust", "right", "top-dust-right", { x: col3, y: row2 }, { x: col4, y: row2 }),
    crease("cr-back-toppanel", "back", "top-panel", { x: col4, y: row2 }, { x: col5, y: row2 }),

    crease("cr-left-bottomdust", "left", "bottom-dust-left", { x: col1, y: row3 }, { x: col2, y: row3 }),
    crease("cr-front-bottompanel", "front", "bottom-panel", { x: col2, y: row3 }, { x: col3, y: row3 }),
    crease("cr-right-bottomdust", "right", "bottom-dust-right", { x: col3, y: row3 }, { x: col4, y: row3 }),
    crease("cr-back-bottomtuck", "back", "bottom-tuck", { x: col4, y: row3 }, { x: col5, y: row3 }),
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
                { faceId: "bottom-tuck", creaseId: "cr-back-bottomtuck", children: [] },
              ],
            },
            { faceId: "top-dust-right", creaseId: "cr-right-topdust", children: [] },
            { faceId: "bottom-dust-right", creaseId: "cr-right-bottomdust", children: [] },
          ],
        },
        { faceId: "top-tuck", creaseId: "cr-front-toptuck", children: [] },
        { faceId: "bottom-panel", creaseId: "cr-front-bottompanel", children: [] },
      ],
    },
  ];

  return {
    size: { width: col5, height: row5 },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    metadata: createTemplateMetadata({
      category: "folding-box",
      family: "reverse-tuck-end",
      familyLabel: "Reverse Tuck End",
      parts: [
        {
          id: "body-panels",
          label: "Body panels",
          role: "body",
          faceIds: ["front", "back", "left", "right"],
          creaseIds: ["cr-left-front", "cr-front-right", "cr-right-back"],
        },
        {
          id: "top-closure",
          label: "Top closure",
          role: "top-closure",
          faceIds: ["top-tuck", "top-panel", "top-dust-left", "top-dust-right"],
          creaseIds: ["cr-front-toptuck", "cr-back-toppanel", "cr-left-topdust", "cr-right-topdust"],
        },
        {
          id: "bottom-closure",
          label: "Bottom closure",
          role: "bottom-closure",
          faceIds: ["bottom-tuck", "bottom-panel", "bottom-dust-left", "bottom-dust-right"],
          creaseIds: ["cr-back-bottomtuck", "cr-front-bottompanel", "cr-left-bottomdust", "cr-right-bottomdust"],
        },
        {
          id: "glue-tab",
          label: "Glue tab",
          role: "glue-flap",
          faceIds: ["glue-tab"],
          creaseIds: ["cr-glue-left"],
        },
      ],
      parameters: [
        ...createDimensionParameters(W, H, D),
        { id: "dust-flap-depth", label: "Dust flap depth", kind: "closure", value: flapH, unit: "mm" },
        { id: "tuck-flap-depth", label: "Tuck flap depth", kind: "closure", value: tuckH, unit: "mm" },
        { id: "glue-tab-width", label: "Glue tab width", kind: "closure", value: glueW, unit: "mm" },
      ],
    }),
    source: { type: "template", templateId: "reverse-tuck-end" },
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */

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

function trapezoid(
  id: string, x: number, y: number, w: number, h: number,
  taper: number, direction: "top" | "bottom",
  role: "panel" | "flap" | "glue", label: string,
) {
  const inset = w * taper / 2;
  const verts = direction === "top"
    ? [{ x, y: y + h }, { x: x + w, y: y + h }, { x: x + w - inset, y }, { x: x + inset, y }]
    : [{ x, y }, { x: x + w, y }, { x: x + w - inset, y: y + h }, { x: x + inset, y: y + h }];

  return createDielineFace({ id, label, vertices: verts, role, artworkEnabled: false });
}

function crease(
  id: string, faceA: string, faceB: string,
  edgeStart: Point, edgeEnd: Point,
): DielineCrease {
  return { id, faceA, faceB, edgeStart, edgeEnd, foldAngle: RIGHT_ANGLE, direction: 1 };
}
