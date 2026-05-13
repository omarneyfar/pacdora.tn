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
const stressCases = [
  { name: "120x40x160", input: { L: 120, W: 40, H: 160 } },
  { name: "120x60x160", input: { L: 120, W: 60, H: 160 } },
  { name: "120x90x160", input: { L: 120, W: 90, H: 160 } },
  { name: "80x40x120", input: { L: 80, W: 40, H: 120 } },
  { name: "200x80x250", input: { L: 200, W: 80, H: 250 } },
];
const extremeCases = [
  {
    name: "very-tall-narrow",
    input: { L: 80, W: 20, H: 240 },
    expected: "warning",
    expectedMessage: "height-width-ratio-too-large",
  },
  {
    name: "very-wide-shallow",
    input: { L: 300, W: 120, H: 60 },
    expected: "warning",
    expectedMessage: "tuck-flap-too-large-for-body-height",
  },
  {
    name: "very-small-W",
    input: { L: 80, W: 12, H: 120 },
    expected: "error",
    expectedMessage: "width-too-small-for-tuck-closures",
  },
  {
    name: "very-large-HW-ratio",
    input: { L: 120, W: 24, H: 220 },
    expected: "warning",
    expectedMessage: "height-width-ratio-too-large",
  },
];
const summaryRows = [];
const invariantNames = new Set();
const outputFiles = [];

fs.mkdirSync(outputDir, { recursive: true });

assertEngineFailures(reverseRecipe);
assertRecipeLoads(reverseRecipe, "Reverse Tuck End v2");
assertRecipeLoads(straightRecipe, "Straight Tuck End v2");

runStressSuite("RTE v2", reverseRecipe, "reverse-tuck-end");
runStressSuite("STE v2", straightRecipe, "straight-tuck-end");
runConstraintSuite("RTE v2", reverseRecipe, "reverse-tuck-end");
runConstraintSuite("STE v2", straightRecipe, "straight-tuck-end");

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

function runConstraintSuite(templateLabel, recipe, filePrefix) {
  for (const current of extremeCases) {
    const caseLabel = `${templateLabel} ${current.name}`;

    if (current.expected === "error") {
      expectConstraintError(() => generateFromRecipeDebug(recipe, current.input), current.expectedMessage, caseLabel);
      summaryRows.push({
        template: templateLabel,
        size: current.name,
        faces: "-",
        creases: "-",
        geometry: "-",
        anchors: "-",
        warnings: "blocked",
        status: "error",
      });
      continue;
    }

    const result = generateFromRecipeDebug(recipe, current.input);
    const validation = validateDielineGraph(result.graph);
    const warnings = [...result.warnings, ...validation.warnings];

    assert(validation.ok, `${caseLabel}: warning case should still generate a valid graph`);
    assert(warnings.length > 0, `${caseLabel}: expected constraint warnings`);
    assert(warnings.some((warning) => warning.includes(current.expectedMessage)), `${caseLabel}: expected warning ${current.expectedMessage}`);
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

  trackInvariant("every attachTo resolves to an anchor");
  trackInvariant("every structural crease base matches attachTo anchor");
  for (const part of recipe.parts) {
    if (!part.attachTo) continue;

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

    if (part.type === "dust-flap") {
      trackInvariant("dust flaps attach exactly to side panel anchors");
      assert(anchor.faceId === "left" || anchor.faceId === "right", `${label}: dust flap ${part.id} must attach to a side panel`);
      assert(anchor.edge === "top" || anchor.edge === "bottom", `${label}: dust flap ${part.id} must attach to top/bottom anchor`);
    }
  }

  trackInvariant("tuck flaps have full-width anchor bases and clean bounds");
  assertTuckFlapGeometry(label, graph, recipe, anchorsById);

  trackInvariant("dust flaps are simple tapered polygons");
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

function assertTuckFlapGeometry(label, graph, recipe, anchorsById) {
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));

  for (const part of recipe.parts.filter((candidate) => candidate.type === "tuck-flap")) {
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

    for (const point of face.vertices) {
      assert(point.x >= face.bounds.x - ANCHOR_EPSILON, `${label}: tuck flap ${faceId} vertex extends left of bounds`);
      assert(point.x <= face.bounds.x + face.bounds.width + ANCHOR_EPSILON, `${label}: tuck flap ${faceId} vertex extends right of bounds`);
    }
  }
}

function assertDustFlapGeometry(label, graph, recipe, anchorsById) {
  const faceById = new Map(graph.faces.map((face) => [face.id, face]));

  for (const part of recipe.parts.filter((candidate) => candidate.type === "dust-flap")) {
    const anchor = anchorsById.get(part.attachTo);
    assert(anchor, `${label}: dust flap ${part.id} missing anchor ${part.attachTo}`);

    const faceId = childFaceIdForPart(part, anchor.faceId, anchor.edge);
    const face = faceById.get(faceId);
    assert(face, `${label}: dust flap ${part.id} missing face ${faceId}`);
    assert(face.vertices.length === 4, `${label}: dust flap ${faceId} should be a simple four-point tapered polygon`);
    assertPointClose(face.vertices[0], anchor.start, `${label}: dust flap ${faceId} base start`, ANCHOR_EPSILON);
    assertPointClose(face.vertices[3], anchor.end, `${label}: dust flap ${faceId} base end`, ANCHOR_EPSILON);
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
  if (part.type === "dust-flap") return `${edge === "top" ? "top" : "bottom"}-dust-${parentFaceId}`;
  if (part.type === "panel-flap") return `${edge === "top" ? "top" : "bottom"}-panel`;
  return part.id;
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

function expectConstraintError(fn, expectedMessage, label) {
  try {
    fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes(expectedMessage), `${label}: expected error containing ${expectedMessage}, got ${message}`);
    return;
  }

  throw new Error(`${label}: expected constraint error`);
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
