import type { ParameterSpec } from "../../../types";
import { generateFoldingCarton } from "../generateFoldingCarton";
import { autoClosureValues } from "../parameters";
import type { FoldingCartonInput, FoldingCartonRecipe } from "../types";

const DEFAULTS = {
  L: 120.65,
  W: 60.72,
  H: 161.13,
} as const;

const DEFAULT_AUTO = autoClosureValues(DEFAULTS.L, DEFAULTS.W);

function numberSpec(
  id: string, label: string, defaultValue: number,
  min: number, max: number, step: number, unit: string,
  kind: ParameterSpec["kind"] = "dimension",
): ParameterSpec {
  return { id, label, kind, input: "number", defaultValue, min, max, step, unit };
}

export const REVERSE_TUCK_END_PARAMETER_SPECS: ParameterSpec[] = [
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
  {
    id: "outputSizeMode",
    label: "Output Size Mode",
    kind: "export",
    input: "select",
    defaultValue: "inner",
    options: [
      { label: "Inner dimensions", value: "inner" },
      { label: "Outer dimensions", value: "outer" },
    ],
  },
  numberSpec("materialThickness", "Material Thickness", 1.5, 0, 12, 0.1, "mm", "material"),
  {
    id: "material",
    label: "Material",
    kind: "material",
    input: "select",
    defaultValue: "E-flute paper",
    options: [
      { label: "E-flute paper", value: "E-flute paper" },
      { label: "Cardboard", value: "Cardboard" },
      { label: "Kraft paper", value: "Kraft paper" },
    ],
  },
  {
    id: "bleeds",
    label: "Bleeds",
    kind: "export",
    input: "select",
    defaultValue: "none",
    options: [
      { label: "No bleeds", value: "none" },
      { label: "3 mm", value: 3 },
      { label: "5 mm", value: 5 },
    ],
  },
  { id: "pdfExport", label: "PDF for Dielines", kind: "export", input: "boolean", defaultValue: true },
  { id: "dxfExport", label: "DXF for Dielines", kind: "export", input: "boolean", defaultValue: true },
  numberSpec("TFW", "Tuck flap lip", DEFAULT_AUTO.TFW, 1, 500, 0.5, "mm", "closure"),
  numberSpec("TFR", "Tuck flap radius", DEFAULT_AUTO.TFR, 0, 120, 0.5, "mm", "closure"),
  numberSpec("GFW", "Glue tab width", DEFAULT_AUTO.GFW, 1, 120, 0.5, "mm", "closure"),
  numberSpec("DFW", "Dust flap depth", DEFAULT_AUTO.DFW, 1, 300, 0.5, "mm", "closure"),
];

/**
 * Reverse Tuck End recipe.
 *
 * Structure: top tuck on front, bottom tuck on back.
 * Glue tab after back panel.
 *
 * Verification status: geometry-needs-verification
 * The tuck flap lip/arc geometry, dust flap taper, and glue tab bevel
 * are approximations and have NOT been verified against production references.
 */
export const REVERSE_TUCK_END_RECIPE: FoldingCartonRecipe = {
  id: "reverse-tuck-end",
  label: "Reverse Tuck End Folding Carton Box",
  family: "reverse-tuck-end",
  verificationStatus: "geometry-needs-verification",
  productionReady: false,
  parameterSpecs: REVERSE_TUCK_END_PARAMETER_SPECS,
  body: {
    panelOrder: ["left", "front", "right", "back"],
    glueTabAttachedTo: "back",
    glueTabSide: "after",
  },
  topClosure: {
    type: "tuck-end",
    tuckPanel: "front",
    dustPanels: ["left", "right"],
  },
  bottomClosure: {
    type: "tuck-end",
    tuckPanel: "back",
    dustPanels: ["left", "right"],
  },
};

/**
 * Generate a Reverse Tuck End dieline graph.
 *
 * This is a thin wrapper around the reusable folding-carton engine.
 */
export function generateReverseTuckEnd(input: FoldingCartonInput = {}) {
  return generateFoldingCarton(input, REVERSE_TUCK_END_RECIPE);
}
