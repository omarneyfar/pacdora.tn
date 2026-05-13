import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const outputDir = path.join(scriptsDir, "output", "component-engine");
const moduleCache = new Map();
const ANCHOR_EPSILON = 0.000001;

const { generateFromRecipe, generateFromRecipeDebug } = loadTs(path.join(projectRoot, "domain", "dieline", "componentEngine"));
const { validateDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation", "validateDielineGraph"));

const reverseRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "reverseTuckEnd.v2.json"));
const straightRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "straightTuckEnd.v2.json"));
const tuckEndRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "tuckEndFoldingCarton.v2.json"));
const centeredTuckRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "centeredTuckEndCarton.v2.json"));
const lockingTabRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "lockingTabTopBottom.v2.json"));
const circularHangHoleRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "circularHangHole.v2.json"));
const hangTabRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "hangTab.v2.json"));
const stressCases = [
  { name: "120x40x160", input: { L: 120, W: 40, H: 160 } },
  { name: "120x60x160", input: { L: 120, W: 60, H: 160 } },
  { name: "120x90x160", input: { L: 120, W: 90, H: 160 } },
  { name: "80x40x120", input: { L: 80, W: 40, H: 120 } },
  { name: "200x80x250", input: { L: 200, W: 80, H: 250 } },
];
const tuckEndReferenceCases = [
  { name: "120x40x160", input: { L: 120, W: 40, H: 160 } },
  { name: "120x60x160", input: { L: 120, W: 60, H: 160 } },
  { name: "120x90x160", input: { L: 120, W: 90, H: 160 } },
  { name: "180x98x280", input: { L: 180, W: 98, H: 280 } },
  { name: "reference-size", input: { L: 180.5, W: 98, H: 280 } },
];
const extremeCases = [
  {
    name: "very-tall-narrow",
    input: { L: 80, W: 20, H: 300 },
    expectedWarnings: ["height-width-ratio-too-large"],
  },
  {
    name: "very-wide-shallow",
    input: { L: 300, W: 120, H: 30 },
    expectedWarnings: ["height-width-ratio-too-small", "tuck-flap-too-large-for-body-height"],
  },
  {
    name: "small-W-large-H",
    input: { L: 80, W: 8, H: 240 },
    expectedWarnings: ["width-very-small-for-handling", "height-width-ratio-too-large"],
  },
  {
    name: "large-W-small-H",
    input: { L: 300, W: 160, H: 30 },
    expectedWarnings: ["height-width-ratio-too-small", "tuck-flap-too-large-for-body-height"],
  },
  {
    name: "very-large-L-compared-to-W",
    input: { L: 400, W: 30, H: 120 },
    expectedWarnings: ["length-width-ratio-too-large"],
  },
  {
    name: "very-small-L-compared-to-W",
    input: { L: 18, W: 120, H: 120 },
    expectedWarnings: ["length-very-small-for-handling", "width-length-ratio-too-large"],
  },
];
const summaryRows = [];
const invariantNames = new Set();
const outputFiles = [];
const experimentalTemplates = [
  {
    label: "Tuck End Folding Carton v2",
    recipe: tuckEndRecipe,
    filePrefix: "tuck-end-folding-carton",
    cases: tuckEndReferenceCases,
  },
  {
    label: "Centered Tuck End Carton v2",
    recipe: centeredTuckRecipe,
    filePrefix: "centered-tuck-end-carton",
    cases: experimentalCases({ L: 120, W: 60, H: 160 }),
  },
  {
    label: "Locking Tab Top/Bottom v2",
    recipe: lockingTabRecipe,
    filePrefix: "folding-carton-box-with-locking-tab-on-top-and-bottom",
    cases: experimentalCases({ L: 120, W: 60, H: 160 }),
  },
  {
    label: "Circular Hang Hole v2",
    recipe: circularHangHoleRecipe,
    filePrefix: "folding-carton-box-with-circular-hang-hole",
    cases: experimentalCases({ L: 120, W: 60, H: 160 }),
  },
  {
    label: "Hang Tab v2",
    recipe: hangTabRecipe,
    filePrefix: "folding-carton-box-with-hang-tab",
    cases: experimentalCases({ L: 120, W: 60, H: 160 }),
  },
];

fs.mkdirSync(outputDir, { recursive: true });

assertEngineFailures(reverseRecipe);
assertSlotCutoutFailures(tuckEndRecipe);
assertRoundedSlotCutoutPart(tuckEndRecipe);
assertReliefNotchPart(tuckEndRecipe);
assertRecipeLoads(reverseRecipe, "Reverse Tuck End v2");
assertRecipeLoads(straightRecipe, "Straight Tuck End v2");
for (const template of experimentalTemplates) {
  assertRecipeLoads(template.recipe, template.label);
  assertReferencePendingRecipe(template.recipe, template.label);
}

runStressSuite("RTE v2", reverseRecipe, "reverse-tuck-end");
runStressSuite("STE v2", straightRecipe, "straight-tuck-end");
runExtremeSuite("RTE v2", reverseRecipe, "reverse-tuck-end");
runExtremeSuite("STE v2", straightRecipe, "straight-tuck-end");
for (const template of experimentalTemplates) {
  runReferencePendingSuite(template);
}

printSummaryTable(summaryRows);
console.log(`Invariant checks passed: ${Array.from(invariantNames).sort().join(", ")}`);
console.log(`Debug SVG files written: ${outputFiles.map((file) => path.relative(projectRoot, file)).join(", ")}`);
console.log("Component engine verification passed.");

function assertRecipeLoads(recipe, label) {
  const result = generateFromRecipeDebug(recipe);
  const validation = validateDielineGraph(result.graph);

  assert(validation.ok, `${label}: v2 graph is invalid: ${validation.errors.join("; ")}`);
  assert(result.graph.metadata?.parameterValues?.generatorVersion === "component-engine-v2", `${label}: missing v2 metadata`);
  assert(result.graph.metadata?.catalog === undefined, `${label}: hidden v2 graph must not attach catalog runtime metadata`);
  assert(result.graph.creases.every((crease) => !crease.id.startsWith("score-")), `${label}: score lines must not be structural creases`);
  assert(result.graph.geometry?.some((primitive) => primitive.id.startsWith("score-") && primitive.layer === "crease"), `${label}: expected score-line geometry`);
}

