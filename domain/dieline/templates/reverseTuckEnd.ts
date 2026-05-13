/**
 * Reverse Tuck End — thin re-export from the reusable folding-carton engine.
 *
 * All geometry, validation, and structural logic now lives in
 * domain/dieline/generators/foldingCarton/. This file exists for
 * backward compatibility of existing imports.
 *
 * Status: architecture-ready, geometry-needs-verification, productionReady: false
 */
export {
  generateReverseTuckEnd,
  REVERSE_TUCK_END_PARAMETER_SPECS,
  REVERSE_TUCK_END_RECIPE,
} from "../generators/foldingCarton/recipes/reverseTuckEnd";

export type { FoldingCartonInput as ReverseTuckEndParameters } from "../generators/foldingCarton/types";
