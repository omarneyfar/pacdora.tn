import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const moduleCache = new Map();

const packaging = loadTs(path.join(projectRoot, "domain", "packaging", "index"));
const geometry = loadTs(path.join(projectRoot, "domain", "dieline", "geometry"));
const { buildFoldedModel, getFoldErrors } = loadTs(path.join(projectRoot, "domain", "dieline", "fold3d"));
const { graphToDxf, graphToPdf, graphToSvg } = loadTs(path.join(projectRoot, "domain", "dieline", "canonicalGeometry"));
const {
  getDielineTemplateByRoute,
  listDielineTemplateSummaries,
} = loadTs(path.join(projectRoot, "domain", "dieline", "templateRegistry"));
const { loadTemplateCatalog } = loadTs(path.join(projectRoot, "domain", "dieline", "catalog"));
const { generateReverseTuckEnd } = loadTs(path.join(projectRoot, "domain", "dieline", "templates", "reverseTuckEnd"));
const { parseReferenceGeometry, compareGraphToReference } = loadTs(path.join(projectRoot, "domain", "dieline", "reference"));
const { getDielineParts } = loadTs(path.join(projectRoot, "domain", "dieline", "structure"));
const { normalizeDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation"));
const { importSvgDieline } = loadTs(path.join(projectRoot, "domain", "dieline", "svgImporter"));
const { getSeedDielines } = loadTs(path.join(projectRoot, "server", "dielines", "seedDielines"));
const dimensions = { width: 232, height: 70, depth: 232 };
const template = packaging.getPackagingTemplate("folding-carton");
const graph = template.getDielineGraph(dimensions);
const faceSpecs = template.getFaceSpecs(dimensions);
const expectedFaceIds = ["front", "back", "left", "right", "top", "bottom"];

assert(graph.size.width === 604, `Expected graph width 604, got ${graph.size.width}`);
assert(graph.size.height === 372, `Expected graph height 372, got ${graph.size.height}`);
assert(graph.faces.length === expectedFaceIds.length, `Expected 6 graph faces, got ${graph.faces.length}`);

for (const faceId of expectedFaceIds) {
  const face = graph.faces.find((candidate) => candidate.id === faceId);
  const spec = faceSpecs[faceId];

  assert(face, `Missing graph face ${faceId}`);
  assert(face.artworkEnabled, `Expected ${faceId} to accept artwork`);
  assert(face.bounds.x === spec.x, `Expected ${faceId} x ${spec.x}, got ${face.bounds.x}`);
  assert(face.bounds.y === spec.y, `Expected ${faceId} y ${spec.y}, got ${face.bounds.y}`);
  assert(face.bounds.width === spec.width, `Expected ${faceId} width ${spec.width}, got ${face.bounds.width}`);
  assert(face.bounds.height === spec.height, `Expected ${faceId} height ${spec.height}, got ${face.bounds.height}`);
}

const creasePairs = new Set(graph.creases.map((crease) => [crease.faceA, crease.faceB].sort().join(":")));

for (const pair of ["back:top", "left:top", "right:top", "front:top", "bottom:right"]) {
  assert(creasePairs.has(pair), `Missing crease pair ${pair}`);
}

const treeFaceIds = collectTreeFaceIds(graph.faceTree);

assert(new Set(treeFaceIds).size === expectedFaceIds.length, "Face tree contains duplicate or missing faces");

for (const faceId of expectedFaceIds) {
  assert(treeFaceIds.includes(faceId), `Face tree does not include ${faceId}`);
}

assert(graph.cutPaths.length > 0, "Expected exterior cut paths");
assert(graph.cutPaths.every((cutPath) => cutPath.d.startsWith("M ")), "Every cut path must be an SVG path");

const sampleSvg = fs.readFileSync(path.join(projectRoot, "fixtures", "dielines", "food-sleeve-with-flaps.svg"), "utf8");
const imported = importSvgDieline(sampleSvg).graph;
const importedFaceIds = new Set(imported.faces.map((face) => face.id));

for (const faceId of [...expectedFaceIds, "left-top-flap", "right-top-flap", "bottom-lock"]) {
  assert(importedFaceIds.has(faceId), `Imported SVG missing face ${faceId}`);
}

assert(imported.faces.some((face) => face.role === "flap" && !face.artworkEnabled), "Imported SVG should preserve structural flaps");
assert(imported.creases.length === 5, `Expected 5 imported creases, got ${imported.creases.length}`);
assert(imported.cutPaths.length > 0, "Imported SVG should have generated cut paths");

assertFoldedModel(graph, "default folding carton");
assertTemplateStructure(graph, "default folding carton");
assertFoldedModel(imported, "SVG fixture");
assertTwoPanelFold();
assertNestedFold();

const seeds = getSeedDielines();

for (const seed of seeds) {
  assertFoldedModel(seed.graph, `seed ${seed.id}`);
  assertTemplateStructure(seed.graph, `seed ${seed.id}`);
}

assertSeedPolicy(seeds);
assertTemplateRegistry();
assertReverseTuckEndExactScaffold();
assertReverseTuckEndStructureCases();

console.log("Dieline graph verification passed.");

function assertTwoPanelFold() {
  const root = geometry.createDielineFace({
    id: "root",
    label: "Root",
    role: "panel",
    artworkEnabled: true,
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
  });
  const side = geometry.createDielineFace({
    id: "side",
    label: "Side",
    role: "panel",
    artworkEnabled: true,
    vertices: [
      { x: 0, y: -60 },
      { x: 100, y: -60 },
      { x: 100, y: 0 },
      { x: 0, y: 0 }
    ]
  });
  const twoPanelGraph = {
    size: { width: 100, height: 160 },
    faces: [root, side],
    creases: [
      {
        id: "crease-root-side",
        faceA: "root",
        faceB: "side",
        edgeStart: { x: 0, y: 0 },
        edgeEnd: { x: 100, y: 0 },
        foldAngle: Math.PI / 2,
        direction: 1
      }
    ],
    cutPaths: geometry.createExteriorCutPaths([root, side]),
    faceTree: [
      {
        faceId: "root",
        creaseId: null,
        children: [{ faceId: "side", creaseId: "crease-root-side", children: [] }]
      }
    ]
  };

  const model = assertFoldedModel(twoPanelGraph, "two-panel hinge");
  const sideFace = model.faces.find((face) => face.faceId === "side");
  assert(sideFace?.worldVertices.some((point) => Math.abs(point[1]) > 0.25), "Two-panel hinge did not fold out of plane");
}

function assertNestedFold() {
  const root = geometry.createDielineFace({
    id: "root",
    label: "Root",
    role: "panel",
    artworkEnabled: true,
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ]
  });
  const side = geometry.createDielineFace({
    id: "side",
    label: "Side",
    role: "panel",
    artworkEnabled: true,
    vertices: [
      { x: 100, y: 0 },
      { x: 160, y: 0 },
      { x: 160, y: 100 },
      { x: 100, y: 100 }
    ]
  });
  const flap = geometry.createDielineFace({
    id: "flap",
    label: "Flap",
    role: "flap",
    artworkEnabled: false,
    vertices: [
      { x: 160, y: 0 },
      { x: 210, y: 0 },
      { x: 210, y: 100 },
      { x: 160, y: 100 }
    ]
  });
  const nestedGraph = {
    size: { width: 210, height: 100 },
    faces: [root, side, flap],
    creases: [
      {
        id: "crease-root-side",
        faceA: "root",
        faceB: "side",
        edgeStart: { x: 100, y: 0 },
        edgeEnd: { x: 100, y: 100 },
        foldAngle: Math.PI / 2,
        direction: 1
      },
      {
        id: "crease-side-flap",
        faceA: "side",
        faceB: "flap",
        edgeStart: { x: 160, y: 0 },
        edgeEnd: { x: 160, y: 100 },
        foldAngle: Math.PI / 2,
        direction: 1
      }
    ],
    cutPaths: geometry.createExteriorCutPaths([root, side, flap]),
    faceTree: [
      {
        faceId: "root",
        creaseId: null,
        children: [
          {
            faceId: "side",
            creaseId: "crease-root-side",
            children: [{ faceId: "flap", creaseId: "crease-side-flap", children: [] }]
          }
        ]
      }
    ]
  };

  const model = assertFoldedModel(nestedGraph, "nested hinge");
  const flapFace = model.faces.find((face) => face.faceId === "flap");
  assert(flapFace?.worldVertices.every((point) => Number.isFinite(point[0])), "Nested flap did not produce finite vertices");
}