function assertReferencePendingRecipe(recipe, label) {
  assert(recipe.productionReady === false, `${label}: reference-pending recipe must remain productionReady=false`);
  assert(recipe.verificationStatus === "geometry-needs-verification", `${label}: reference-pending recipe must remain geometry-needs-verification`);
  assert(recipe.experimentalStatus === "reference-pending", `${label}: recipe must be marked reference-pending`);
  assert(
    recipe.implementationStatus === "custom-closure-scaffold" || recipe.implementationStatus === "experimental-scaffold",
    `${label}: recipe must be marked as a hidden experimental scaffold`,
  );
}

function experimentalCases(referenceInput) {
  return [
    { name: "120x40x160", input: { L: 120, W: 40, H: 160 } },
    { name: "120x60x160", input: { L: 120, W: 60, H: 160 } },
    { name: "120x90x160", input: { L: 120, W: 90, H: 160 } },
    { name: "reference-size", input: referenceInput },
  ];
}

function assertEngineFailures(recipe) {
  expectThrow(() => generateFromRecipe(withPart(recipe, { id: "bad-part", type: "unknown-part" })), "unknown part type should fail");

  const missingAnchor = clone(recipe);
  missingAnchor.parts = missingAnchor.parts.map((part, index) => index === 1 ? { ...part, attachTo: "missing.anchor" } : part);
  expectThrow(() => generateFromRecipe(missingAnchor), "missing anchor should fail");

  const badFormula = clone(recipe);
  badFormula.parts = badFormula.parts.map((part, index) => index === 0 ? { ...part, topBand: "W +" } : part);
  expectThrow(() => generateFromRecipe(badFormula), "invalid formula should fail");

  expectThrow(() => generateFromRecipe(recipe, { L: -10 }), "negative dimensions should fail");
  expectThrow(() => generateFromRecipe(recipe, { W: 0 }), "zero dimensions should fail");
  expectThrow(() => generateFromRecipe(recipe, { W: Number.NaN }), "non-finite dimensions should fail");
}

function assertSlotCutoutFailures(recipe) {
  const slotRecipe = withLegacySlotCutout(recipe);

  const smoke = generateFromRecipeDebug(slotRecipe, { L: 180, W: 98, H: 280 });
  assert(smoke.graph.geometry?.some((primitive) => primitive.id === "legacy-slot-cutout-smoke" && primitive.type === "slot"), "slot-cutout smoke primitive missing");

  const missingAnchor = clone(slotRecipe);
  missingAnchor.parts = missingAnchor.parts.map((part) => part.id === "legacy-slot-cutout-smoke" ? { ...part, attachTo: "missing.anchor" } : part);
  expectThrow(() => generateFromRecipe(missingAnchor), "slot cutout missing anchor should fail");

  const outsideFace = clone(slotRecipe);
  outsideFace.parts = outsideFace.parts.map((part) => part.id === "legacy-slot-cutout-smoke" ? { ...part, width: "L * 2" } : part);
  expectThrow(() => generateFromRecipe(outsideFace), "slot cutout outside target face should fail");

  const onFold = clone(slotRecipe);
  onFold.parts = onFold.parts.map((part) => part.id === "legacy-slot-cutout-smoke" ? { ...part, inset: "SDS / 2" } : part);
  expectThrow(() => generateFromRecipe(onFold), "slot cutout overlapping fold zone should fail");

  const onGlue = clone(slotRecipe);
  onGlue.parts = onGlue.parts.map((part) => part.id === "legacy-slot-cutout-smoke" ? { ...part, attachTo: "glue-tab" } : part);
  expectThrow(() => generateFromRecipe(onGlue), "slot cutout on glue zone should fail");
}

function withLegacySlotCutout(recipe) {
  const slotRecipe = clone(recipe);
  const topIndex = slotRecipe.parts.findIndex((part) => part.id === "top-slotted-tuck");
  assert(topIndex >= 0, "slot-cutout smoke test requires top-slotted-tuck");
  slotRecipe.parts.splice(topIndex + 1, 0, {
    id: "legacy-slot-cutout-smoke",
    type: "slot-cutout",
    attachTo: "top-tuck.bottom",
    width: "SL * 0.6",
    height: "SW",
    radius: "SW / 2",
    inset: "SOF + SW * 2",
    offsetAlong: "L / 2",
    safeDistance: "SDS",
  });
  return slotRecipe;
}

function assertRoundedSlotCutoutPart(recipe) {
  const explicitSlot = clone(recipe);
  const topIndex = explicitSlot.parts.findIndex((part) => part.id === "top-slotted-tuck");
  explicitSlot.parts.splice(topIndex + 1, 0, {
    id: "explicit-rounded-slot",
    type: "rounded-slot-cutout",
    attachTo: "top-tuck.bottom",
    width: "SL * 0.72",
    height: "SW",
    radius: "SW / 2",
    orientation: "horizontal",
    offsetFromBase: "SOF + SW * 2",
    centeredOnAnchor: true,
    margin: "SDS",
    referencePending: true,
  });

  const result = generateFromRecipeDebug(explicitSlot, { L: 180, W: 98, H: 280 });
  const slot = result.graph.geometry?.find((primitive) => primitive.id === "explicit-rounded-slot");
  assert(slot?.type === "slot" && slot.layer === "hole", "rounded-slot-cutout should generate a hole slot primitive");
  assert(result.warnings.some((warning) => warning.includes("reference-pending")), "rounded-slot-cutout should warn when reference-pending");

  const outside = clone(explicitSlot);
  outside.parts = outside.parts.map((part) => part.id === "explicit-rounded-slot" ? { ...part, width: "L * 2" } : part);
  expectThrow(() => generateFromRecipe(outside, { L: 180, W: 98, H: 280 }), "rounded-slot-cutout outside face should fail");

  const onCrease = clone(explicitSlot);
  onCrease.parts = onCrease.parts.map((part) => part.id === "explicit-rounded-slot" ? { ...part, offsetFromBase: "SDS / 2" } : part);
  expectThrow(() => generateFromRecipe(onCrease, { L: 180, W: 98, H: 280 }), "rounded-slot-cutout too close to crease should fail");
}

function assertReliefNotchPart(recipe) {
  const invalid = clone(recipe);
  invalid.parts = invalid.parts.map((part) => part.type === "relief-notch" ? { ...part, width: 0 } : part);
  expectThrow(() => generateFromRecipe(invalid), "relief-notch zero width should fail");
}

