import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const outputDir = path.join(scriptsDir, "output", "v2-library", "templates");
const moduleCache = new Map();

const {
  generateV2ReverseTuckEndAssembly,
  generateV2ReverseTuckEndDielineGraph,
} = loadTs(path.join(projectRoot, "domain", "dieline", "v2Templates", "foldingBox", "reverseTuckEnd.v2template"));
const { validateDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation", "validateDielineGraph"));
const { graphToSvg } = loadTs(path.join(projectRoot, "domain", "dieline", "canonicalGeometry"));

fs.mkdirSync(outputDir, { recursive: true });

const assembly = generateV2ReverseTuckEndAssembly({
  L: 120,
  W: 60,
  H: 160,
});
const graph = generateV2ReverseTuckEndDielineGraph({
  L: 120,
  W: 60,
  H: 160,
});
const validation = validateDielineGraph(graph);

assert(validation.ok, `DielineGraph validation failed: ${validation.errors.join("; ")}`);
assertGraphShape(graph, assembly);

const svgPath = path.join(outputDir, "reverse-tuck-end-v2-template.debug.svg");
const graphPath = path.join(outputDir, "reverse-tuck-end-v2-template.graph.json");

fs.writeFileSync(svgPath, graphToSvg(graph), "utf8");
fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");

console.log("V2 template assembly verification passed.");
console.log(`Faces: ${graph.faces.length}`);
console.log(`Creases: ${graph.creases.length}`);
console.log(`Geometry primitives: ${graph.geometry?.length ?? 0}`);
console.log(`Validation warnings: ${validation.warnings.join("; ") || "none"}`);
console.log(`Debug SVG: ${path.relative(projectRoot, svgPath)}`);
console.log(`Graph JSON: ${path.relative(projectRoot, graphPath)}`);

function assertGraphShape(graph, assembly) {
  const faceIds = new Set(graph.faces.map((face) => face.id));
  const expectedFaceIds = [
    "body-back",
    "body-sideB",
    "body-front",
    "body-sideA",
    "sideGlue-face",
    "topTuck-face",
    "bottomTuck-face",
    "topDustSideA-face",
    "topDustSideB-face",
    "bottomDustSideA-face",
    "bottomDustSideB-face",
  ];

  for (const faceId of expectedFaceIds) {
    assert(faceIds.has(faceId), `Missing stable V2 RTE face id: ${faceId}`);
  }

  for (const face of graph.faces) {
    assert(face.vertices.every(isFinitePoint), `${face.id}: non-finite vertices`);
  }

  for (const crease of graph.creases) {
    assert(faceIds.has(crease.faceA), `${crease.id}: missing faceA`);
    assert(faceIds.has(crease.faceB), `${crease.id}: missing faceB`);
    assert(crease.faceA !== crease.faceB, `${crease.id}: self-referencing crease`);
    assert(isFinitePoint(crease.edgeStart) && isFinitePoint(crease.edgeEnd), `${crease.id}: non-finite endpoints`);
    assert(!/score|slot|hole|window|relief|safe|bleed|perforation|notch|zone/i.test(crease.id), `${crease.id}: geometry-only item became crease`);
    assert(crease.foldAngle > 0 && crease.foldAngle <= Math.PI + 0.000001, `${crease.id}: foldAngle should be radians`);
  }

  for (const part of assembly.parts) {
    assert(part.implementationStatus !== "spec-only", `${part.id}: spec-only part was used`);
    assert(part.productionReady === false, `${part.id}: productionReady must remain false`);
  }

  assert(graph.metadata?.catalog?.generatorId === "v2Library/template-assembly", "Graph metadata must identify v2Library template assembly source.");
  assert(graph.metadata?.catalog?.productionReady === false, "Graph metadata must remain productionReady=false.");
  assert(graph.source?.type === "template" && graph.source.templateId.includes("v2Library/template-assembly"), "Graph source must identify v2Library.");
}

function isFinitePoint(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadTs(modulePath) {
  const filename = resolveTsFile(modulePath);
  const cached = moduleCache.get(filename);
  if (cached) return cached.exports;

  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });

  const cjsModule = { exports: {} };
  moduleCache.set(filename, cjsModule);
  const localRequire = (specifier) => {
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      return loadTs(path.resolve(path.dirname(filename), specifier));
    }
    return require(specifier);
  };
  const fn = new Function("require", "exports", "module", "__filename", "__dirname", transpiled.outputText);
  fn(localRequire, cjsModule.exports, cjsModule, filename, path.dirname(filename));
  return cjsModule.exports;
}

function resolveTsFile(modulePath) {
  const candidates = [
    modulePath,
    `${modulePath}.ts`,
    path.join(modulePath, "index.ts"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve TS module: ${modulePath}`);
}
