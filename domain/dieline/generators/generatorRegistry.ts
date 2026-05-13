import type { DielineGraph, ParameterValueMap } from "../types";
import { generateFromRecipe } from "../componentEngine";
import reverseTuckEndV2Recipe from "../recipes/foldingBox/reverseTuckEnd.v2.json";
import straightTuckEndV2Recipe from "../recipes/foldingBox/straightTuckEnd.v2.json";
import { generateReverseTuckEnd } from "../templates/reverseTuckEnd";
import { generateStraightTuckEnd } from "../templates/straightTuckEnd";
import type { DielineComponentRecipe } from "../componentEngine";
import type { FoldingCartonInput } from "./foldingCarton/types";

export type DielineGenerator = (values?: ParameterValueMap) => DielineGraph;

export const DIELINE_GENERATOR_REGISTRY = {
  reverseTuckEndV2: (values = {}) => generateFromRecipe(reverseTuckEndV2Recipe as DielineComponentRecipe, values),
  straightTuckEndV2: (values = {}) => generateFromRecipe(straightTuckEndV2Recipe as DielineComponentRecipe, values),
  reverseTuckEnd: (values = {}) => generateReverseTuckEnd(values as FoldingCartonInput),
  straightTuckEnd: (values = {}) => generateStraightTuckEnd(values as FoldingCartonInput),
} satisfies Record<string, DielineGenerator>;

export type DielineGeneratorId = keyof typeof DIELINE_GENERATOR_REGISTRY;

export function hasDielineGenerator(generatorId: string): generatorId is DielineGeneratorId {
  return generatorId in DIELINE_GENERATOR_REGISTRY;
}

export function getDielineGenerator(generatorId: string): DielineGenerator {
  if (!hasDielineGenerator(generatorId)) {
    throw new Error(`No dieline generator registered for ${generatorId}`);
  }

  return DIELINE_GENERATOR_REGISTRY[generatorId];
}