function runStressSuite(templateLabel, recipe, filePrefix) {
  for (const { name, input } of stressCases) {
    const caseLabel = `${templateLabel} ${name}`;
    const result = generateFromRecipeDebug(recipe, input);
    const v2 = result.graph;
    const validation = validateDielineGraph(v2);
    const warningCount = [...result.warnings, ...validation.warnings].length;

    assert(validation.ok, `${caseLabel}: v2 graph invalid: ${validation.errors.join("; ")}`);
    assert(warningCount === 0, `${caseLabel}: normal stress case should not produce warnings`);
    assertInvariants(caseLabel, recipe, result);

    const outputPath = path.join(outputDir, `${filePrefix}-v2-${name}.debug.svg`);
    fs.writeFileSync(outputPath, renderDebugSvg(result), "utf8");
    outputFiles.push(outputPath);

    summaryRows.push({
      template: templateLabel,
      size: name,
      faces: v2.faces.length,
      creases: v2.creases.length,
      geometry: v2.geometry?.length ?? 0,
      anchors: result.anchors.length,
      warnings: warningCount,
      status: "pass",
    });
  }
}

function runExtremeSuite(templateLabel, recipe, filePrefix) {
  for (const current of extremeCases) {
    const caseLabel = `${templateLabel} ${current.name}`;

    const result = generateFromRecipeDebug(recipe, current.input);
    const validation = validateDielineGraph(result.graph);
    const warnings = [...result.warnings, ...validation.warnings];

    assert(validation.ok, `${caseLabel}: unusual but possible case should still generate a valid graph`);
    assert(warnings.length > 0, `${caseLabel}: expected proportion warnings`);
    for (const expectedWarning of current.expectedWarnings) {
      assert(warnings.some((warning) => warning.includes(expectedWarning)), `${caseLabel}: expected warning ${expectedWarning}`);
    }
    assertInvariants(caseLabel, recipe, result);

    const outputPath = path.join(outputDir, `${filePrefix}-v2-extreme-${current.name}.debug.svg`);
    fs.writeFileSync(outputPath, renderDebugSvg(result), "utf8");
    outputFiles.push(outputPath);

    summaryRows.push({
      template: templateLabel,
      size: current.name,
      faces: result.graph.faces.length,
      creases: result.graph.creases.length,
      geometry: result.graph.geometry?.length ?? 0,
      anchors: result.anchors.length,
      warnings: warnings.length,
      status: "warning",
    });
  }
}

function runReferencePendingSuite(template) {
  const { label: templateLabel, recipe, filePrefix, cases } = template;

  for (const { name, input } of cases) {
    const caseLabel = `${templateLabel} ${name}`;
    const result = generateFromRecipeDebug(recipe, input);
    const validation = validateDielineGraph(result.graph);
    const warningCount = [...result.warnings, ...validation.warnings].length;

    assert(validation.ok, `${caseLabel}: reference-pending scaffold should remain graph-valid: ${validation.errors.join("; ")}`);
    assertInvariants(caseLabel, recipe, result);

    const outputPath = path.join(outputDir, `${filePrefix}-v2-${name}.debug.svg`);
    fs.writeFileSync(outputPath, renderDebugSvg(result), "utf8");
    outputFiles.push(outputPath);

    summaryRows.push({
      template: templateLabel,
      size: name,
      faces: result.graph.faces.length,
      creases: result.graph.creases.length,
      geometry: result.graph.geometry?.length ?? 0,
      anchors: result.anchors.length,
      warnings: warningCount,
      status: "reference-pending",
    });
  }

  for (const current of extremeCases) {
    const caseLabel = `${templateLabel} ${current.name}`;
    const result = generateFromRecipeDebug(recipe, current.input);
    const validation = validateDielineGraph(result.graph);
    const warnings = [...result.warnings, ...validation.warnings];

    assert(validation.ok, `${caseLabel}: reference-pending scaffold should remain graph-valid`);
    assert(warnings.length > 0, `${caseLabel}: expected experimental/proportion warnings`);
    assertInvariants(caseLabel, recipe, result);

    const outputPath = path.join(outputDir, `${filePrefix}-v2-extreme-${current.name}.debug.svg`);
    fs.writeFileSync(outputPath, renderDebugSvg(result), "utf8");
    outputFiles.push(outputPath);

    summaryRows.push({
      template: templateLabel,
      size: current.name,
      faces: result.graph.faces.length,
      creases: result.graph.creases.length,
      geometry: result.graph.geometry?.length ?? 0,
      anchors: result.anchors.length,
      warnings: warnings.length,
      status: "reference-pending",
    });
  }
}

