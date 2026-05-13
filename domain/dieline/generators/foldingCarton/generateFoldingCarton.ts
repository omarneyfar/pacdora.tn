import { createTemplateMetadata } from "../../structure";
import type { DielineCrease, DielineFace, DielineGraph, DielineParameter, DielinePart, DielinePartRole, GeometryPrimitive, Point } from "../../types";
import { assembleGeometryPrimitives } from "./assembleGeometry";
import { createBodyStrip } from "./bodyStrip";
import { createDustFlapFaces, createPanelFlapFaces } from "./closures/dustFlaps";
import { createTuckEndFaces } from "./closures/tuckEnd";
import { buildFaceTree } from "./faceTree";
import { normalizeFoldingCartonParameters } from "./parameters";
import type { BodyStripResult, ClosureResult, ClosureSpec, FoldingCartonInput, FoldingCartonRecipe, NormalizedParams } from "./types";
import { validateFoldingCartonGraph } from "./validation";

const RIGHT_ANGLE = Math.PI / 2;

/**
 * Generate a DielineGraph for any folding-carton template using a recipe.
 *
 * The recipe describes the structural layout (panel order, glue tab position,
 * top/bottom closure types). The engine handles geometry creation, crease
 * wiring, faceTree assembly, and validation.
 */
export function generateFoldingCarton(
  input: FoldingCartonInput,
  recipe: FoldingCartonRecipe,
): DielineGraph {
  const params = normalizeFoldingCartonParameters(input);
  const strip = createBodyStrip(params, recipe);

  // Generate closure faces
  const topClosure = createClosureFaces(params, recipe.topClosure, "top", strip);
  const bottomClosure = createClosureFaces(params, recipe.bottomClosure, "bottom", strip);

  // Collect all faces
  const allFaces: DielineFace[] = [
    ...strip.faces,
    strip.glueTabFace,
    ...topClosure.faces,
    ...bottomClosure.faces,
  ];

  // Create structural creases
  const creases = createStructuralCreases(params, recipe, strip, allFaces);

  // Collect internal score lines
  const scoreLines: GeometryPrimitive[] = [
    ...topClosure.scoreLines,
    ...bottomClosure.scoreLines,
  ];

  // Assemble geometry primitives and cut paths
  const { cutPaths, geometry } = assembleGeometryPrimitives(allFaces, creases, scoreLines);

  // Build face tree
  const faceTree = buildFaceTree(recipe, allFaces, creases);

  // Build metadata
  const metadata = createTemplateMetadata({
    category: "folding-box",
    family: recipe.family,
    familyLabel: recipe.label,
    parts: buildParts(recipe, allFaces, creases),
    parameterSpecs: recipe.parameterSpecs,
    parameterValues: params,
    parameters: recipe.parameterSpecs?.map((spec): DielineParameter => ({
      id: spec.id,
      label: spec.label,
      kind: spec.kind,
      value: (params as Record<string, string | number | boolean>)[spec.id],
      ...(spec.unit ? { unit: spec.unit } : {}),
    })),
  });

  const graph: DielineGraph = {
    size: { width: strip.totalWidth, height: strip.totalHeight },
    faces: allFaces,
    creases,
    cutPaths,
    faceTree,
    geometry,
    metadata,
    source: { type: "template", templateId: recipe.id },
  };

  validateFoldingCartonGraph(graph, recipe.label);

  return graph;
}

// ── Closure face creation ──────────────────────────────────────

function createClosureFaces(
  params: NormalizedParams,
  closure: ClosureSpec,
  position: "top" | "bottom",
  strip: BodyStripResult,
): ClosureResult {
  if (closure.type === "none") return { faces: [], scoreLines: [] };

  const result: ClosureResult = { faces: [], scoreLines: [] };

  // Tuck flap
  if (closure.type === "tuck-end" && closure.tuckPanel) {
    const tuck = createTuckEndFaces(params, closure.tuckPanel, position, strip);
    result.faces.push(...tuck.faces);
    result.scoreLines.push(...tuck.scoreLines);
  }

  // Dust flaps
  if (closure.dustPanels?.length) {
    const dust = createDustFlapFaces(params, closure.dustPanels, position, strip);
    result.faces.push(...dust.faces);
  }

  // Panel flaps (STE-style)
  if (closure.panelFlaps?.length) {
    const panels = createPanelFlapFaces(params, closure.panelFlaps, position, strip);
    result.faces.push(...panels.faces);
  }

  return result;
}

// ── Structural crease creation ─────────────────────────────────