function assertFoldedModel(testGraph, label) {
  const model = buildFoldedModel(testGraph);
  const errors = getFoldErrors(model);
  const warnings = model.diagnostics.filter((diagnostic) => diagnostic.level === "warning");

  assert(errors.length === 0, `${label}: fold errors: ${errors.map((error) => error.message).join("; ")}`);
  assert(warnings.length === 0, `${label}: fold warnings: ${warnings.map((warning) => warning.message).join("; ")}`);
  assert(model.faces.length === testGraph.faces.length, `${label}: expected ${testGraph.faces.length} folded faces, got ${model.faces.length}`);

  const graphFaceIds = new Set(testGraph.faces.map((face) => face.id));
  const foldedFaceIds = new Set(model.faces.map((face) => face.faceId));
  assert(foldedFaceIds.size === model.faces.length, `${label}: folded model contains duplicate face IDs`);

  for (const faceId of graphFaceIds) {
    assert(foldedFaceIds.has(faceId), `${label}: folded model missing face ${faceId}`);
  }

  for (const face of model.faces) {
    assert(face.worldMatrix.length === 16, `${label}: ${face.faceId} world matrix is not 4x4`);
    assert(face.worldMatrix.every(Number.isFinite), `${label}: ${face.faceId} world matrix contains non-finite values`);
    assert(face.worldVertices.length >= 3, `${label}: ${face.faceId} has too few world vertices`);
    assert(face.worldVertices.flat().every(Number.isFinite), `${label}: ${face.faceId} world vertices contain non-finite values`);
  }

  assert([...model.bounds.min, ...model.bounds.max, ...model.bounds.size, ...model.bounds.center, model.bounds.radius].every(Number.isFinite), `${label}: bounds are not finite`);
  assert(model.bounds.radius > 0, `${label}: bounds radius must be positive`);
  assertCreaseCoincidence(testGraph, model, label);

  return model;
}

