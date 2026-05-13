import type { ParameterSpec } from "../../../types";
import { generateFoldingCarton } from "../generateFoldingCarton";
import { autoClosureValues } from "../parameters";
import type { FoldingCartonInput, FoldingCartonRecipe } from "../types";

const DEFAULTS = {
  L: 80,
  W: 40,
  H: 120,
} as const;

const DEFAULT_AUTO = autoClosureValues(DEFAULTS.L, DEFAULTS.W);

function numberSpec(
  id: string, label: string, defaultValue: number,
  min: number, max: number, step: number, unit: string,
  kind: ParameterSpec["kind"] = "dimension",
): ParameterSpec {
  return { id, label, kind, input: "number", defaultValue, min, max, step, unit };
}

export const STRAIGHT_TUCK_END_PARAMETER_SPECS: ParameterSpec[] = [
  numberSpec("L", "Length(L)", DEFAULTS.L, 10, 800, 1, "mm"),
  numberSpec("W", "Width(W)", DEFAULTS.W, 8, 500, 1, "mm"),
  numberSpec("H", "Height(H)", DEFAULTS.H, 10, 900, 1, "mm"),
  {
    id: "closureMode",
    label: "Closure dimensions",
    kind: "closure",
    input: "select",
    defaultValue: "auto",
    options: [
      { label: "Auto", value: "auto" },
      { label: "Manual", value: "manual" },
    ],
  },
  numberSpec("TFW", "Tuck flap lip", DEFAULT_AUTO.TFW, 1, 500, 0.5, "mm", "closure"),
  numberSpec("TFR", "Tuck flap radius", DEFAULT_AUTO.TFR, 0, 120, 0.5, "mm", "closure"),
  numberSpec("GFW", "Glue tab width", DEFAULT_AUTO.GFW, 1, 120, 0.5, "mm", "closure"),
  numberSpec("DFW", "Dust flap depth", DEFAULT_AUTO.DFW, 1, 300, 0.5, "mm", "closure"),
];

/**
 * Straight Tuck End recipe.
 *
 * Structure: both top and bottom tucks on the front panel.
 * Glue tab before left panel.
 * Back panel has simple panel flaps (top-panel, bottom-panel).
 *
 * Verification status: geometry-needs-verification
 * Uses the same tuck flap geometry as RTE (approximate, not verified).
 */
export const STRAIGHT_TUCK_END_RECIPE: FoldingCartonRecipe = {
  id: "straight-tuck-end",
  label: "Straight Tuck End Folding Carton Box",
  family: "straight-tuck-end",
  verificationStatus: "geometry-needs-verification",
  productionReady: false,
  parameterSpecs: STRAIGHT_TUCK_END_PARAMETER_SPECS,
  body: {
    panelOrder: ["left", "front", "right", "back"],
    glueTabAttachedTo: "left",
    glueTabSide: "before",
  },
  topClosure: {
    type: "tuck-end",
    tuckPanel: "front",
    dustPanels: ["left", "right"],
    panelFlaps: ["back"],
  },
  bottomClosure: {
    type: "tuck-end",
    tuckPanel: "front",
    dustPanels: ["left", "right"],
    panelFlaps: ["back"],
  },
};

/**
 * Generate a Straight Tuck End dieline graph.
 *
 * This is a thin wrapper around the reusable folding-carton engine.
 * The only difference from RTE is the recipe: both tucks on front,
 * glue tab before left, and panel flaps on back.
 */
export function generateStraightTuckEnd(input: FoldingCartonInput = {}) {
  return generateFoldingCarton(input, STRAIGHT_TUCK_END_RECIPE);
}
