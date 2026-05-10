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
const { importSvgDieline } = loadTs(path.join(projectRoot, "domain", "dieline", "svgImporter"));
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

console.log("Dieline graph verification passed.");

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
