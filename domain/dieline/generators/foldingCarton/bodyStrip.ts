import { createDielineFace } from "../../geometry";
import type { DielineFace } from "../../types";
import type { BodyStripColumn, BodyStripResult, FoldingCartonRecipe, NormalizedParams } from "./types";

/**
 * Create the horizontal body panel strip and glue tab for a folding carton.
 *
 * Panels are laid out left-to-right following `recipe.body.panelOrder`.
 * Panel widths alternate: W, L, W, L (depth, length, depth, length).
 * The glue tab is placed before or after the specified panel.
 */
export function createBodyStrip(params: NormalizedParams, recipe: FoldingCartonRecipe): BodyStripResult {
  const { L, W, H, GFW, TFW, DFW } = params;
  const panelWidths = recipe.body.panelOrder.map((_, i) => (i % 2 === 0 ? W : L));

  // Determine the closure band heights
  const topBand = computeClosureBand(params, recipe.topClosure);
  const bottomBand = computeClosureBand(params, recipe.bottomClosure);
  const bodyTop = topBand;
  const bodyBottom = bodyTop + H;

  // Build column layout: panels + glue tab in strip order
  const columns: BodyStripColumn[] = [];
  let x = 0;

  const glueTabIndex = recipe.body.panelOrder.indexOf(recipe.body.glueTabAttachedTo);
  const insertGlueBefore = recipe.body.glueTabSide === "before" ? glueTabIndex : -1;
  const insertGlueAfter = recipe.body.glueTabSide === "after" ? glueTabIndex : -1;

  for (let i = 0; i < recipe.body.panelOrder.length; i++) {
    if (i === insertGlueBefore) {
      columns.push({ id: "glue-tab", x, width: GFW });
      x += GFW;
    }

    const panelId = recipe.body.panelOrder[i];
    const panelWidth = panelWidths[i];
    columns.push({ id: panelId, x, width: panelWidth });
    x += panelWidth;

    if (i === insertGlueAfter) {
      columns.push({ id: "glue-tab", x, width: GFW });
      x += GFW;
    }
  }

  const columnsByFaceId = new Map(columns.map((col) => [col.id, col]));

  // Create body panel faces
  const bodyFaces: DielineFace[] = recipe.body.panelOrder.map((panelId) => {
    const col = columnsByFaceId.get(panelId)!;
    return createRectFace(panelId, col.x, bodyTop, col.width, H, "panel", capitalize(panelId));
  });

  // Create glue tab face
  const glueCol = columnsByFaceId.get("glue-tab")!;
  const glueTabFace = createGlueTabFace("glue-tab", glueCol.x, bodyTop, GFW, H);

  return {
    faces: bodyFaces,
    glueTabFace,
    columns,
    columnsByFaceId,
    bodyTop,
    bodyBottom,
    topBand,
    bottomBand,
    totalWidth: x,
    totalHeight: bodyBottom + bottomBand,
  };
}

/**
 * Compute the closure band height (the vertical space needed above bodyTop or below bodyBottom).
 * This is the max extent of all closure faces on that side.
 */
function computeClosureBand(params: NormalizedParams, closure: FoldingCartonRecipe["topClosure"]): number {
  if (closure.type === "none") return 0;

  const extents: number[] = [];

  if (closure.dustPanels?.length) {
    extents.push(params.DFW);
  }
  if (closure.tuckPanel) {
    extents.push(params.W + params.TFW);
  }
  if (closure.panelFlaps?.length) {
    // Panel flaps use dust flap depth as their height
    extents.push(params.DFW);
  }

  return extents.length > 0 ? Math.max(...extents) : 0;
}

// ── Face helpers ───────────────────────────────────────────────

export function createRectFace(
  id: string, x: number, y: number, width: number, height: number,
  role: DielineFace["role"], label: string, artworkEnabled = false,
): DielineFace {
  return createDielineFace({
    id, label,
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    role,
    artworkEnabled: artworkEnabled || role === "panel",
  });
}

function createGlueTabFace(id: string, x: number, y: number, width: number, height: number): DielineFace {
  // Beveled glue tab. Bevel proportions are approximate (needs verification).
  const bevel = Math.min(width * 0.34, height * 0.08);
  return createDielineFace({
    id,
    label: "Glue tab",
    vertices: [
      { x, y },
      { x: x + width, y: y + bevel },
      { x: x + width, y: y + height - bevel },
      { x, y: y + height },
    ],
    role: "glue",
    artworkEnabled: false,
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