function assertInvariants(label, recipe, result) {
  const graph = result.graph;
  const anchorsById = new Map(result.anchors.map((anchor) => [anchor.id, anchor]));
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));
  const creaseById = new Map(graph.creases.map((crease) => [crease.id, crease]));
  const creaseByPair = new Map();
  const anchorByFaceEdge = new Map(result.anchors.map((anchor) => [`${anchor.faceId}.${anchor.edge}`, anchor]));

  trackInvariant("generated graph validates");
  assert(validateDielineGraph(graph).ok, `${label}: generated graph does not validate`);

  trackInvariant("no duplicate face IDs");
  assertUnique(graph.faces.map((face) => face.id), `${label}: duplicate face id`);

  trackInvariant("no duplicate crease IDs");
  assertUnique(graph.creases.map((crease) => crease.id), `${label}: duplicate crease id`);

  trackInvariant("no duplicate geometry IDs");
  assertUnique((graph.geometry ?? []).map((primitive) => primitive.id), `${label}: duplicate geometry id`);

  trackInvariant("no duplicate anchor IDs");
  assertUnique(result.anchors.map((anchor) => anchor.id), `${label}: duplicate anchor id`);

  trackInvariant("no self-referencing structural creases");
  for (const crease of graph.creases) {
    assert(crease.faceA !== crease.faceB, `${label}: crease ${crease.id} references one face twice`);
    creaseByPair.set(`${crease.faceA}|${crease.faceB}`, crease);
    creaseByPair.set(`${crease.faceB}|${crease.faceA}`, crease);
  }

  trackInvariant("internal score lines are GeometryPrimitive only");
  assert(graph.creases.every((crease) => !crease.id.startsWith("score-")), `${label}: score line found in structural creases`);
  assert((graph.geometry ?? []).some((primitive) => primitive.id.startsWith("score-") && primitive.layer === "crease"), `${label}: score line geometry missing`);

  trackInvariant("internal score lines stay inside their faces");
  assertScoreLinesInsideFaces(label, graph);

  trackInvariant("slot cutouts stay inside face and away from cut/fold/glue zones");
  assertSlotCutoutGeometry(label, graph, recipe, anchorsById, faceById);

  trackInvariant("hole and window cutouts stay inside non-glue faces");
  assertHoleAndWindowGeometry(label, graph);

  trackInvariant("relief notches are geometry-only finite cut paths");
  assertReliefNotchGeometry(label, graph, recipe);

  trackInvariant("every attachTo resolves to an anchor");
  trackInvariant("every structural crease base matches attachTo anchor");
  for (const part of recipe.parts) {
    if (part.attachToFace) {
      trackInvariant("every attachToFace resolves to a face");
      assert(faceById.has(part.attachToFace), `${label}: attachToFace did not resolve: ${part.attachToFace}`);
    }

    if (!part.attachTo) continue;

    if (isGeometryOnlyOrAnchorHelperPart(part.type)) {
      trackInvariant("geometry-only cutouts attach to a face or anchor");
      assert(anchorsById.has(part.attachTo) || faceById.has(part.attachTo), `${label}: ${part.type} attachTo did not resolve: ${part.attachTo}`);
      continue;
    }

    const anchor = anchorsById.get(part.attachTo);
    assert(anchor, `${label}: attachTo did not resolve: ${part.attachTo}`);
    const childFaceId = childFaceIdForPart(part, anchor.faceId, anchor.edge);
    const crease = creaseByPair.get(`${anchor.faceId}|${childFaceId}`);
    assert(crease, `${label}: missing crease for ${part.id} from ${anchor.faceId} to ${childFaceId}`);
    assertPointClose(crease.edgeStart, anchor.start, `${label}: ${crease.id}.edgeStart`, ANCHOR_EPSILON);
    assertPointClose(crease.edgeEnd, anchor.end, `${label}: ${crease.id}.edgeEnd`, ANCHOR_EPSILON);
    assert(faceById.has(childFaceId), `${label}: missing child face ${childFaceId}`);

    if (part.type === "glue-tab") {
      trackInvariant("glue tab attaches exactly to configured seam anchor");
      assertPointClose(crease.edgeStart, anchor.start, `${label}: glue tab seam start`, ANCHOR_EPSILON);
      assertPointClose(crease.edgeEnd, anchor.end, `${label}: glue tab seam end`, ANCHOR_EPSILON);
    }

    if (part.type === "dust-flap" || part.type === "custom-dust-flap") {
      trackInvariant("dust flaps attach exactly to side panel anchors");
      assert(anchor.faceId === "left" || anchor.faceId === "right", `${label}: dust flap ${part.id} must attach to a side panel`);
      assert(anchor.edge === "top" || anchor.edge === "bottom", `${label}: dust flap ${part.id} must attach to top/bottom anchor`);
    }
  }

  trackInvariant("tuck flaps have full-width anchor bases and clean bounds");
  assertTuckFlapGeometry(label, graph, recipe, anchorsById);

  trackInvariant("dust flaps are clean anchored polygons");
  assertDustFlapGeometry(label, graph, recipe, anchorsById);

  if (recipe.family === "reverse-tuck-end") {
    trackInvariant("top-tuck base equals front.top for RTE");
    assertSpecificCreaseMatchesAnchor(label, creaseById, anchorsById, "cr-front-toptuck", "front.top");

    trackInvariant("bottom-tuck base equals back.bottom for RTE");
    assertSpecificCreaseMatchesAnchor(label, creaseById, anchorsById, "cr-back-bottomtuck", "back.bottom");
  }

  if (recipe.family === "straight-tuck-end") {
    trackInvariant("standard STE has no top-panel or bottom-panel");
    assert(!faceById.has("top-panel"), `${label}: standard STE must not include top-panel`);
    assert(!faceById.has("bottom-panel"), `${label}: standard STE must not include bottom-panel`);
    assert(!anchorByFaceEdge.has("top-panel.top"), `${label}: standard STE must not include top-panel anchors`);
    assert(!anchorByFaceEdge.has("bottom-panel.bottom"), `${label}: standard STE must not include bottom-panel anchors`);
  }
}

function assertSlotCutoutGeometry(label, graph, recipe, anchorsById, faceById) {
  const slotParts = recipe.parts.filter((candidate) => candidate.type === "slot-cutout" || candidate.type === "rounded-slot-cutout");
  const slots = (graph.geometry ?? []).filter((primitive) => primitive.type === "slot");
  const safeDistance = Number(graph.metadata?.parameterValues?.SDS ?? 0);

  assert(slots.length >= slotParts.length, `${label}: expected at least ${slotParts.length} slot cutouts, got ${slots.length}`);

  for (const slotPart of slotParts) {
    const slot = slots.find((primitive) => primitive.id === slotPart.id);
    const anchor = anchorsById.get(slotPart.attachTo);
    const targetFace = anchor ? faceById.get(anchor.faceId) : faceById.get(slotPart.attachTo);

    assert(slot, `${label}: missing slot primitive ${slotPart.id}`);
    assert(slot.layer === "hole", `${label}: slot ${slot.id} must be a hole-layer primitive`);
    assert(targetFace, `${label}: slot ${slot.id} target face missing`);
    assert(targetFace.role !== "glue", `${label}: slot ${slot.id} must not be on a glue face`);

    for (const point of slotSamplePoints(slot)) {
      assert(pointInOrOnPolygon(point, targetFace.vertices), `${label}: slot ${slot.id} point is outside ${targetFace.id}`);
      if (safeDistance > 0) {
        assert(minDistanceToPolygon(point, targetFace.vertices) + ANCHOR_EPSILON >= safeDistance, `${label}: slot ${slot.id} is too close to cut boundary`);
      }
    }

    for (const crease of graph.creases.filter((candidate) => candidate.faceA === targetFace.id || candidate.faceB === targetFace.id)) {
      for (const edge of rectangleEdges(slot)) {
        assert(!segmentsTouchOrIntersect(edge.start, edge.end, crease.edgeStart, crease.edgeEnd), `${label}: slot ${slot.id} overlaps crease ${crease.id}`);
      }

      if (safeDistance > 0) {
        const distance = Math.min(...slotSamplePoints(slot).map((point) => distanceToSegment(point, crease.edgeStart, crease.edgeEnd)));
        assert(distance + ANCHOR_EPSILON >= safeDistance, `${label}: slot ${slot.id} is too close to crease ${crease.id}`);
      }
    }

    for (const glueFace of graph.faces.filter((candidate) => candidate.role === "glue")) {
      assert(!rectanglesOverlap(expandBounds(glueFace.bounds, safeDistance), slot), `${label}: slot ${slot.id} is too close to glue zone ${glueFace.id}`);
    }
  }

  for (const slot of slots) {
    const owningFace = graph.faces.find((face) => slotSamplePoints(slot).every((point) => pointInOrOnPolygon(point, face.vertices)));
    assert(owningFace, `${label}: slot ${slot.id} must stay inside one face`);
    assert(slot.radius <= slot.width / 2 + ANCHOR_EPSILON, `${label}: slot ${slot.id} radius exceeds width/2`);
    assert(slot.radius <= slot.height / 2 + ANCHOR_EPSILON, `${label}: slot ${slot.id} radius exceeds height/2`);

    for (const crease of graph.creases.filter((candidate) => candidate.faceA === owningFace.id || candidate.faceB === owningFace.id)) {
      for (const edge of rectangleEdges(slot)) {
        assert(!segmentsTouchOrIntersect(edge.start, edge.end, crease.edgeStart, crease.edgeEnd), `${label}: slot ${slot.id} overlaps crease ${crease.id}`);
      }
    }
  }
}