function assertTemplateStructure(testGraph, label) {
  assert(testGraph.metadata, `${label}: missing template metadata`);
  assert(testGraph.metadata.category, `${label}: missing category`);
  assert(testGraph.metadata.family, `${label}: missing family`);
  assert(testGraph.metadata.familyLabel, `${label}: missing family label`);

  const normalized = normalizeDielineGraph(testGraph);
  assert(normalized?.metadata, `${label}: metadata was not preserved by normalization`);

  const graphFaceIds = new Set(testGraph.faces.map((face) => face.id));
  const graphCreaseIds = new Set(testGraph.creases.map((crease) => crease.id));
  const partFaceCounts = new Map();
  const parts = getDielineParts(testGraph);

  assert(parts.length > 0, `${label}: expected structural parts`);

  for (const part of parts) {
    assert(part.id, `${label}: part is missing id`);
    assert(part.label, `${label}: part ${part.id} is missing label`);
    assert(part.faceIds.length > 0, `${label}: part ${part.id} has no faces`);

    for (const faceId of part.faceIds) {
      assert(graphFaceIds.has(faceId), `${label}: part ${part.id} references missing face ${faceId}`);
      partFaceCounts.set(faceId, (partFaceCounts.get(faceId) ?? 0) + 1);
    }

    for (const creaseId of part.creaseIds ?? []) {
      assert(graphCreaseIds.has(creaseId), `${label}: part ${part.id} references missing crease ${creaseId}`);
    }
  }

  for (const faceId of graphFaceIds) {
    assert(partFaceCounts.get(faceId) >= 1, `${label}: face ${faceId} is not assigned to a structural part`);
  }

  for (const parameter of testGraph.metadata.parameters ?? []) {
    assert(parameter.id, `${label}: parameter is missing id`);
    assert(parameter.label, `${label}: parameter ${parameter.id} is missing label`);
    if (typeof parameter.value === "number") {
      assert(Number.isFinite(parameter.value), `${label}: parameter ${parameter.id} is not finite`);
    }
  }
}

