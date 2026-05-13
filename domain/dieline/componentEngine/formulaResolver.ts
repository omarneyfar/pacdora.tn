import { evaluateFormula } from "../catalog/formulaEngine";
import type { ParameterSpec, ParameterValueMap } from "../types";
import type {
  DielineComponentRecipe,
  RecipeConstraintEvaluation,
  RecipeParameterDefinition,
  ResolvedRecipeParameters,
} from "./types";

const DIMENSION_IDS = new Set(["L", "W", "H"]);

export function resolveRecipeParameters(
  recipe: DielineComponentRecipe,
  userValues: Record<string, unknown> = {},
): ResolvedRecipeParameters {
  const values: ParameterValueMap = {};
  const specs: ParameterSpec[] = [];
  const warnings: string[] = [];

  for (const [id, definition] of Object.entries(recipe.parameters)) {
    const spec = parameterDefinitionToSpec(id, definition);
    const rawValue = Object.hasOwn(userValues, id) ? userValues[id] : definition.default;
    const value = resolveParameterValue(id, definition, rawValue, values);

    values[id] = value;
    specs.push(spec);
  }

  return { values, parameterSpecs: specs, warnings };
}

export function resolveNumberExpression(
  value: unknown,
  context: Record<string, unknown>,
  label: string,
): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${label} must be a finite number.`);
    }
    return value;
  }

  if (typeof value === "string") {
    const result = evaluateFormula(value, context);
    if (!result.ok || !Number.isFinite(result.value)) {
      throw new Error(`${label} formula is invalid: ${value}`);
    }
    return result.value;
  }

  throw new Error(`${label} must be a number or formula string.`);
}

export function evaluateRecipeConstraints(
  recipe: DielineComponentRecipe,
  context: Record<string, unknown>,
): RecipeConstraintEvaluation {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const constraint of recipe.constraints ?? []) {
    let triggered = false;
    try {
      triggered = evaluateConditionExpression(constraint.condition, context);
    } catch (error) {
      errors.push(`${constraint.id}: ${error instanceof Error ? error.message : "Invalid constraint condition."}`);
      continue;
    }

    if (!triggered) {
      continue;
    }

    const message = `${constraint.id}: ${constraint.message}`;
    if (constraint.severity === "error") {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  return { errors, warnings };
}

function evaluateConditionExpression(condition: string, context: Record<string, unknown>): boolean {
  const operator = findComparisonOperator(condition);

  if (!operator) {
    return resolveNumberExpression(condition, context, `constraint condition ${condition}`) !== 0;
  }

  const left = condition.slice(0, operator.index).trim();
  const right = condition.slice(operator.index + operator.value.length).trim();

  if (!left || !right) {
    throw new Error(`Constraint condition must compare two expressions: ${condition}`);
  }

  const leftValue = resolveNumberExpression(left, context, `constraint left side ${condition}`);
  const rightValue = resolveNumberExpression(right, context, `constraint right side ${condition}`);

  switch (operator.value) {
    case ">":
      return leftValue > rightValue;
    case ">=":
      return leftValue >= rightValue;
    case "<":
      return leftValue < rightValue;
    case "<=":
      return leftValue <= rightValue;
    case "==":
      return Math.abs(leftValue - rightValue) <= 0.000001;
    case "!=":
      return Math.abs(leftValue - rightValue) > 0.000001;
  }
}

function findComparisonOperator(condition: string): { value: ">" | ">=" | "<" | "<=" | "==" | "!="; index: number } | null {
  for (const value of [">=", "<=", "==", "!=", ">", "<"] as const) {
    const index = condition.indexOf(value);
    if (index >= 0) {
      return { value, index };
    }
  }

  return null;
}

function resolveParameterValue(
  id: string,
  definition: RecipeParameterDefinition,
  rawValue: unknown,
  context: Record<string, unknown>,
): string | number | boolean {
  const input = definition.input ?? inferInput(definition);

  if (input === "boolean") {
    return Boolean(rawValue);
  }

  if (input === "select") {
    const match = definition.options?.find((option) => String(option.value) === String(rawValue));
    return match?.value ?? definition.default;
  }

  const numeric = resolveNumberExpression(rawValue, context, `parameter ${id}`);
  if (DIMENSION_IDS.has(id) && numeric <= 0) {
    throw new Error(`Dimension parameter ${id} must be positive.`);
  }

  return clampParameterValue(id, numeric, definition, context);
}

function clampParameterValue(
  id: string,
  value: number,
  definition: RecipeParameterDefinition,
  context: Record<string, unknown>,
): number {
  const min = definition.min === undefined ? -Infinity : resolveNumberExpression(definition.min, context, `parameter ${id} min`);
  const max = definition.max === undefined ? Infinity : resolveNumberExpression(definition.max, context, `parameter ${id} max`);
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  return Math.min(safeMax, Math.max(safeMin, value));
}

function parameterDefinitionToSpec(id: string, definition: RecipeParameterDefinition): ParameterSpec {
  const input = definition.input ?? inferInput(definition);

  return {
    id,
    label: definition.label ?? id,
    kind: definition.kind ?? "other",
    input,
    defaultValue: normalizeDefaultValue(definition.default, input),
    ...(definition.unit ? { unit: definition.unit } : {}),
    ...(typeof definition.step === "number" ? { step: definition.step } : {}),
    ...(typeof definition.min === "number" ? { min: definition.min } : {}),
    ...(typeof definition.max === "number" ? { max: definition.max } : {}),
    ...(definition.options ? { options: definition.options } : {}),
  };
}

function inferInput(definition: RecipeParameterDefinition): ParameterSpec["input"] {
  if (typeof definition.default === "boolean") return "boolean";
  if (definition.options?.length) return "select";
  return "number";
}

function normalizeDefaultValue(value: unknown, input: ParameterSpec["input"]): string | number | boolean {
  if (input === "boolean") return Boolean(value);
  if (input === "select") {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : "";
  }
  return typeof value === "number" ? value : 0;
}