function assertHoleAndWindowGeometry(label, graph) {
  const primitives = (graph.geometry ?? []).filter((primitive) => primitive.layer === "hole" || primitive.layer === "window");
  const safeDistance = Number(graph.metadata?.parameterValues?.SDS ?? 0);

  for (const primitive of primitives) {
    const samples = primitiveSamplePoints(primitive);
    if (samples.length === 0) continue;

    const owningFace = graph.faces.find((face) => samples.every((point) => pointInOrOnPolygon(point, face.vertices)));
    assert(owningFace, `${label}: ${primitive.layer} primitive ${primitive.id} must stay inside one face`);
    assert(owningFace.role !== "glue", `${label}: ${primitive.layer} primitive ${primitive.id} must not be on glue face ${owningFace.id}`);

    if (safeDistance > 0) {
      for (const point of samples) {
        assert(minDistanceToPolygon(point, owningFace.vertices) + ANCHOR_EPSILON >= safeDistance, `${label}: ${primitive.id} is too close to cut boundary`);
      }
    }

    for (const crease of graph.creases.filter((candidate) => candidate.faceA === owningFace.id || candidate.faceB === owningFace.id)) {
      if (primitive.type === "circle") {
        const distance = distanceToSegment(primitive.center, crease.edgeStart, crease.edgeEnd);
        assert(distance + ANCHOR_EPSILON >= primitive.radius + safeDistance, `${label}: circle ${primitive.id} is too close to crease ${crease.id}`);
        continue;
      }

      const bounds = primitiveBounds(primitive);
      if (!bounds) continue;

      for (const edge of rectangleEdges(bounds)) {
        assert(!segmentsTouchOrIntersect(edge.start, edge.end, crease.edgeStart, crease.edgeEnd), `${label}: ${primitive.id} overlaps crease ${crease.id}`);
      }
    }
  }
}

function assertReliefNotchGeometry(label, graph, recipe) {
  const reliefParts = recipe.parts.filter((candidate) => candidate.type === "relief-notch");
  const reliefGeometry = (graph.geometry ?? []).filter((primitive) => reliefParts.some((part) => primitive.id.startsWith(`${part.id}-`)));

  assert(reliefGeometry.length >= reliefParts.length, `${label}: expected relief-notch geometry`);
  for (const primitive of reliefGeometry) {
    assert(primitive.type === "polyline" && primitive.layer === "cut", `${label}: relief notch ${primitive.id} must be cut polyline geometry`);
    assert(primitive.points.length >= 2, `${label}: relief notch ${primitive.id} must contain points`);
    assert(primitive.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)), `${label}: relief notch ${primitive.id} has non-finite points`);
  }
}

function assertTuckFlapGeometry(label, graph, recipe, anchorsById) {
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));

  for (const part of recipe.parts.filter((candidate) => candidate.type === "tuck-flap" || candidate.type === "slotted-tuck-flap")) {
    const anchor = anchorsById.get(part.attachTo);
    assert(anchor, `${label}: tuck flap ${part.id} missing anchor ${part.attachTo}`);

    const faceId = childFaceIdForPart(part, anchor.faceId, anchor.edge);
    const face = faceById.get(faceId);
    assert(face, `${label}: tuck flap ${part.id} missing face ${faceId}`);
    assert(face.vertices.length >= 4, `${label}: tuck flap ${faceId} should have at least four vertices`);
    assert(face.bounds.width > 0 && face.bounds.height > 0, `${label}: tuck flap ${faceId} must have positive bounds`);
    assertClose(face.bounds.width, anchor.length, `${label}: tuck flap ${faceId} width`, ANCHOR_EPSILON);

    const baseStart = anchor.edge === "top" ? face.vertices[0] : face.vertices[0];
    const baseEnd = anchor.edge === "top" ? face.vertices[face.vertices.length - 1] : face.vertices[face.vertices.length - 1];
    assertPointClose(baseStart, anchor.start, `${label}: tuck flap ${faceId} base start`, ANCHOR_EPSILON);
    assertPointClose(baseEnd, anchor.end, `${label}: tuck flap ${faceId} base end`, ANCHOR_EPSILON);
    assertClose(face.vertices[1].x, anchor.start.x, `${label}: tuck flap ${faceId} left side continuity`, ANCHOR_EPSILON);
    assertClose(face.vertices[face.vertices.length - 2].x, anchor.end.x, `${label}: tuck flap ${faceId} right side continuity`, ANCHOR_EPSILON);

    for (const point of face.vertices) {
      assert(point.x >= face.bounds.x - ANCHOR_EPSILON, `${label}: tuck flap ${faceId} vertex extends left of bounds`);
      assert(point.x <= face.bounds.x + face.bounds.width + ANCHOR_EPSILON, `${label}: tuck flap ${faceId} vertex extends right of bounds`);
    }
  }
}

