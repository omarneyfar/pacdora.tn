import { generateFromRecipe, generateFromRecipeDebug } from "@/domain/dieline/componentEngine";
import type { Anchor, DielineComponentRecipe } from "@/domain/dieline/componentEngine";
import { generateGraphFromCatalogTemplate } from "@/domain/dieline/catalog";
import reverseTuckEndV2Recipe from "@/domain/dieline/recipes/foldingBox/reverseTuckEnd.v2.json";
import type { DielineGraph } from "@/domain/dieline/types";

import { ReverseTuckEndV2DebugClient } from "./ReverseTuckEndV2DebugClient";

const INPUT_VALUES = { L: 120, W: 60, H: 160 };
const CATALOG_TEMPLATE_ID = "reverse-tuck-end-folding-carton-box";

export default function ReverseTuckEndV2DebugPage() {
  const recipe = reverseTuckEndV2Recipe as DielineComponentRecipe;
  const graph = generateFromRecipe(recipe, INPUT_VALUES);
  const debugResult = generateFromRecipeDebug(recipe, INPUT_VALUES);
  const catalogResult = generateGraphFromCatalogTemplate(CATALOG_TEMPLATE_ID, INPUT_VALUES);

  return (
    <ReverseTuckEndV2DebugClient
      anchors={debugResult.anchors}
      catalogComparison={compareGraphs(graph, catalogResult.graph)}
      catalogGraph={catalogResult.graph}
      catalogResolvedParameters={catalogResult.resolvedParameters}
      debugComparison={compareGraphs(graph, debugResult.graph)}
      graph={graph}
      inputValues={INPUT_VALUES}
      recipeId={recipe.id}
      warnings={debugResult.warnings}
    />
  );
}

function compareGraphs(left: DielineGraph, right: DielineGraph): DebugGraphComparison {
  const differences: string[] = [];
  const leftFaceIds = left.faces.map((face) => face.id);
  const rightFaceIds = right.faces.map((face) => face.id);
  const leftCreaseIds = left.creases.map((crease) => crease.id);
  const rightCreaseIds = right.creases.map((crease) => crease.id);

  if (!sameStringArray(leftFaceIds, rightFaceIds)) {
    differences.push(`face IDs differ: ${leftFaceIds.join(", ")} vs ${rightFaceIds.join(", ")}`);
  }

  if (!sameStringArray(leftCreaseIds, rightCreaseIds)) {
    differences.push(`crease IDs differ: ${leftCreaseIds.join(", ")} vs ${rightCreaseIds.join(", ")}`);
  }

  if (!close(left.size.width, right.size.width) || !close(left.size.height, right.size.height)) {
    differences.push(`graph size differs: ${format(left.size.width)}x${format(left.size.height)} vs ${format(right.size.width)}x${format(right.size.height)}`);
  }

  const rightFaces = new Map(right.faces.map((face) => [face.id, face]));
  for (const face of left.faces) {
    const match = rightFaces.get(face.id);
    if (!match) continue;

    if (
      !close(face.bounds.x, match.bounds.x) ||
      !close(face.bounds.y, match.bounds.y) ||
      !close(face.bounds.width, match.bounds.width) ||
      !close(face.bounds.height, match.bounds.height)
    ) {
      differences.push(
        `${face.id} bounds differ: ${boundsLabel(face.bounds)} vs ${boundsLabel(match.bounds)}`,
      );
    }
  }

  const leftGeometryCount = left.geometry?.length ?? 0;
  const rightGeometryCount = right.geometry?.length ?? 0;
  if (leftGeometryCount !== rightGeometryCount) {
    differences.push(`geometry primitive count differs: ${leftGeometryCount} vs ${rightGeometryCount}`);
  }

  return { ok: differences.length === 0, differences };
}

function sameStringArray(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.01;
}

function boundsLabel(bounds: DielineGraph["faces"][number]["bounds"]): string {
  return `x=${format(bounds.x)}, y=${format(bounds.y)}, w=${format(bounds.width)}, h=${format(bounds.height)}`;
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export type DebugGraphComparison = {
  ok: boolean;
  differences: string[];
};

export type ReverseTuckEndV2DebugPayload = {
  anchors: Anchor[];
  catalogComparison: DebugGraphComparison;
  catalogGraph: DielineGraph;
  catalogResolvedParameters: Record<string, string | number | boolean>;
  debugComparison: DebugGraphComparison;
  graph: DielineGraph;
  inputValues: typeof INPUT_VALUES;
  recipeId: string;
  warnings: string[];
};
