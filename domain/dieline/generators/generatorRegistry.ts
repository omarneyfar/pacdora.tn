import type { DielineGraph, ParameterValueMap } from "../types";
import { generateFromRecipe } from "../componentEngine";

import reverseTuckEndV2Recipe from "../recipes/foldingBox/reverseTuckEnd.v2.json";
import straightTuckEndV2Recipe from "../recipes/foldingBox/straightTuckEnd.v2.json";

import tuckEndFoldingCartonV2Recipe from "../recipes/foldingBox/tuckEndFoldingCarton.v2.json";
import centeredTuckEndCartonV2Recipe from "../recipes/foldingBox/centeredTuckEndCarton.v2.json";
import lockingTabTopBottomV2Recipe from "../recipes/foldingBox/lockingTabTopBottom.v2.json";
import circularHangHoleV2Recipe from "../recipes/foldingBox/circularHangHole.v2.json";
import hangTabV2Recipe from "../recipes/foldingBox/hangTab.v2.json";

import { generateReverseTuckEnd } from "../templates/reverseTuckEnd";
import { generateStraightTuckEnd } from "../templates/straightTuckEnd";

import type { DielineComponentRecipe } from "../componentEngine";
import type { FoldingCartonInput } from "./foldingCarton/types";

export type DielineGenerator = (values?: ParameterValueMap) => DielineGraph;

function generateRecipeGraph(recipe: unknown, values: ParameterValueMap = {}): DielineGraph {
  return generateFromRecipe(recipe as DielineComponentRecipe, values);
}

const generateReverseTuckEndV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(reverseTuckEndV2Recipe, values);

const generateStraightTuckEndV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(straightTuckEndV2Recipe, values);

const generateTuckEndFoldingCartonV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(tuckEndFoldingCartonV2Recipe, values);

const generateCenteredTuckEndCartonV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(centeredTuckEndCartonV2Recipe, values);

const generateLockingTabTopBottomV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(lockingTabTopBottomV2Recipe, values);

const generateCircularHangHoleV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(circularHangHoleV2Recipe, values);

const generateHangTabV2: DielineGenerator = (values = {}) =>
  generateRecipeGraph(hangTabV2Recipe, values);

export const DIELINE_GENERATOR_REGISTRY = {
  // Stable public aliases using v2 internally.
  reverseTuckEnd: generateReverseTuckEndV2,
  straightTuckEnd: generateStraightTuckEndV2,

  // Explicit stable v2 IDs.
  reverseTuckEndV2: generateReverseTuckEndV2,
  straightTuckEndV2: generateStraightTuckEndV2,

  // Experimental public/dev aliases.
  tuckEndFoldingCarton: generateTuckEndFoldingCartonV2,
  centeredTuckEndCarton: generateCenteredTuckEndCartonV2,
  lockingTabTopBottom: generateLockingTabTopBottomV2,
  circularHangHole: generateCircularHangHoleV2,
  hangTab: generateHangTabV2,

  // Explicit experimental v2 IDs.
  tuckEndFoldingCartonV2: generateTuckEndFoldingCartonV2,
  centeredTuckEndCartonV2: generateCenteredTuckEndCartonV2,
  lockingTabTopBottomV2: generateLockingTabTopBottomV2,
  circularHangHoleV2: generateCircularHangHoleV2,
  hangTabV2: generateHangTabV2,

  // Legacy fallback only.
  reverseTuckEndLegacy: (values = {}) => generateReverseTuckEnd(values as FoldingCartonInput),
  straightTuckEndLegacy: (values = {}) => generateStraightTuckEnd(values as FoldingCartonInput),
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