function assertReverseTuckEndExactScaffold() {
  const graph = generateReverseTuckEnd();
  const values = graph.metadata?.parameterValues ?? {};

  assert(graph.geometry?.some((primitive) => primitive.layer === "cut"), "Reverse Tuck End should include cut geometry primitives");
  assert(graph.geometry?.some((primitive) => primitive.layer === "crease"), "Reverse Tuck End should include crease geometry primitives");
  assert(graph.metadata?.parameterSpecs?.length >= 14, "Reverse Tuck End should expose template parameter specs");
  for (const id of ["L", "W", "H", "closureMode", "TFW", "TFR", "GFW", "DFW", "materialThickness", "outputSizeMode"]) {
    assert(Object.hasOwn(values, id), `Reverse Tuck End missing parameter value ${id}`);
  }

  assert(values.closureMode === "auto", "Reverse Tuck End should default to automatic closure dimensions");
  assert(Math.abs(values.TFW - values.W * 0.32) < 0.0001, `Auto TFW should derive from W, got ${values.TFW}`);
  assert(Math.abs(values.DFW - values.W * 0.58) < 0.0001, `Auto DFW should derive from W, got ${values.DFW}`);
  assert(values.GFW >= 10 && values.GFW <= 22, "Auto GFW should be clamped to a production-safe range");
  assert(values.TFW + values.DFW <= values.W * 1.15, "Auto closure values should fit the carton depth");

  const expectedWidth = values.L * 2 + values.W * 2 + values.GFW;
  const expectedHeight = values.H + 2 * Math.max(values.W + values.TFW, values.DFW);
  assert(Math.abs(graph.size.width - expectedWidth) < 0.01, `Reverse Tuck End auto width should be ${expectedWidth}, got ${graph.size.width}`);
  assert(Math.abs(graph.size.height - expectedHeight) < 0.01, `Reverse Tuck End auto height should be ${expectedHeight}, got ${graph.size.height}`);

  const changed = generateReverseTuckEnd({ L: 160, W: 80, H: 210 });
  assert(changed.size.width > graph.size.width, "Reverse Tuck End L/W changes should increase width");
  assert(changed.size.height > graph.size.height, "Reverse Tuck End H/W changes should increase height");

  const manual = generateReverseTuckEnd({ closureMode: "manual", L: 120, W: 60, H: 160, TFW: 500, TFR: 500, GFW: 500, DFW: 500 });
  const manualValues = manual.metadata?.parameterValues ?? {};
  assert(manualValues.closureMode === "manual", "Manual closure mode should be preserved");
  assert(manualValues.GFW <= 22, "Manual glue tab width should be clamped");
  assert(manualValues.TFR <= manualValues.W / 2, "Manual tuck radius should be clamped");
  assert(manualValues.TFW + manualValues.DFW <= manualValues.W * 1.15, "Manual closure values should be clamped to fit");

  assert(graph.faces.some((face) => face.id === "glue-tab" && Math.abs(face.bounds.x - (values.W + values.L + values.W + values.L)) < 0.01), "Reverse Tuck End glue flap should sit on the right side");
  assert(!graph.faces.some((face) => face.id === "top-panel" || face.id === "bottom-panel"), "Reverse Tuck End should not add extra top/bottom panels");

  const svg = graphToSvg(graph);
  const dxf = graphToDxf(graph);
  const pdf = graphToPdf(graph);
  assert(svg.includes('data-layer="cut"') && svg.includes('data-layer="crease"'), "SVG export should preserve cut and crease layers");
  assert(dxf.includes("CUT") && dxf.includes("CREASE"), "DXF export should preserve cut and crease layers");
  assert(pdf.startsWith("%PDF-1.4"), "PDF export should be a PDF document");

  const referencePath = [
    path.join(projectRoot, "fixtures", "dielines", "references", "reverse-tuck-end.svg"),
    path.join(projectRoot, "fixtures", "dielines", "references", "reverse-tuck-end.dxf"),
  ].find((candidate) => fs.existsSync(candidate));

  if (referencePath) {
    const reference = parseReferenceGeometry(fs.readFileSync(referencePath, "utf8"), referencePath);
    const comparison = compareGraphToReference(graph, reference);
    assert(comparison.ok, `Reverse Tuck End reference mismatch: ${comparison.messages.join("; ")}`);
  }
}