function assertScoreLinesInsideFaces(label, graph) {
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));
  const scoreLines = (graph.geometry ?? []).filter((primitive) => primitive.id.startsWith("score-") && primitive.type === "line");

  for (const scoreLine of scoreLines) {
    const faceId = scoreLine.id.replace(/^score-/, "").replace(/-lip$/, "");
    const face = faceById.get(faceId);
    const midpoint = midpointOf(scoreLine.start, scoreLine.end);

    assert(face, `${label}: score line ${scoreLine.id} does not map to a face`);
    assert(pointInOrOnPolygon(scoreLine.start, face.vertices), `${label}: score line ${scoreLine.id} start is outside ${faceId}`);
    assert(pointInOrOnPolygon(scoreLine.end, face.vertices), `${label}: score line ${scoreLine.id} end is outside ${faceId}`);
    assert(pointInOrOnPolygon(midpoint, face.vertices), `${label}: score line ${scoreLine.id} midpoint is outside ${faceId}`);
  }
}

function assertDustFlapGeometry(label, graph, recipe, anchorsById) {
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));

  for (const part of recipe.parts.filter((candidate) => candidate.type === "dust-flap" || candidate.type === "custom-dust-flap")) {
    const anchor = anchorsById.get(part.attachTo);
    assert(anchor, `${label}: dust flap ${part.id} missing anchor ${part.attachTo}`);

    const faceId = childFaceIdForPart(part, anchor.faceId, anchor.edge);
    const face = faceById.get(faceId);
    assert(face, `${label}: dust flap ${part.id} missing face ${faceId}`);
    if (part.type === "dust-flap") {
      assert(face.vertices.length === 4, `${label}: dust flap ${faceId} should be a simple four-point tapered polygon`);
    } else {
      assert(face.vertices.length >= 4, `${label}: custom dust flap ${faceId} should have a stable polygon`);
    }
    assertPointClose(face.vertices[0], anchor.start, `${label}: dust flap ${faceId} base start`, ANCHOR_EPSILON);
    assertPointClose(face.vertices[face.vertices.length - 1], anchor.end, `${label}: dust flap ${faceId} base end`, ANCHOR_EPSILON);
    assert(face.bounds.width > 0 && face.bounds.height > 0, `${label}: dust flap ${faceId} must have positive bounds`);
  }
}

function assertSpecificCreaseMatchesAnchor(label, creaseById, anchorsById, creaseId, anchorId) {
  const crease = creaseById.get(creaseId);
  const anchor = anchorsById.get(anchorId);
  assert(crease, `${label}: missing crease ${creaseId}`);
  assert(anchor, `${label}: missing anchor ${anchorId}`);
  assertPointClose(crease.edgeStart, anchor.start, `${label}: ${creaseId}/${anchorId}.start`, ANCHOR_EPSILON);
  assertPointClose(crease.edgeEnd, anchor.end, `${label}: ${creaseId}/${anchorId}.end`, ANCHOR_EPSILON);
}

function renderDebugSvg(result) {
  const { graph, anchors } = result;
  const padding = 36;
  const width = graph.size.width + padding * 2;
  const height = graph.size.height + padding * 2;
  const translate = `translate(${padding} ${padding})`;
  const labelStyle = "font-family:Arial, sans-serif;font-size:4px;paint-order:stroke;stroke:#fff;stroke-width:1.2px;stroke-linejoin:round;";
  const body = [];

  body.push(`<rect x="0" y="0" width="${format(width)}" height="${format(height)}" fill="#fbfaf7"/>`);
  if (result.warnings.length > 0) {
    body.push(`<g id="warnings" fill="#8a5a00" style="font-family:Arial, sans-serif;font-size:4px;">`);
    body.push(`<text x="8" y="12">${escapeXml(`${result.warnings.length} warning(s): ${result.warnings.slice(0, 2).join(" | ")}`)}</text>`);
    body.push(`</g>`);
  }
  body.push(`<g transform="${translate}">`);

  body.push(`<g id="cut-paths" stroke="#d12f2f" stroke-width="0.45" fill="none">`);
  for (const cutPath of graph.cutPaths) {
    if (cutPath.points?.length) {
      body.push(`<polyline points="${pointsAttr(cutPath.points)}"/>`);
    } else if (cutPath.d) {
      body.push(`<path d="${escapeXml(cutPath.d)}"/>`);
    }
  }
  body.push(`</g>`);

  body.push(`<g id="face-outlines" fill="rgba(255,255,255,0.6)" stroke="#2f3437" stroke-width="0.35">`);
  for (const face of graph.faces) {
    body.push(`<polygon points="${pointsAttr(face.vertices)}"/>`);
  }
  body.push(`</g>`);

  body.push(`<g id="structural-creases" stroke="#2364aa" stroke-width="0.55" stroke-dasharray="2 1">`);
  for (const crease of graph.creases) {
    body.push(`<line x1="${format(crease.edgeStart.x)}" y1="${format(crease.edgeStart.y)}" x2="${format(crease.edgeEnd.x)}" y2="${format(crease.edgeEnd.y)}"/>`);
  }
  body.push(`</g>`);

  body.push(`<g id="internal-score-lines" stroke="#d88400" stroke-width="0.45" stroke-dasharray="1.4 1">`);
  for (const primitive of graph.geometry ?? []) {
    if (primitive.id.startsWith("score-") && primitive.type === "line") {
      body.push(`<line x1="${format(primitive.start.x)}" y1="${format(primitive.start.y)}" x2="${format(primitive.end.x)}" y2="${format(primitive.end.y)}"/>`);
    }
  }
  body.push(`</g>`);

  body.push(`<g id="cutouts" stroke="#0f8f57" stroke-width="0.6" fill="rgba(15,143,87,0.12)">`);
  for (const primitive of graph.geometry ?? []) {
    if (primitive.layer === "hole" || primitive.layer === "window") {
      body.push(`<path d="${primitiveToDebugPath(primitive)}"/>`);
    }
  }
  body.push(`</g>`);

  body.push(`<g id="internal-cut-geometry" stroke="#111827" stroke-width="0.45" fill="none">`);
  for (const primitive of graph.geometry ?? []) {
    if (primitive.layer === "cut" && !primitive.id.startsWith("cut-")) {
      const pathData = primitiveToDebugPath(primitive);
      if (pathData) {
        body.push(`<path d="${pathData}"/>`);
      }
    }
  }
  body.push(`</g>`);

  body.push(`<g id="anchors" stroke="#198754" fill="#198754" stroke-width="0.35">`);
  for (const anchor of anchors) {
    body.push(`<line x1="${format(anchor.start.x)}" y1="${format(anchor.start.y)}" x2="${format(anchor.end.x)}" y2="${format(anchor.end.y)}"/>`);
    body.push(`<circle cx="${format(anchor.start.x)}" cy="${format(anchor.start.y)}" r="1.25"/>`);
    body.push(`<circle cx="${format(anchor.end.x)}" cy="${format(anchor.end.y)}" r="1.25"/>`);
  }
  body.push(`</g>`);

  body.push(`<g id="face-labels" fill="#111827" style="${labelStyle}">`);
  for (const face of graph.faces) {
    body.push(`<text x="${format(face.centroid.x)}" y="${format(face.centroid.y)}" text-anchor="middle">${escapeXml(face.id)}</text>`);
  }
  body.push(`</g>`);

  body.push(`<g id="crease-labels" fill="#174a7c" style="${labelStyle}">`);
  for (const crease of graph.creases) {
    const midpoint = midpointOf(crease.edgeStart, crease.edgeEnd);
    body.push(`<text x="${format(midpoint.x)}" y="${format(midpoint.y - 1.6)}" text-anchor="middle">${escapeXml(crease.id)}</text>`);
  }
  body.push(`</g>`);

  body.push(`<g id="anchor-labels" fill="#0f6b3f" style="${labelStyle}">`);
  for (const anchor of anchors) {
    const midpoint = midpointOf(anchor.start, anchor.end);
    body.push(`<text x="${format(midpoint.x + anchor.normal.x * 3)}" y="${format(midpoint.y + anchor.normal.y * 3)}" text-anchor="middle">${escapeXml(anchor.id)}</text>`);
  }
  body.push(`</g>`);

  body.push(`<g id="part-labels" fill="#6f42c1" style="${labelStyle}">`);
  for (const part of graph.metadata?.parts ?? []) {
    const partCenter = centerOfFaces(graph.faces.filter((face) => part.faceIds.includes(face.id)));
    if (partCenter) {
      body.push(`<text x="${format(partCenter.x)}" y="${format(partCenter.y + 5)}" text-anchor="middle">${escapeXml(part.id)}</text>`);
    }
  }
  body.push(`</g>`);

  body.push(`<g id="cutout-labels" fill="#0f8f57" style="${labelStyle}">`);
  for (const primitive of graph.geometry ?? []) {
    if (primitive.layer === "hole" || primitive.layer === "window") {
      const center = primitiveCenter(primitive);
      if (center) {
        body.push(`<text x="${format(center.x)}" y="${format(center.y - 2.5)}" text-anchor="middle">${escapeXml(primitive.id)}</text>`);
      }
    }
  }
  body.push(`</g>`);

  body.push(`</g>`);

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${format(width)}mm" height="${format(height)}mm" viewBox="0 0 ${format(width)} ${format(height)}">`,
    `<title>${escapeXml(graph.metadata?.familyLabel ?? "Component engine debug")}</title>`,
    ...body,
    `</svg>`,
  ].join("\n");
}

