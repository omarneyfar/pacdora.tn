import type { DielineParameterGroup, ParameterSpec, ParameterValueMap } from "../types";
import type {
  DielineTemplateCatalog,
  DielineTemplateDefinition,
  EditableParameter,
  ResolvedTemplateParameters,
} from "./catalogTypes";
import { evaluateFormula } from "./formulaEngine";
import { toGeneratorParameterKey } from "./parameterAliases";

const CLOSURE_PARAMETER_IDS = new Set(["TFW", "TFR", "GFW", "DFW"]);
const V2_AUTO_CLOSURE_GENERATOR_IDS = new Set([
  "reverseTuckEnd",
  "straightTuckEnd",
  "reverseTuckEndV2",
  "straightTuckEndV2",

  "tuckEndFoldingCarton",
  "centeredTuckEndCarton",
  "lockingTabTopBottom",
  "circularHangHole",
  "hangTab",

  "tuckEndFoldingCartonV2",
  "centeredTuckEndCartonV2",
  "lockingTabTopBottomV2",
  "circularHangHoleV2",
  "hangTabV2",
]);
const DIMENSION_PARAMETER_IDS = new Set(["L", "W", "H"]);
const EXPORT_PARAMETER_IDS = new Set(["pdfExport", "dxfExport", "outputSizeMode"]);

export function resolveTemplateParameters(
  template: DielineTemplateDefinition,
  userValues: Record<string, unknown> = {},
  globalDefaults: DielineTemplateCatalog["globalDefaults"] = {},
): ResolvedTemplateParameters {
  const parameterSpecs = catalogTemplateToParameterSpecs(template);
  const catalogValues: ParameterValueMap = {};
  const generatorParameters: ParameterValueMap = {};
  const warnings: string[] = [];
  let closureMode: "auto" | "manual" = userValues.closureMode === "manual" ? "manual" : "auto";

  for (const spec of parameterSpecs) {
    const catalogKey = spec.description?.startsWith("catalog-key:")
      ? spec.description.slice("catalog-key:".length)
      : spec.id;
    const rawValue =
      userValues[spec.id] ??
      userValues[catalogKey] ??
      findDefaultValue(template, catalogKey, globalDefaults) ??
      spec.defaultValue;
    const value = coerceParameterValue(rawValue, spec);

    catalogValues[catalogKey] = value;
    if (spec.id === "closureMode") {
      closureMode = value === "manual" ? "manual" : "auto";
    }

    if (shouldPassGeneratorParameter(template, spec, catalogKey, userValues, closureMode)) {
      generatorParameters[spec.id] = value;
    }
  }

  for (const [key, definition] of Object.entries(template.derivedDimensions)) {
    if (!definition.formula) {
      continue;
    }

    const fallback = Number(definition.defaultValue ?? 0);
    const result = evaluateFormula(definition.formula, catalogValues, Number.isFinite(fallback) ? fallback : 0);
    catalogValues[key] = result.value;
    warnings.push(...result.warnings.map((warning) => `${template.name}: ${warning}`));
  }

  for (const [key, formula] of Object.entries(template.formulas)) {
    const fallback = Number(catalogValues[key] ?? 0);
    const result = evaluateFormula(formula, catalogValues, Number.isFinite(fallback) ? fallback : 0);
    if (result.ok) {
      catalogValues[key] = result.value;
    }
    warnings.push(...result.warnings.map((warning) => `${template.name}: ${warning}`));
  }

  return {
    catalogValues,
    generatorParameters,
    parameterSpecs,
    warnings,
  };
}

function shouldPassGeneratorParameter(
  template: DielineTemplateDefinition,
  spec: ParameterSpec,
  catalogKey: string,
  userValues: Record<string, unknown>,
  closureMode: "auto" | "manual",
): boolean {
  if (!V2_AUTO_CLOSURE_GENERATOR_IDS.has(template.runtime.generatorId) || !CLOSURE_PARAMETER_IDS.has(spec.id)) {
    return true;
  }

  if (closureMode !== "manual") {
    return false;
  }

  return Object.hasOwn(userValues, spec.id) || Object.hasOwn(userValues, catalogKey);
}

export function catalogTemplateToParameterSpecs(template: DielineTemplateDefinition): ParameterSpec[] {
  const specs: ParameterSpec[] = [];
  const usedIds = new Set<string>();
  const addSpec = (spec: ParameterSpec) => {
    if (usedIds.has(spec.id)) {
      return;
    }

    usedIds.add(spec.id);
    specs.push(spec);
  };

  for (const parameter of template.editableParameters) {
    const spec = editableParameterToSpec(template, parameter);
    addSpec(spec);
  }

  if (specs.some((spec) => CLOSURE_PARAMETER_IDS.has(spec.id)) && !usedIds.has("closureMode")) {
    const firstClosureIndex = specs.findIndex((spec) => CLOSURE_PARAMETER_IDS.has(spec.id));
    specs.splice(Math.max(firstClosureIndex, 0), 0, {
      id: "closureMode",
      label: "Closure dimensions",
      kind: "closure",
      input: "select",
      defaultValue: "auto",
      options: [
        { label: "Auto", value: "auto" },
        { label: "Manual", value: "manual" },
      ],
    });
    usedIds.add("closureMode");
  }

  addSpec({
    id: "outputSizeMode",
    label: "Output Size Mode",
    kind: "export",
    input: "select",
    defaultValue: "inner",
    options: [
      { label: "Inner dimensions", value: "inner" },
      { label: "Outer dimensions", value: "outer" },
    ],
  });
  addSpec({ id: "pdfExport", label: "PDF for Dielines", kind: "export", input: "boolean", defaultValue: true });
  addSpec({ id: "dxfExport", label: "DXF for Dielines", kind: "export", input: "boolean", defaultValue: true });

  return specs;
}

