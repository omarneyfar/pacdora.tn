/**
 * seedDielines.ts — Pre-built dieline templates that auto-populate on first launch.
 *
 * Each seed is a professional packaging template with a name, description,
 * and a DielineGraph generated from the parametric template generators.
 */

import { generateFoldingCartonGraph } from "@/domain/dieline/templates/foldingCartonGraph";
import { generateStraightTuckEnd } from "@/domain/dieline/templates/straightTuckEnd";
import { generateReverseTuckEnd } from "@/domain/dieline/templates/reverseTuckEnd";
import { generateSleeve } from "@/domain/dieline/templates/sleeve";
import { generateMailerBox } from "@/domain/dieline/templates/mailerBox";
import { generateTrayWithLid } from "@/domain/dieline/templates/trayWithLid";
import { generateFullSealEnd } from "@/domain/dieline/templates/fullSealEnd";
import type { DielineGraph } from "@/domain/dieline/types";

export type SeedDieline = {
  /** Stable deterministic ID — will not change between launches */
  id: string;
  name: string;
  fileName: string;
  graph: DielineGraph;
};

/**
 * All built-in seed dielines.
 * These are inserted into the library DB on first launch if empty.
 */
export function getSeedDielines(): SeedDieline[] {
  return [
    // 1. Simple folding carton (6-face basic box)
    {
      id: "seed-folding-carton-80x120x40",
      name: "Folding Carton · 80 × 120 × 40",
      fileName: "folding-carton-80x120x40",
      graph: generateFoldingCartonGraph({ width: 80, height: 120, depth: 40 }),
    },

    // 2. Straight Tuck End (cosmetics/retail standard)
    {
      id: "seed-ste-70x100x35",
      name: "Straight Tuck End · 70 × 100 × 35",
      fileName: "straight-tuck-end-70x100x35",
      graph: generateStraightTuckEnd({ width: 70, height: 100, depth: 35 }),
    },
    {
      id: "seed-ste-50x180x30",
      name: "Straight Tuck End · Tall · 50 × 180 × 30",
      fileName: "straight-tuck-end-50x180x30",
      graph: generateStraightTuckEnd({ width: 50, height: 180, depth: 30 }),
    },

    // 3. Reverse Tuck End (luxury/cosmetics)
    {
      id: "seed-rte-60x90x30",
      name: "Reverse Tuck End · 60 × 90 × 30",
      fileName: "reverse-tuck-end-60x90x30",
      graph: generateReverseTuckEnd({ width: 60, height: 90, depth: 30 }),
    },

    // 4. Sleeve (product bands/multi-packs)
    {
      id: "seed-sleeve-100x60x20",
      name: "Sleeve · 100 × 60 × 20",
      fileName: "sleeve-100x60x20",
      graph: generateSleeve({ width: 100, height: 60, depth: 20 }),
    },
    {
      id: "seed-sleeve-120x200x15",
      name: "Sleeve · Tall · 120 × 200 × 15",
      fileName: "sleeve-120x200x15",
      graph: generateSleeve({ width: 120, height: 200, depth: 15 }),
    },

    // 5. Mailer box (e-commerce shipping)
    {
      id: "seed-mailer-200x150x50",
      name: "Mailer Box · 200 × 150 × 50",
      fileName: "mailer-box-200x150x50",
      graph: generateMailerBox({ width: 200, height: 150, depth: 50 }),
    },
    {
      id: "seed-mailer-300x200x80",
      name: "Mailer Box · Large · 300 × 200 × 80",
      fileName: "mailer-box-300x200x80",
      graph: generateMailerBox({ width: 300, height: 200, depth: 80 }),
    },

    // 6. Tray with lid (display/bakery)
    {
      id: "seed-tray-150x100x30",
      name: "Tray with Lid · 150 × 100 × 30",
      fileName: "tray-with-lid-150x100x30",
      graph: generateTrayWithLid({ width: 150, height: 100, depth: 30 }),
    },

    // 7. Full Seal End (cereal/tea boxes)
    {
      id: "seed-fse-80x240x50",
      name: "Full Seal End · 80 × 240 × 50",
      fileName: "full-seal-end-80x240x50",
      graph: generateFullSealEnd({ width: 80, height: 240, depth: 50 }),
    },

    // Extra variants with different dimensions
    {
      id: "seed-folding-carton-100x100x100",
      name: "Folding Carton · Cube · 100 × 100 × 100",
      fileName: "folding-carton-cube-100",
      graph: generateFoldingCartonGraph({ width: 100, height: 100, depth: 100 }),
    },
    {
      id: "seed-ste-100x60x40",
      name: "Straight Tuck End · Wide · 100 × 60 × 40",
      fileName: "straight-tuck-end-100x60x40",
      graph: generateStraightTuckEnd({ width: 100, height: 60, depth: 40 }),
    },
  ];
}