function printSummaryTable(rows) {
  const columns = ["template", "size", "faces", "creases", "geometry", "anchors", "warnings", "status"];
  const widths = Object.fromEntries(columns.map((column) => [
    column,
    Math.max(column.length, ...rows.map((row) => String(row[column]).length)),
  ]));
  const separator = columns.map((column) => "-".repeat(widths[column])).join(" | ");
  const header = columns.map((column) => column.padEnd(widths[column])).join(" | ");

  console.log(header);
  console.log(separator);
  for (const row of rows) {
    console.log(columns.map((column) => String(row[column]).padEnd(widths[column])).join(" | "));
  }
}

function trackInvariant(name) {
  invariantNames.add(name);
}

function childFaceIdForPart(part, parentFaceId, edge) {
  if (part.faceId) return part.faceId;
  if (part.type === "glue-tab") return "glue-tab";
  if (part.type === "tuck-flap") return `${edge === "top" ? "top" : "bottom"}-tuck`;
  if (part.type === "slotted-tuck-flap") return `${edge === "top" ? "top" : "bottom"}-tuck`;
  if (part.type === "lock-tab") return `${edge === "top" ? "top" : "bottom"}-lock-tab`;
  if (part.type === "hang-tab") return `${edge === "top" ? "top" : "bottom"}-hang-tab`;
  if (part.type === "dust-flap") return `${edge === "top" ? "top" : "bottom"}-dust-${parentFaceId}`;
  if (part.type === "custom-dust-flap") return `${edge === "top" ? "top" : "bottom"}-dust-${parentFaceId}`;
  if (part.type === "panel-flap") return `${edge === "top" ? "top" : "bottom"}-panel`;
  return part.id;
}

function isGeometryOnlyOrAnchorHelperPart(type) {
  return type === "slot-cutout"
    || type === "rounded-slot-cutout"
    || type === "circular-hole-cutout"
    || type === "euro-slot-cutout"
    || type === "window-cutout"
    || type === "relief-notch"
    || type === "partial-edge-anchor";
}

function centerOfFaces(faces) {
  if (!faces.length) return null;
  return {
    x: faces.reduce((sum, face) => sum + face.centroid.x, 0) / faces.length,
    y: faces.reduce((sum, face) => sum + face.centroid.y, 0) / faces.length,
  };
}

function midpointOf(start, end) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function pointInOrOnPolygon(point, points) {
  if (points.some((start, index) => pointOnSegment(point, start, points[(index + 1) % points.length]))) {
    return true;
  }

  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const a = points[current];
    const b = points[previous];
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointOnSegment(point, start, end) {
  const length = Math.hypot(end.x - start.x, end.y - start.y);

  if (length <= ANCHOR_EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y) <= ANCHOR_EPSILON;
  }

  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);

  return cross / length <= ANCHOR_EPSILON && dot >= -ANCHOR_EPSILON && dot <= length * length + ANCHOR_EPSILON;
}

function slotSamplePoints(slot) {
  const centerX = slot.x + slot.width / 2;
  const centerY = slot.y + slot.height / 2;

  return [
    { x: slot.x, y: slot.y },
    { x: slot.x + slot.width, y: slot.y },
    { x: slot.x + slot.width, y: slot.y + slot.height },
    { x: slot.x, y: slot.y + slot.height },
    { x: centerX, y: slot.y },
    { x: slot.x + slot.width, y: centerY },
    { x: centerX, y: slot.y + slot.height },
    { x: slot.x, y: centerY },
    { x: centerX, y: centerY },
  ];
}