function createStructuralCreases(
  params: NormalizedParams,
  recipe: FoldingCartonRecipe,
  strip: BodyStripResult,
  allFaces: DielineFace[],
): DielineCrease[] {
  const faceIdSet = new Set(allFaces.map((f) => f.id));
  const creases: DielineCrease[] = [];
  const { panelOrder } = recipe.body;

  // Panel-to-panel vertical creases
  for (let i = 0; i < panelOrder.length - 1; i++) {
    const leftPanel = panelOrder[i];
    const rightPanel = panelOrder[i + 1];
    const rightCol = strip.columnsByFaceId.get(rightPanel);
    if (!rightCol) continue;
    creases.push(crease(
      `cr-${leftPanel}-${rightPanel}`, leftPanel, rightPanel,
      { x: rightCol.x, y: strip.bodyTop },
      { x: rightCol.x, y: strip.bodyBottom },
    ));
  }

  // Glue tab crease
  const glueCol = strip.columnsByFaceId.get("glue-tab");
  const gluePanel = recipe.body.glueTabAttachedTo;
  const gluePanelCol = strip.columnsByFaceId.get(gluePanel);
  if (glueCol && gluePanelCol) {
    const edgeX = recipe.body.glueTabSide === "before" ? gluePanelCol.x : gluePanelCol.x + gluePanelCol.width;
    creases.push(crease(
      `cr-${gluePanel}-glue`, gluePanel, "glue-tab",
      { x: edgeX, y: strip.bodyTop },
      { x: edgeX, y: strip.bodyBottom },
    ));
  }

  // Closure creases (horizontal, at bodyTop or bodyBottom)
  const addClosureCreases = (closure: ClosureSpec, position: "top" | "bottom") => {
    const y = position === "top" ? strip.bodyTop : strip.bodyBottom;

    if (closure.tuckPanel) {
      const col = strip.columnsByFaceId.get(closure.tuckPanel);
      const faceId = `${position}-tuck`;
      if (col && faceIdSet.has(faceId)) {
        creases.push(crease(
          `cr-${closure.tuckPanel}-${position}tuck`, closure.tuckPanel, faceId,
          { x: col.x, y }, { x: col.x + col.width, y },
        ));
      }
    }

    for (const panelId of closure.dustPanels ?? []) {
      const col = strip.columnsByFaceId.get(panelId);
      const faceId = `${position}-dust-${panelId}`;
      if (col && faceIdSet.has(faceId)) {
        creases.push(crease(
          `cr-${panelId}-${position}dust`, panelId, faceId,
          { x: col.x, y }, { x: col.x + col.width, y },
        ));
      }
    }

    for (const panelId of closure.panelFlaps ?? []) {
      const col = strip.columnsByFaceId.get(panelId);
      const faceId = `${position}-panel`;
      if (col && faceIdSet.has(faceId)) {
        creases.push(crease(
          `cr-${panelId}-${position}panel`, panelId, faceId,
          { x: col.x, y }, { x: col.x + col.width, y },
        ));
      }
    }
  };

  addClosureCreases(recipe.topClosure, "top");
  addClosureCreases(recipe.bottomClosure, "bottom");

  return creases;
}

function crease(id: string, faceA: string, faceB: string, edgeStart: Point, edgeEnd: Point): DielineCrease {
  return { id, faceA, faceB, edgeStart, edgeEnd, foldAngle: RIGHT_ANGLE, direction: 1 };
}

// ── Metadata parts ─────────────────────────────────────────────

function buildParts(recipe: FoldingCartonRecipe, faces: DielineFace[], creases: DielineCrease[]) {
  const faceIdSet = new Set(faces.map((f) => f.id));
  const creaseIdSet = new Set(creases.map((c) => c.id));

  const bodyCreaseIds = creases
    .filter((c) => recipe.body.panelOrder.includes(c.faceA) && recipe.body.panelOrder.includes(c.faceB))
    .map((c) => c.id);

  const parts: DielinePart[] = [
    {
      id: "body-panels",
      label: "Body panels",
      role: "body",
      faceIds: recipe.body.panelOrder.filter((id) => faceIdSet.has(id)),
      creaseIds: bodyCreaseIds.filter((id) => creaseIdSet.has(id)),
    },
  ];

  const addClosurePart = (closure: ClosureSpec, position: "top" | "bottom") => {
    const faceIds: string[] = [];
    const partCreaseIds: string[] = [];

    if (closure.tuckPanel) {
      const faceId = `${position}-tuck`;
      if (faceIdSet.has(faceId)) faceIds.push(faceId);
      const cId = `cr-${closure.tuckPanel}-${position}tuck`;
      if (creaseIdSet.has(cId)) partCreaseIds.push(cId);
    }
    for (const panelId of closure.dustPanels ?? []) {
      const faceId = `${position}-dust-${panelId}`;
      if (faceIdSet.has(faceId)) faceIds.push(faceId);
      const cId = `cr-${panelId}-${position}dust`;
      if (creaseIdSet.has(cId)) partCreaseIds.push(cId);
    }
    for (const panelId of closure.panelFlaps ?? []) {
      const faceId = `${position}-panel`;
      if (faceIdSet.has(faceId)) faceIds.push(faceId);
      const cId = `cr-${panelId}-${position}panel`;
      if (creaseIdSet.has(cId)) partCreaseIds.push(cId);
    }

    if (faceIds.length > 0) {
      parts.push({
        id: `${position}-closure`,
        label: `${position.charAt(0).toUpperCase() + position.slice(1)} closure`,
        role: `${position}-closure` as DielinePartRole,
        faceIds,
        creaseIds: partCreaseIds,
      });
    }
  };

  addClosurePart(recipe.topClosure, "top");
  addClosurePart(recipe.bottomClosure, "bottom");

  if (faceIdSet.has("glue-tab")) {
    const glueCreaseId = `cr-${recipe.body.glueTabAttachedTo}-glue`;
    parts.push({
      id: "glue-tab",
      label: "Glue tab",
      role: "glue-flap",
      faceIds: ["glue-tab"],
      creaseIds: creaseIdSet.has(glueCreaseId) ? [glueCreaseId] : [],
    });
  }

  return parts;
}
