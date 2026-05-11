/**
 * seedDielines.ts - Pre-built dieline templates that auto-populate on launch.
 *
 * Seeds are deterministic, category-backed DielineGraph generators.
 */

import {
  CEFBOX_FOLDING_BOX_DEFINITIONS,
  generateCefBoxFoldingBoxGraph,
} from "@/domain/dieline/templates/foldingBoxVariants";
import {
  generateOvalSticker,
  generateRectangleSticker,
  generateRoundedSticker,
} from "@/domain/dieline/templates/stickers";
import type { DielineGraph } from "@/domain/dieline/types";

export type SeedDieline = {
  /** Stable deterministic ID; will not change between launches. */
  id: string;
  name: string;
  fileName: string;
  graph: DielineGraph;
};

/**
 * All built-in seed dielines.
 * These are inserted into the library DB when missing.
 */
export function getSeedDielines(): SeedDieline[] {
  return [
    // Sticker category: rectangle, rounded rectangle, and oval.
    {
      id: "seed-sticker-rectangle-90x50",
      name: "Rectangular Sticker/Label - 90 x 50",
      fileName: "sticker-rectangle-90x50",
      graph: generateRectangleSticker({ length: 90, width: 50 }),
    },
    {
      id: "seed-sticker-rounded-90x50",
      name: "Well-rounded Sticker/Label - 90 x 50",
      fileName: "sticker-rounded-90x50",
      graph: generateRoundedSticker({ length: 90, width: 50, cornerRadius: 12 }),
    },
    {
      id: "seed-sticker-oval-90x50",
      name: "Oval Sticker - 90 x 50",
      fileName: "sticker-oval-90x50",
      graph: generateOvalSticker({ length: 90, width: 50 }),
    },
    ...getCefBoxFoldingBoxSeeds(),
  ];
}

function getCefBoxFoldingBoxSeeds(): SeedDieline[] {
  return CEFBOX_FOLDING_BOX_DEFINITIONS.map((definition) => ({
    id: `seed-foldingbox-${definition.id}`,
    name: `${definition.label} - ${definition.length} x ${definition.width} x ${definition.height}`,
    fileName: definition.fileName,
    graph: generateCefBoxFoldingBoxGraph(definition),
  }));
}