function assertReverseTuckEndStructureCases() {
  const cases = [
    { label: "Reverse Tuck End 120x60x160", input: { L: 120, W: 60, H: 160 } },
    { label: "Reverse Tuck End 80x40x120", input: { L: 80, W: 40, H: 120 } },
    { label: "Reverse Tuck End 200x80x250", input: { L: 200, W: 80, H: 250 } }
  ];

  for (const current of cases) {
    assertReverseTuckEndStructure(current.input, current.label);
  }
}

function assertReverseTuckEndStructure(input, label) {
  const graph = generateReverseTuckEnd(input);
  const requiredFaces = [
    "front",
    "back",
    "left",
    "right",
    "glue-tab",
    "top-tuck",
    "bottom-tuck",
    "top-dust-left",
    "top-dust-right",
    "bottom-dust-left",
    "bottom-dust-right"
  ];
  const requiredCreases = [
    "cr-left-front",
    "cr-front-right",
    "cr-right-back",
    "cr-back-glue",
    "cr-left-topdust",
    "cr-front-toptuck",
    "cr-right-topdust",
    "cr-left-bottomdust",
    "cr-right-bottomdust",
    "cr-back-bottomtuck"
  ];
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));
  const creaseById = new Map(graph.creases.map((crease) => [crease.id, crease]));

  assert(Number.isFinite(graph.size.width) && graph.size.width > 0, `${label}: graph width must be positive`);
  assert(Number.isFinite(graph.size.height) && graph.size.height > 0, `${label}: graph height must be positive`);

  for (const faceId of requiredFaces) {
    assert(faceById.has(faceId), `${label}: missing required face ${faceId}`);
  }

  for (const creaseId of requiredCreases) {
    assert(creaseById.has(creaseId), `${label}: missing required crease ${creaseId}`);
  }

  for (const face of graph.faces) {
    assert(face.vertices.length >= 3, `${label}: face ${face.id} has too few vertices`);
    assert(face.vertices.every(isFinitePoint2D), `${label}: face ${face.id} contains non-finite vertices`);
    assert(face.bounds.width >= 0 && face.bounds.height >= 0, `${label}: face ${face.id} has negative bounds`);
    assert(!hasSelfCrossingPolygon(face.vertices), `${label}: face ${face.id} has a self-crossing polygon`);
    assert(!hasTinyPolygonEdge(face.vertices), `${label}: face ${face.id} has a zero-length polygon edge`);
  }

  for (const crease of graph.creases) {
    const faceA = faceById.get(crease.faceA);
    const faceB = faceById.get(crease.faceB);

    assert(faceA, `${label}: crease ${crease.id} references missing face ${crease.faceA}`);
    assert(faceB, `${label}: crease ${crease.id} references missing face ${crease.faceB}`);
    assert(isFinitePoint2D(crease.edgeStart) && isFinitePoint2D(crease.edgeEnd), `${label}: crease ${crease.id} has non-finite endpoints`);
    assert(distance2D(crease.edgeStart, crease.edgeEnd) > 0.000001, `${label}: crease ${crease.id} has zero length`);
    assert(isCreaseOnFaceBoundary(crease, faceA), `${label}: crease ${crease.id} is not on face ${faceA.id} boundary`);
    assert(isCreaseOnFaceBoundary(crease, faceB), `${label}: crease ${crease.id} is not on face ${faceB.id} boundary`);
  }

  for (const cutPath of graph.cutPaths) {
    assert(cutPath.points?.every(isFinitePoint2D), `${label}: cut path ${cutPath.id} contains non-finite points`);
    assert(!hasTinyPolylineSegment(cutPath.points ?? []), `${label}: cut path ${cutPath.id} contains a zero-length segment`);
  }

  const treeFaceIds = collectTreeFaceIds(graph.faceTree);
  assert(graph.faceTree.length === 1, `${label}: faceTree should have one root`);
  assert(new Set(treeFaceIds).size === graph.faces.length, `${label}: faceTree contains duplicate or missing faces`);

  for (const face of graph.faces) {
    assert(treeFaceIds.includes(face.id), `${label}: faceTree does not include ${face.id}`);
  }

  const treeRelations = collectTreeRelations(graph.faceTree);
  assert(treeRelations.get("top-tuck")?.parentFaceId === "front", `${label}: top tuck must attach to the front panel`);
  assert(treeRelations.get("bottom-tuck")?.parentFaceId === "back", `${label}: bottom tuck must attach to the opposite major panel`);
  assert(treeRelations.get("top-tuck")?.parentFaceId !== treeRelations.get("bottom-tuck")?.parentFaceId, `${label}: top and bottom tucks must be on opposite panels`);

  for (const [faceId, relation] of treeRelations) {
    if (!relation.parentFaceId) {
      assert(relation.creaseId === null, `${label}: root face ${faceId} must not reference a crease`);
      continue;
    }

    const crease = creaseById.get(relation.creaseId);
    assert(crease, `${label}: faceTree face ${faceId} references missing crease ${relation.creaseId}`);
    assert(creaseConnectsFaces(crease, relation.parentFaceId, faceId), `${label}: faceTree crease ${relation.creaseId} does not connect ${relation.parentFaceId} to ${faceId}`);
  }

  assertCreasePair(graph, "cr-front-toptuck", "front", "top-tuck", label);
  assertCreasePair(graph, "cr-back-bottomtuck", "back", "bottom-tuck", label);
  assertCreasePair(graph, "cr-left-topdust", "left", "top-dust-left", label);
  assertCreasePair(graph, "cr-right-topdust", "right", "top-dust-right", label);
  assertCreasePair(graph, "cr-left-bottomdust", "left", "bottom-dust-left", label);
  assertCreasePair(graph, "cr-right-bottomdust", "right", "bottom-dust-right", label);
  assertCreasePair(graph, "cr-back-glue", "back", "glue-tab", label);

  assertFoldedModel(graph, label);
}

