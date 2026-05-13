import type { DielinePartGenerator } from "./types";
import type { DielineComponentRecipe } from "./types";

export function validateRecipe(
  recipe: DielineComponentRecipe,
  registry: Map<string, DielinePartGenerator>,
) {
  const errors: string[] = [];
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

  for (const part of recipe.parts ?? []) {
    if (!part.id) {
      errors.push("Every recipe part must have an id.");
    } else if (partIds.has(part.id)) {
      errors.push(`Duplicate recipe part id: ${part.id}`);
    }

    if (part.id) partIds.add(part.id);

    if (!part.type || !registry.has(part.type)) {
      errors.push(`Unknown recipe part type: ${part.type}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Recipe ${recipe.id || "(unknown)"} is invalid: ${errors.join("; ")}`);
  }
}
