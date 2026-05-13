import { generateFromRecipeDebug } from "@/domain/dieline/componentEngine";
import type { DielineComponentRecipe } from "@/domain/dieline/componentEngine";
import centeredTuckEndRecipe from "@/domain/dieline/recipes/foldingBox/centeredTuckEndCarton.v2.json";
import circularHangHoleRecipe from "@/domain/dieline/recipes/foldingBox/circularHangHole.v2.json";
import hangTabRecipe from "@/domain/dieline/recipes/foldingBox/hangTab.v2.json";
import lockingTabRecipe from "@/domain/dieline/recipes/foldingBox/lockingTabTopBottom.v2.json";
import tuckEndRecipe from "@/domain/dieline/recipes/foldingBox/tuckEndFoldingCarton.v2.json";

import { FoldingBoxExperimentalDebugClient } from "./FoldingBoxExperimentalDebugClient";

const INPUT_VALUES = { L: 120, W: 60, H: 160 };

const RECIPES = [
  { slug: "tuck-end-folding-carton", recipe: tuckEndRecipe },
  { slug: "centered-tuck-end-carton", recipe: centeredTuckEndRecipe },
  { slug: "folding-carton-box-with-locking-tab-on-top-and-bottom", recipe: lockingTabRecipe },
  { slug: "folding-carton-box-with-circular-hang-hole", recipe: circularHangHoleRecipe },
  { slug: "folding-carton-box-with-hang-tab", recipe: hangTabRecipe },
] as const;

export default function FoldingBoxExperimentalDebugPage() {
  const templates = RECIPES.map(({ recipe, slug }) => {
    const typedRecipe = recipe as DielineComponentRecipe & {
      experimentalStatus?: string;
      implementationStatus?: string;
    };
    const result = generateFromRecipeDebug(typedRecipe, INPUT_VALUES);

    return {
      anchors: result.anchors,
      graph: result.graph,
      inputValues: INPUT_VALUES,
      recipeId: typedRecipe.id,
      slug,
      status: {
        experimentalStatus: typedRecipe.experimentalStatus ?? "experimental",
        implementationStatus: typedRecipe.implementationStatus ?? "experimental-scaffold",
        productionReady: typedRecipe.productionReady,
        verificationStatus: typedRecipe.verificationStatus,
      },
      warnings: result.warnings,
    };
  });

  return <FoldingBoxExperimentalDebugClient templates={templates} />;
}