function assertSeedPolicy(seeds) {
  assert(seeds.length >= 1, `Expected generator-backed template seeds, got ${seeds.length}`);

  const reverseSeed = seeds.find((seed) => seed.id === "seed-foldingbox-reverseTuckEnd");
  assert(reverseSeed, "Expected Reverse Tuck End catalog seed");

  for (const seed of seeds) {
    assert(seed.graph.metadata?.category === "folding-box", `${seed.id}: expected folding-box category`);
    assert(seed.graph.metadata?.catalog?.templateId, `${seed.id}: expected catalog metadata`);
    assert(seed.graph.metadata?.parameterValues, `${seed.id}: expected resolved parameter values`);
  }

  assert(reverseSeed.graph.metadata?.family === "reverse-tuck-end", `${reverseSeed.id}: expected reverse-tuck-end family`);
  assert(reverseSeed.graph.metadata?.parameterSpecs?.length >= 14, `${reverseSeed.id}: expected grouped parameter-ready seed`);
  assert(reverseSeed.graph.geometry?.some((primitive) => primitive.layer === "cut"), `${reverseSeed.id}: expected canonical cut geometry`);
  assert(reverseSeed.graph.geometry?.some((primitive) => primitive.layer === "crease"), `${reverseSeed.id}: expected canonical crease geometry`);
}

