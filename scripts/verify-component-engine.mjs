import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const moduleCache = new Map();
const EPSILON = 0.01;

const { generateFromRecipe } = loadTs(path.join(projectRoot, "domain", "dieline", "componentEngine"));
const { validateDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation", "validateDielineGraph"));
const { generateReverseTuckEnd } = loadTs(path.join(projectRoot, "domain", "dieline", "templates", "reverseTuckEnd"));
const { generateStraightTuckEnd } = loadTs(path.join(projectRoot, "domain", "dieline", "templates", "straightTuckEnd"));

const reverseRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "reverseTuckEnd.v2.json"));
const straightRecipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "straightTuckEnd.v2.json"));

assertEngineFailures(reverseRecipe);
assertRecipeLoads(reverseRecipe, "Reverse Tuck End v2");
assertRecipeLoads(straightRecipe, "Straight Tuck End v2");

assertParity("Reverse Tuck End", reverseRecipe, generateReverseTuckEnd, [
  {},
  { L: 120, W: 60, H: 160 },
  { L: 80, W: 40, H: 120 },
  { L: 200, W: 80, H: 250 },
]);

assertParity("Straight Tuck End", straightRecipe, generateStraightTuckEnd, [
  { label: "defaults", v2Input: {}, v1Input: { L: 80, W: 40, H: 120 } },
  { L: 120, W: 60, H: 160 },
  { L: 80, W: 40, H: 120 },
  { L: 200, W: 80, H: 250 },
]);

console.log("Component engine verification passed.");

function assertRecipeLoads(recipe, label) {
  const graph = generateFromRecipe(recipe);
  const validation = validateDielineGraph(graph);

  assert(validation.ok, `${label}: v2 graph is invalid: ${validation.errors.join("; ")}`);
  assert(graph.metadata?.parameterValues?.generatorVersion === "component-engine-v2", `${label}: missing v2 metadata`);
  assert(graph.metadata?.catalog === undefined, `${label}: hidden v2 graph must not attach catalog runtime metadata`);
  assert(graph.creases.every((crease) => !crease.id.startsWith("score-")), `${label}: score lines must not be structural creases`);
  assert(graph.geometry?.some((primitive) => primitive.id.startsWith("score-") && primitive.layer === "crease"), `${label}: expected score-line geometry`);
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
  expectThrow(() => generateFromRecipe(recipe, { W: Number.NaN }), "non-finite dimensions should fail");
}

function assertParity(label, recipe, v1Generator, cases) {
  for (const input of cases) {
    const v2Input = input.v2Input ?? input;
    const v1Input = input.v1Input ?? v2Input;
    const caseLabel = `${label} ${input.label ?? (Object.keys(v2Input).length ? JSON.stringify(v2Input) : "defaults")}`;
    const v1 = v1Generator(v1Input);
    const v2 = generateFromRecipe(recipe, v2Input);
    const validation = validateDielineGraph(v2);

    assert(validation.ok, `${caseLabel}: v2 graph invalid: ${validation.errors.join("; ")}`);
    assertClose(v2.size.width, v1.size.width, `${caseLabel}: width`);
    assertClose(v2.size.height, v1.size.height, `${caseLabel}: height`);
    assertSameSet(v2.faces.map((face) => face.id), v1.faces.map((face) => face.id), `${caseLabel}: face ids`);
    assertSameSet(v2.creases.map((crease) => crease.id), v1.creases.map((crease) => crease.id), `${caseLabel}: crease ids`);

    const v1Faces = new Map(v1.faces.map((face) => [face.id, face]));
    for (const face of v2.faces) {
      const expected = v1Faces.get(face.id);
      assert(expected, `${caseLabel}: missing v1 face ${face.id}`);
      assertClose(face.bounds.x, expected.bounds.x, `${caseLabel}: ${face.id}.bounds.x`);
      assertClose(face.bounds.y, expected.bounds.y, `${caseLabel}: ${face.id}.bounds.y`);
      assertClose(face.bounds.width, expected.bounds.width, `${caseLabel}: ${face.id}.bounds.width`);
      assertClose(face.bounds.height, expected.bounds.height, `${caseLabel}: ${face.id}.bounds.height`);
      assert(face.vertices.length === expected.vertices.length, `${caseLabel}: ${face.id} vertex count differs`);
      for (let index = 0; index < face.vertices.length; index += 1) {
        assertPointClose(face.vertices[index], expected.vertices[index], `${caseLabel}: ${face.id}.vertices[${index}]`);
      }
    }

    assertAttachmentCreasesMatchAnchors(v2, recipe, caseLabel);
  }
}

function assertAttachmentCreasesMatchAnchors(graph, recipe, label) {
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));
  const creaseByPair = new Map();

  for (const crease of graph.creases) {
    creaseByPair.set(`${crease.faceA}|${crease.faceB}`, crease);
    creaseByPair.set(`${crease.faceB}|${crease.faceA}`, crease);
  }

  for (const part of recipe.parts) {
    if (!part.attachTo) continue;
    const [parentFaceId, edge] = part.attachTo.split(".");
    const parentFace = faceById.get(parentFaceId);
    assert(parentFace, `${label}: missing attachment parent ${parentFaceId}`);
    const childFaceId = childFaceIdForPart(part, parentFaceId, edge);
    const crease = creaseByPair.get(`${parentFaceId}|${childFaceId}`);
    assert(crease, `${label}: missing crease between ${parentFaceId} and ${childFaceId}`);
    const anchor = anchorForFace(parentFace, edge);

    assertPointClose(crease.edgeStart, anchor.start, `${label}: ${crease.id}.edgeStart`);
    assertPointClose(crease.edgeEnd, anchor.end, `${label}: ${crease.id}.edgeEnd`);
  }
}

function childFaceIdForPart(part, parentFaceId, edge) {
  if (part.faceId) return part.faceId;
  if (part.type === "glue-tab") return "glue-tab";
  if (part.type === "tuck-flap") return `${edge === "top" ? "top" : "bottom"}-tuck`;
  if (part.type === "dust-flap") return `${edge === "top" ? "top" : "bottom"}-dust-${parentFaceId}`;
  if (part.type === "panel-flap") return `${edge === "top" ? "top" : "bottom"}-panel`;
  return part.id;
}

function anchorForFace(face, edge) {
  const { x, y, width, height } = face.bounds;
  if (edge === "top") return { start: { x, y }, end: { x: x + width, y } };
  if (edge === "right") return { start: { x: x + width, y }, end: { x: x + width, y: y + height } };
  if (edge === "bottom") return { start: { x, y: y + height }, end: { x: x + width, y: y + height } };
  if (edge === "left") return { start: { x, y }, end: { x, y: y + height } };
  throw new Error(`Unsupported attachment edge: ${edge}`);
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

function assertSameSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  assert(actualSet.size === expectedSet.size, `${label}: expected ${expectedSet.size} items, got ${actualSet.size}`);
  for (const item of expectedSet) {
    assert(actualSet.has(item), `${label}: missing ${item}`);
  }
}

function assertPointClose(actual, expected, label) {
  assertClose(actual.x, expected.x, `${label}.x`);
  assertClose(actual.y, expected.y, `${label}.y`);
}

function assertClose(actual, expected, label) {
  assert(Math.abs(actual - expected) <= EPSILON, `${label}: expected ${expected}, got ${actual}`);
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
