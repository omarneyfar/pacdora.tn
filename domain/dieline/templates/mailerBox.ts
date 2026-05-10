/**
 * Mailer Box / Crash-Lock Bottom — E-commerce standard.
 *
 * Features:
 *  - Full front/back/left/right panels
 *  - Hinged lid that folds from the back over the front
 *  - Auto-lock bottom (4 interlocking flaps)
 *  - Dust flaps on the lid
 *
 * Simplified to: panels + lid + bottom flaps
 */

import { createDielineFace, createExteriorCutPaths } from "../geometry";
import { createDimensionParameters, createTemplateMetadata } from "../structure";
import type { DielineCrease, DielineFaceNode, DielineGraph, Point } from "../types";

const RIGHT_ANGLE = Math.PI / 2;
const GLUE_TAB_WIDTH = 15;
const BOTTOM_FLAP_RATIO = 0.5;

export function generateMailerBox(dims: {
  width: number;
  height: number;
  depth: number;
}): DielineGraph {
  const { width: W, height: H, depth: D } = dims;
  const glueW = GLUE_TAB_WIDTH;
  const bfH = D * BOTTOM_FLAP_RATIO;

  // Layout (cross-shaped):
  // Row: bottom flaps | panels (H) | lid (D)
  const col0 = 0;
  const col1 = glueW;
  const col2 = col1 + D;
  const col3 = col2 + W;
  const col4 = col3 + D;
  const col5 = col4 + W;

  const row0 = 0;        // bottom flaps top
  const row1 = bfH;      // panels top
  const row2 = row1 + H; // panels bottom
  const row3 = row2 + D; // lid bottom

  const faces = [
    rect("front", col2, row1, W, H, "panel", "Front"),
    rect("back", col4, row1, W, H, "panel", "Back"),
    rect("left", col1, row1, D, H, "panel", "Left"),
    rect("right", col3, row1, D, H, "panel", "Right"),
    rect("glue-tab", col0, row1, glueW, H, "glue", "Glue tab"),

    // Lid (hinged from back)
    rect("lid", col4, row2, W, D, "panel", "Lid"),

    // Bottom flaps
    rect("bottom-front", col2, row0, W, bfH, "flap", "Bottom flap (front)"),
    rect("bottom-back", col4, row0, W, bfH, "flap", "Bottom flap (back)"),
    rect("bottom-left", col1, row0, D, bfH, "flap", "Bottom flap (left)"),
    rect("bottom-right", col3, row0, D, bfH, "flap", "Bottom flap (right)"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-glue-left", "glue-tab", "left", { x: col1, y: row1 }, { x: col1, y: row2 }),
    crease("cr-left-front", "left", "front", { x: col2, y: row1 }, { x: col2, y: row2 }),
    crease("cr-front-right", "front", "right", { x: col3, y: row1 }, { x: col3, y: row2 }),
    crease("cr-right-back", "right", "back", { x: col4, y: row1 }, { x: col4, y: row2 }),

    // Lid
    crease("cr-back-lid", "back", "lid", { x: col4, y: row2 }, { x: col5, y: row2 }),

    // Bottom flaps
    crease("cr-front-bf", "front", "bottom-front", { x: col2, y: row1 }, { x: col3, y: row1 }),
    crease("cr-back-bf", "back", "bottom-back", { x: col4, y: row1 }, { x: col5, y: row1 }),
    crease("cr-left-bf", "left", "bottom-left", { x: col1, y: row1 }, { x: col2, y: row1 }),
    crease("cr-right-bf", "right", "bottom-right", { x: col3, y: row1 }, { x: col4, y: row1 }),
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
            { faceId: "bottom-left", creaseId: "cr-left-bf", children: [] },
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
                { faceId: "lid", creaseId: "cr-back-lid", children: [] },
                { faceId: "bottom-back", creaseId: "cr-back-bf", children: [] },
              ],
            },
            { faceId: "bottom-right", creaseId: "cr-right-bf", children: [] },
          ],
        },
        { faceId: "bottom-front", creaseId: "cr-front-bf", children: [] },
      ],
    },
  ];

  return {
    size: { width: col5, height: row3 },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree,
    metadata: createTemplateMetadata({
      category: "mailer-box",
      family: "roll-end-front-tuck",
      familyLabel: "Roll End Front Tuck Mailer",
      parts: [
        {
          id: "body-panels",
          label: "Body panels",
          role: "body",
          faceIds: ["front", "back", "left", "right"],
          creaseIds: ["cr-left-front", "cr-front-right", "cr-right-back"],
        },
        {
          id: "lid",
          label: "Hinged lid",
          role: "lid",
          faceIds: ["lid"],
          creaseIds: ["cr-back-lid"],
        },
        {
          id: "bottom-lock",
          label: "Auto-lock bottom",
          role: "bottom-closure",
          faceIds: ["bottom-front", "bottom-back", "bottom-left", "bottom-right"],
          creaseIds: ["cr-front-bf", "cr-back-bf", "cr-left-bf", "cr-right-bf"],
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
        { id: "bottom-flap-depth", label: "Bottom flap depth", kind: "closure", value: bfH, unit: "mm" },
        { id: "glue-tab-width", label: "Glue tab width", kind: "closure", value: glueW, unit: "mm" },
      ],
    }),
    source: { type: "template", templateId: "mailer-box" },
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