function assertTemplateRegistry() {
  const reverseTuckEnd = getDielineTemplateByRoute("foldingBox", "reverseTuckEnd");
  assert(reverseTuckEnd, "Template registry should expose Reverse Tuck End by CefBox-style route");
  assert(reverseTuckEnd.catalogTemplate.runtime.generatorId === "reverseTuckEndV2", "Reverse Tuck End should use the v2 component-engine generator");
  assert(reverseTuckEnd.catalogTemplate.runtime.status === "graph-valid", "Reverse Tuck End should be graph-valid in the catalog runtime");
  assert(reverseTuckEnd.parameterGroups?.length >= 5, "Reverse Tuck End should expose grouped builder parameters");
  assert(reverseTuckEnd.exportFormats.includes("dxf") && reverseTuckEnd.exportFormats.includes("pdf"), "Reverse Tuck End should expose downloadable formats");

  const graph = reverseTuckEnd.generate({ closureMode: "manual", L: 72, W: 36, H: 104, TFW: 18, TFR: 6, GFW: 16, DFW: 20 });
  assert(graph.metadata?.family === "reverse-tuck-end", "Registered Reverse Tuck End should generate the canonical family graph");
  assert(graph.metadata?.parameterValues?.generatorVersion === "component-engine-v2", "Registered Reverse Tuck End should generate via component-engine v2");
  assert(graph.geometry?.some((primitive) => primitive.layer === "cut"), "Registered Reverse Tuck End should generate canonical cut geometry");
  assertFoldedModel(graph, "registered Reverse Tuck End v2");

  const straightTuckEnd = getDielineTemplateByRoute("foldingBox", "straightTuckEnd");
  assert(straightTuckEnd, "Template registry should expose Straight Tuck End by CefBox-style route");
  assert(straightTuckEnd.catalogTemplate.runtime.generatorId === "straightTuckEndV2", "Straight Tuck End should use the v2 component-engine generator");
  assert(straightTuckEnd.catalogTemplate.runtime.status === "graph-valid", "Straight Tuck End should be graph-valid in the catalog runtime");
  const straightGraph = straightTuckEnd.generate({ L: 80, W: 40, H: 120 });
  assert(straightGraph.metadata?.family === "straight-tuck-end", "Registered Straight Tuck End should generate the canonical family graph");
  assert(straightGraph.metadata?.parameterValues?.generatorVersion === "component-engine-v2", "Registered Straight Tuck End should generate via component-engine v2");
  assert(!straightGraph.faces.some((face) => face.id === "top-panel" || face.id === "bottom-panel"), "Standard Straight Tuck End v2 should not include panel-flap variant faces");
  assertFoldedModel(straightGraph, "registered Straight Tuck End v2");

  const summaries = listDielineTemplateSummaries("foldingBox");
  assert(summaries.length === loadTemplateCatalog().templates.length, "Folding Box catalog should expose every catalog family");
  assert(summaries.some((summary) => summary.slug === "reverseTuckEnd" && summary.isImplemented), "Folding Box catalog should link the active Reverse Tuck End generator");
  assert(summaries.some((summary) => summary.slug === "straightTuckEnd" && summary.isImplemented), "Folding Box catalog should link the active Straight Tuck End generator");
  assert(summaries.some((summary) => !summary.isImplemented && summary.runtimeStatus === "catalog-only"), "Folding Box catalog should keep generator-missing templates visible");
}

function assertCreaseCoincidence(testGraph, model, label) {
  const foldedById = new Map(model.faces.map((face) => [face.faceId, face]));
  const graphFaceById = new Map(testGraph.faces.map((face) => [face.id, face]));

  for (const crease of testGraph.creases) {
    const foldedA = foldedById.get(crease.faceA);
    const foldedB = foldedById.get(crease.faceB);
    const graphA = graphFaceById.get(crease.faceA);
    const graphB = graphFaceById.get(crease.faceB);

    if (!foldedA || !foldedB || !graphA || !graphB) {
      continue;
    }

    for (const point of [crease.edgeStart, crease.edgeEnd]) {
      const worldA = transformLocalPoint(foldedA.worldMatrix, {
        x: (point.x - graphA.bounds.x) * model.scale,
        y: (point.y - graphA.bounds.y) * model.scale
      });
      const worldB = transformLocalPoint(foldedB.worldMatrix, {
        x: (point.x - graphB.bounds.x) * model.scale,
        y: (point.y - graphB.bounds.y) * model.scale
      });
      const distance = Math.hypot(worldA[0] - worldB[0], worldA[1] - worldB[1], worldA[2] - worldB[2]);

      assert(distance < 0.00001, `${label}: crease ${crease.id} endpoints are separated by ${distance}`);
    }
  }
}

