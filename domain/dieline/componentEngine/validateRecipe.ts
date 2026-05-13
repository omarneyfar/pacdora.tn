import { getPartContract } from "../partLibrary/partContracts";
import type { DielineComponentRecipe } from "./types";
import type { PartRegistryEntry } from "./types";

export type RecipeValidationResult = {
  warnings: string[];
};

export function validateRecipe(
  recipe: DielineComponentRecipe,
  registry: Map<string, PartRegistryEntry>,
): RecipeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const partIds = new Set<string>();

  if (recipe.schemaVersion !== "dieline-recipe-1.0") {
    errors.push(`Unsupported recipe schema version: ${recipe.schemaVersion}`);
  }

  if (!recipe.id) errors.push("Recipe id is required.");
  if (!recipe.family) errors.push("Recipe family is required.");
  if (!recipe.folding?.rootFace) errors.push("Recipe folding.rootFace is required.");
  if (recipe.productionReady) errors.push("V2 component recipes must not be productionReady yet.");

  if (!Array.isArray(recipe.parts) || recipe.parts.length === 0) {
    errors.push("Recipe must declare at least one part.");
  }

  for (const constraint of recipe.constraints ?? []) {
    if (!constraint.id) {
      errors.push("Every recipe constraint must have an id.");
    }

    if (constraint.severity !== "error" && constraint.severity !== "warning") {
      errors.push(`Constraint "${constraint.id}" must use severity "error" or "warning".`);
    }

    if (!constraint.condition || !constraint.message) {
      errors.push(`Constraint "${constraint.id}" must declare condition and message.`);
    }
  }

  for (const part of recipe.parts ?? []) {
    if (!part.id) {
      errors.push("Every recipe part must have an id.");
    } else if (partIds.has(part.id)) {
      errors.push(`Duplicate recipe part id: ${part.id}`);
    }

    if (part.id) partIds.add(part.id);

    if (!part.type || !registry.has(part.type)) {
      errors.push(`Unknown recipe part type: ${part.type}`);
      continue;
    }

    const registration = registry.get(part.type);
    if (!registration) {
      continue;
    }

    const contractId = part.contract ?? registration.contractId;
    if (!registration.allowedContractIds.includes(contractId)) {
      errors.push(
        `Recipe part "${part.id || "(unknown)"}" uses contract "${contractId}", but type "${part.type}" supports: ${registration.allowedContractIds.join(", ")}`,
      );
      continue;
    }

    try {
      const contract = getPartContract(contractId);
      if (contract.productionReady) {
        errors.push(`Part contract "${contract.id}" must not be productionReady yet.`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unknown part contract: ${contractId}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Recipe ${recipe.id || "(unknown)"} is invalid: ${errors.join("; ")}`);
  }

  return { warnings };
}
