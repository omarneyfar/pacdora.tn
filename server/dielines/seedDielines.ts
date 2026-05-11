/**
 * seedDielines.ts - Pre-built dieline templates that auto-populate on launch.
 *
 * Seeds are deterministic, category-backed DielineGraph generators.
 */

import {
  listRegisteredDielineTemplates,
} from "@/domain/dieline/templateRegistry";
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
  return listRegisteredDielineTemplates().map((template) => ({
    id: `seed-${template.categorySlug.toLowerCase()}-${template.id}`,
    name: template.label,
    fileName: template.id,
    graph: template.generate(template.defaultValues),
  }));
}