function primitiveSamplePoints(primitive) {
  if (primitive.type === "slot" || primitive.type === "rounded-rect") {
    return slotSamplePoints(primitive);
  }

  if (primitive.type === "circle") {
    return [
      { x: primitive.center.x - primitive.radius, y: primitive.center.y },
      { x: primitive.center.x, y: primitive.center.y - primitive.radius },
      { x: primitive.center.x + primitive.radius, y: primitive.center.y },
      { x: primitive.center.x, y: primitive.center.y + primitive.radius },
      primitive.center,
    ];
  }

  if (primitive.type === "polygon" || primitive.type === "polyline") {
    return primitive.points;
  }

  if (primitive.type === "line") {
    return [primitive.start, primitive.end, midpointOf(primitive.start, primitive.end)];
  }

  return [];
}

function primitiveBounds(primitive) {
  if (primitive.type === "slot" || primitive.type === "rounded-rect") {
    return { x: primitive.x, y: primitive.y, width: primitive.width, height: primitive.height };
  }

  if (primitive.type === "circle") {
    return {
      x: primitive.center.x - primitive.radius,
      y: primitive.center.y - primitive.radius,
      width: primitive.radius * 2,
      height: primitive.radius * 2,
    };
  }

  return null;
}

function rectangleEdges(rect) {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];

  return points.map((start, index) => ({ start, end: points[(index + 1) % points.length] }));
}

function minDistanceToPolygon(point, points) {
  return Math.min(...points.map((start, index) => distanceToSegment(point, start, points[(index + 1) % points.length])));
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= ANCHOR_EPSILON) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = Math.min(1, Math.max(0, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function segmentsTouchOrIntersect(a1, a2, b1, b2) {
  return segmentsIntersect2D(a1, a2, b1, b2)
    || pointOnSegment(a1, b1, b2)
    || pointOnSegment(a2, b1, b2)
    || pointOnSegment(b1, a1, a2)
    || pointOnSegment(b2, a1, a2);
}

function segmentsIntersect2D(a1, a2, b1, b2) {
  const o1 = orientation2D(a1, a2, b1);
  const o2 = orientation2D(a1, a2, b2);
  const o3 = orientation2D(b1, b2, a1);
  const o4 = orientation2D(b1, b2, a2);

  return o1 * o2 < -ANCHOR_EPSILON && o3 * o4 < -ANCHOR_EPSILON;
}

function orientation2D(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function expandBounds(bounds, amount) {
  return {
    x: bounds.x - amount,
    y: bounds.y - amount,
    width: bounds.width + amount * 2,
    height: bounds.height + amount * 2,
  };
}

function primitiveToDebugPath(primitive) {
  if (primitive.type === "slot" || primitive.type === "rounded-rect") {
    return roundedRectPath(primitive.x, primitive.y, primitive.width, primitive.height, primitive.radius);
  }

  if (primitive.type === "circle") {
    return [
      `M ${format(primitive.center.x + primitive.radius)} ${format(primitive.center.y)}`,
      `A ${format(primitive.radius)} ${format(primitive.radius)} 0 1 0 ${format(primitive.center.x - primitive.radius)} ${format(primitive.center.y)}`,
      `A ${format(primitive.radius)} ${format(primitive.radius)} 0 1 0 ${format(primitive.center.x + primitive.radius)} ${format(primitive.center.y)}`,
      "Z",
    ].join(" ");
  }

  if (primitive.type === "polygon" || primitive.type === "polyline") {
    return `M ${primitive.points.map((point) => `${format(point.x)} ${format(point.y)}`).join(" L ")}${primitive.type === "polygon" ? " Z" : ""}`;
  }

  return "";
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${format(x + r)} ${format(y)}`,
    `L ${format(x + width - r)} ${format(y)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x + width)} ${format(y + r)}`,
    `L ${format(x + width)} ${format(y + height - r)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x + width - r)} ${format(y + height)}`,
    `L ${format(x + r)} ${format(y + height)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x)} ${format(y + height - r)}`,
    `L ${format(x)} ${format(y + r)}`,
    `A ${format(r)} ${format(r)} 0 0 1 ${format(x + r)} ${format(y)}`,
    "Z",
  ].join(" ");
}

function primitiveCenter(primitive) {
  if (primitive.type === "slot" || primitive.type === "rounded-rect") {
    return { x: primitive.x + primitive.width / 2, y: primitive.y + primitive.height / 2 };
  }

  if (primitive.type === "circle" || primitive.type === "ellipse" || primitive.type === "arc") {
    return primitive.center;
  }

  if (primitive.type === "polygon" || primitive.type === "polyline") {
    return centerOfPoints(primitive.points);
  }

  return null;
}

function centerOfPoints(points) {
  if (!points.length) return null;

  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

function pointsAttr(points) {
  return points.map((point) => `${format(point.x)},${format(point.y)}`).join(" ");
}

function format(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function withPart(recipe, part) {
  const next = clone(recipe);
  next.parts = [...next.parts, part];
  return next;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    assert(!seen.has(value), `${label}: ${value}`);
    seen.add(value);
  }
}

function assertPointClose(actual, expected, label, epsilon) {
  assertClose(actual.x, expected.x, `${label}.x`, epsilon);
  assertClose(actual.y, expected.y, `${label}.y`, epsilon);
}

function assertClose(actual, expected, label, epsilon) {
  assert(Math.abs(actual - expected) <= epsilon, `${label}: expected ${expected}, got ${actual}`);
}

function expectThrow(fn, label) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`${label}: expected an error`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadTs(modulePath) {
  const filename = resolveTsFile(modulePath);
  const cached = moduleCache.get(filename);

  if (cached) {
    return cached.exports;
  }

  if (filename.endsWith(".json")) {
    const jsonModule = { exports: JSON.parse(fs.readFileSync(filename, "utf8")) };
    moduleCache.set(filename, jsonModule);
    return jsonModule.exports;
  }

  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const compiledModule = { exports: {} };

  moduleCache.set(filename, compiledModule);

  const dirname = path.dirname(filename);
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadTs(path.join(projectRoot, specifier.slice(2)));
    }

    if (specifier.startsWith(".")) {
      return loadTs(path.resolve(dirname, specifier));
    }

    return require(specifier);
  };

  const runModule = new Function("exports", "require", "module", "__filename", "__dirname", transpiled.outputText);
  runModule(compiledModule.exports, localRequire, compiledModule, filename, dirname);

  return compiledModule.exports;
}

function resolveTsFile(modulePath) {
  const candidates = [
    modulePath,
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    `${modulePath}.json`,
    path.join(modulePath, "index.ts"),
    path.join(modulePath, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Cannot resolve module: ${modulePath}`);
}