export function catalogTemplateToParameterGroups(template: DielineTemplateDefinition): DielineParameterGroup[] {
  const specs = catalogTemplateToParameterSpecs(template);
  const has = (id: string) => specs.some((spec) => spec.id === id);
  const dimensions = ["L", "W", "H"].filter(has);
  const material = ["outputSizeMode", "materialThickness", "material", "bleeds"].filter(has);
  const closureMode = ["closureMode"].filter(has);
  const advancedClosure = ["TFW", "TFR", "GFW", "DFW"].filter(has);
  const exports = ["pdfExport", "dxfExport"].filter(has);
  const groups: DielineParameterGroup[] = [];

  if (dimensions.length > 0) {
    groups.push({
      id: "custom-size",
      label: "Custom Size",
      description: "Primary product dimensions from the catalog schema.",
      parameterIds: dimensions,
      columns: 3,
    });
  }

  if (material.length > 0) {
    groups.push({
      id: "basic",
      label: "Basic",
      parameterIds: material,
      columns: 2,
    });
  }

  if (closureMode.length > 0) {
    groups.push({
      id: "closure-mode",
      label: "Closure",
      description: "Auto is recommended. Manual unlocks advanced closure values.",
      parameterIds: closureMode,
      columns: 1,
    });
  }

  if (exports.length > 0) {
    groups.push({
      id: "download-formats",
      label: "Download Formats",
      parameterIds: exports,
      columns: 2,
    });
  }

  if (advancedClosure.length > 0) {
    groups.push({
      id: "advanced-closure",
      label: "Advanced Closure",
      description: "Editable in manual mode for dieline technicians who need exact closure control.",
      parameterIds: advancedClosure,
      columns: 2,
    });
  }

  return groups;
}

function editableParameterToSpec(template: DielineTemplateDefinition, parameter: EditableParameter): ParameterSpec {
  const id = toGeneratorParameterKey(parameter.key);
  const dimension = template.dimensions[parameter.key] ?? template.derivedDimensions[parameter.key];
  const input = parameter.type === "boolean"
    ? "boolean"
    : parameter.allowedValues && parameter.allowedValues.length > 0
      ? "select"
      : "number";
  const defaultValue =
    parameter.defaultValue ??
    dimension?.defaultValue ??
    (input === "boolean" ? false : 0);

  return {
    id,
    label: normalizeLabel(dimension?.label ?? parameter.label ?? parameter.key),
    kind: getParameterKind(id, parameter.key),
    input,
    defaultValue: normalizeDefaultValue(defaultValue, input),
    description: `catalog-key:${parameter.key}`,
    ...(dimension?.unit || parameter.unit ? { unit: String(dimension?.unit ?? parameter.unit) } : {}),
    ...(typeof parameter.min === "number" || typeof dimension?.minValue === "number"
      ? { min: Number(parameter.min ?? dimension?.minValue) }
      : {}),
    ...(typeof parameter.max === "number" || typeof dimension?.maxValue === "number"
      ? { max: Number(parameter.max ?? dimension?.maxValue) }
      : {}),
    ...(input === "number" ? { step: getStep(id) } : {}),
    ...(parameter.allowedValues && parameter.allowedValues.length > 0
      ? {
          options: parameter.allowedValues
            .filter((value): value is string | number | boolean => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
            .map((value) => ({ label: String(value), value })),
        }
      : {}),
  };
}

function findDefaultValue(
  template: DielineTemplateDefinition,
  catalogKey: string,
  globalDefaults: DielineTemplateCatalog["globalDefaults"],
) {
  const parameter = template.editableParameters.find((candidate) => candidate.key === catalogKey);
  return parameter?.defaultValue ?? template.dimensions[catalogKey]?.defaultValue ?? globalDefaults[catalogKey];
}

function coerceParameterValue(value: unknown, spec: ParameterSpec): string | number | boolean {
  if (spec.input === "boolean") {
    return Boolean(value);
  }

  if (spec.input === "select") {
    const option = spec.options?.find((candidate) => String(candidate.value) === String(value));
    return option?.value ?? spec.defaultValue;
  }

  const numeric = Number(value);
  const fallback = Number(spec.defaultValue);
  const valueToClamp = Number.isFinite(numeric) ? numeric : Number.isFinite(fallback) ? fallback : 0;
  const min = typeof spec.min === "number" ? spec.min : -Infinity;
  const max = typeof spec.max === "number" ? spec.max : Infinity;

  return Math.min(max, Math.max(min, valueToClamp));
}

function normalizeDefaultValue(value: unknown, input: ParameterSpec["input"]): string | number | boolean {
  if (input === "boolean") {
    return Boolean(value);
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getParameterKind(id: string, catalogKey: string): ParameterSpec["kind"] {
  if (DIMENSION_PARAMETER_IDS.has(id)) {
    return "dimension";
  }

  if (CLOSURE_PARAMETER_IDS.has(id)) {
    return "closure";
  }

  if (EXPORT_PARAMETER_IDS.has(id)) {
    return "export";
  }

  if (/material/i.test(id) || /material/i.test(catalogKey)) {
    return "material";
  }

  return "other";
}

function getStep(id: string): number {
  if (id === "materialThickness") return 0.1;
  if (id === "TFR") return 0.5;
  return 1;
}

function normalizeLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}
