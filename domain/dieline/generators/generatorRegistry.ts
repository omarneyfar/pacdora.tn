import type { DielineGraph, ParameterValueMap } from "../types";
import { generateReverseTuckEnd } from "../templates/reverseTuckEnd";
import { generateStraightTuckEnd } from "../templates/straightTuckEnd";
import type { FoldingCartonInput } from "./foldingCarton/types";

export type DielineGenerator = (values?: ParameterValueMap) => DielineGraph;

export const DIELINE_GENERATOR_REGISTRY = {
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
