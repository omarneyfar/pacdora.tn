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
const { CEFBOX_FOLDING_BOX_DEFINITIONS } = loadTs(path.join(projectRoot, "domain", "dieline", "templates", "foldingBoxVariants"));
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

assertStickerSeeds(seeds);
assertCefBoxFoldingBoxSeeds(seeds);

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

function assertCefBoxFoldingBoxSeeds(seeds) {
  const expectedIds = new Set(CEFBOX_FOLDING_BOX_DEFINITIONS.map((definition) => definition.id));
  const foldingBoxSeeds = seeds.filter((seed) => seed.id.startsWith("seed-foldingbox-"));

  assert(foldingBoxSeeds.length === expectedIds.size, `Expected ${expectedIds.size} cefBox folding box seeds, got ${foldingBoxSeeds.length}`);

  for (const seed of foldingBoxSeeds) {
    const metadata = seed.graph.metadata;
    assert(metadata?.category === "folding-box", `${seed.id}: expected folding-box category`);
    assert(expectedIds.has(metadata.family), `${seed.id}: unexpected folding-box family ${metadata?.family ?? "missing"}`);
    assert(seed.graph.faces.length >= 5, `${seed.id}: folding box seed should have a foldable carton body`);
    assert(seed.graph.creases.length >= 4, `${seed.id}: folding box seed should have body creases`);

    const definition = CEFBOX_FOLDING_BOX_DEFINITIONS.find((candidate) => candidate.id === metadata.family);
    assert(definition, `${seed.id}: missing definition`);

    for (const code of ["L", "W", "H", ...definition.parameters]) {
      assert(metadata.parameters?.some((parameter) => parameter.id === code), `${seed.id}: missing parameter ${code}`);
    }
  }
}

function assertStickerSeeds(seeds) {
  const stickerSeeds = seeds.filter((seed) => seed.graph.metadata?.category === "sticker");
  const expectedFamilies = new Set(["sticker-rectangle", "sticker-rounded", "sticker-oval"]);

  assert(stickerSeeds.length === 3, `Expected 3 sticker seeds, got ${stickerSeeds.length}`);

  for (const seed of stickerSeeds) {
    const family = seed.graph.metadata?.family;
    assert(expectedFamilies.has(family), `Unexpected sticker family ${family ?? "missing"}`);
    assert(seed.graph.faces.length === 1, `${seed.id}: sticker should have one artwork face`);
    assert(seed.graph.creases.length === 0, `${seed.id}: sticker should not have creases`);
    assert(seed.graph.faces[0].id === "front", `${seed.id}: sticker face should be legacy-compatible front`);
    assert(seed.graph.faces[0].artworkEnabled, `${seed.id}: sticker face should accept artwork`);
    assert(seed.graph.metadata.parameters?.some((parameter) => parameter.id === "length"), `${seed.id}: missing length parameter`);
    assert(seed.graph.metadata.parameters?.some((parameter) => parameter.id === "width"), `${seed.id}: missing width parameter`);

    if (family === "sticker-rounded") {
      assert(
        seed.graph.metadata.parameters?.some((parameter) => parameter.id === "corner-radius"),
        `${seed.id}: rounded sticker missing corner-radius parameter`,
      );
    }
  }
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
