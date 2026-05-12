import type { DielineGraph, ParameterValueMap } from "../types";
import { generateReverseTuckEnd, type ReverseTuckEndParameters } from "../templates/reverseTuckEnd";
import { generateStraightTuckEnd } from "../templates/straightTuckEnd";

export type DielineGenerator = (values?: ParameterValueMap) => DielineGraph;

export const DIELINE_GENERATOR_REGISTRY = {
  reverseTuckEnd: (values = {}) => generateReverseTuckEnd(values as ReverseTuckEndParameters),
  straightTuckEnd: (values = {}) => generateStraightTuckEnd(toLegacyCartonDimensions(values)),
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

function toLegacyCartonDimensions(values: ParameterValueMap) {
  return {
    width: toNumber(values.L ?? values.width ?? values.length, 80),
    height: toNumber(values.H ?? values.height, 120),
    depth: toNumber(values.W ?? values.depth ?? values.width, 40),
  };
}

function toNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}