function assertCreasePair(graph, creaseId, faceA, faceB, label) {
  const crease = graph.creases.find((candidate) => candidate.id === creaseId);

  assert(crease, `${label}: missing crease ${creaseId}`);
  assert(creaseConnectsFaces(crease, faceA, faceB), `${label}: crease ${creaseId} must connect ${faceA} to ${faceB}`);
}

function collectTreeRelations(nodes, parentFaceId = null, relations = new Map()) {
  for (const node of nodes) {
    relations.set(node.faceId, {
      parentFaceId,
      creaseId: node.creaseId
    });
    collectTreeRelations(node.children, node.faceId, relations);
  }

  return relations;
}

function creaseConnectsFaces(crease, faceA, faceB) {
  return (crease.faceA === faceA && crease.faceB === faceB) || (crease.faceA === faceB && crease.faceB === faceA);
}

function isCreaseOnFaceBoundary(crease, face) {
  return isPointOnFaceBoundary(crease.edgeStart, face) && isPointOnFaceBoundary(crease.edgeEnd, face);
}

function isPointOnFaceBoundary(point, face) {
  return face.vertices.some((start, index) => pointOnSegment(point, start, face.vertices[(index + 1) % face.vertices.length]));
}

function pointOnSegment(point, start, end) {
  const length = distance2D(start, end);

  if (length <= 0.000001) {
    return distance2D(point, start) <= 0.00001;
  }

  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);

  return cross / length <= 0.00001 && dot >= -0.00001 && dot <= length * length + 0.00001;
}

function hasSelfCrossingPolygon(points) {
  for (let a = 0; a < points.length; a += 1) {
    const a1 = points[a];
    const a2 = points[(a + 1) % points.length];

    for (let b = a + 1; b < points.length; b += 1) {
      if (Math.abs(a - b) <= 1 || (a === 0 && b === points.length - 1)) {
        continue;
      }

      const b1 = points[b];
      const b2 = points[(b + 1) % points.length];

      if (segmentsIntersect2D(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  return false;
}

function segmentsIntersect2D(a1, a2, b1, b2) {
  const o1 = orientation2D(a1, a2, b1);
  const o2 = orientation2D(a1, a2, b2);
  const o3 = orientation2D(b1, b2, a1);
  const o4 = orientation2D(b1, b2, a2);

  return o1 * o2 < -0.0000001 && o3 * o4 < -0.0000001;
}

function orientation2D(a, b, c) {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function hasTinyPolygonEdge(points) {
  return points.some((point, index) => distance2D(point, points[(index + 1) % points.length]) <= 0.000001);
}

function hasTinyPolylineSegment(points) {
  return points.some((point, index) => index > 0 && distance2D(point, points[index - 1]) <= 0.000001);
}

function isFinitePoint2D(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function transformLocalPoint(matrix, point) {
  return [
    matrix[0] * point.x + matrix[4] * point.y + matrix[12],
    matrix[1] * point.x + matrix[5] * point.y + matrix[13],
    matrix[2] * point.x + matrix[6] * point.y + matrix[14]
  ];
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
      target: ts.ScriptTarget.ES2022
    },
    fileName: filename
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
    path.join(modulePath, "index.tsx")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Cannot resolve TypeScript module: ${modulePath}`);
}

function collectTreeFaceIds(nodes) {
  return nodes.flatMap((node) => [node.faceId, ...collectTreeFaceIds(node.children)]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
