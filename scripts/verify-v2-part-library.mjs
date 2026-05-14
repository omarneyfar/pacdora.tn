import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const outputDir = path.join(scriptsDir, "output", "v2-library", "parts");
const summaryPath = path.join(scriptsDir, "output", "v2-library", "v2-part-library-summary.json");
const moduleCache = new Map();
const referenceDebugWidth = 120;
const defaultDebugPartIds = ["standardDustFlap"];
const expectedPartIds = [
  "standardBodyStrip",
  "sleeveBody",
  "sideGlueSeamTab",
  "relievedGlueSeamTab",
  "standardTuckClosureFlap",
  "reverseTuckClosureFlap",
  "straightTuckClosureFlap",
  "centeredTuckClosureFlap",
  "fullWidthTuckClosureFlap",
  "lockingLipClosureFlap",
  "standardDustFlap",
  "trapezoidDustFlap",
  "angledBottomDustFlap",
  "bottomLockFlap",
  "snapLockBottomPanel",
  "snapLockMajorFlap",
  "snapLockMinorFlap",
  "snapLockTongue",
  "snapLockReceiverSlot",
  "autoLockBottomPanel",
  "autoLockMajorFlap",
  "autoLockMinorFlap",
  "autoLockGluePanel",
  "autoLockDiagonalScore",
  "crashBottomPanel",
  "fullFlapBottomPanel",
  "bottomGlueZone",
  "lockTab",
  "lockSlot",
  "lockingTuckFlap",
  "catalogLockFlap",
  "snapLockingLip",
  "lockReliefNotch",
  "circularCutout",
  "roundedSlotCutout",
  "euroSlotCutout",
  "windowCutout",
  "reliefNotch",
  "hangPanel",
  "sideCircularHangPanel",
  "hangTab",
  "foldedHandle",
  "arcHandle",
  "handleBridge",
  "handleCutout",
  "handleReinforcementPanel",
  "tearStrip",
  "perforationStrip",
  "tearPullTab",
  "tearNotch",
  "sealFlap",
  "centeredDivider",
  "integratedPartition",
  "builtInInsert",
  "productMount",
  "internalHolder",
  "compartmentGrid",
  "partitionLockSlot",
  "partitionGlueZone",
  "trayBody",
  "traySideWall",
  "trayCornerTab",
  "skilletBody",
  "skilletLid",
  "separatedSkilletBase",
  "separatedSkilletLid",
  "skilletSideWall",
  "skilletCornerLock",
  "skilletInsertPanel",
  "skilletSnapSlot",
  "reversibleLid",
  "reversibleLidHinge",
  "reversibleLidLockTab",
  "reversibleLidReceiverSlot",
  "lidInsertPanel",
  "gussetRoofPanel",
  "gussetTrianglePanel",
  "gussetCover",
  "gussetSidePanel",
  "gussetDiagonalScore",
  "roofRidgeCrease",
  "scoreGuide",
  "glueZoneGuide",
  "safeAreaGuide",
  "bleedGuide",
  "internalScoreGuide",
  "noPrintZoneGuide",
  "filmGlueZoneGuide",
  "windowFilmPatchGuide",
  "barcodeSafeZoneGuide",
];
const documentation = JSON.parse(fs.readFileSync(path.join(projectRoot, "folding-box-documentation.json"), "utf8"));

const {
  foldingBoxPartContracts,
  generatePartDebugGraph,
  generatePartDebugSvg,
  implementedV2PartIds,
  v2FoldingBoxPartRegistry,
} = loadTs(path.join(projectRoot, "domain", "dieline", "v2Library"));

fs.mkdirSync(outputDir, { recursive: true });
for (const file of fs.readdirSync(outputDir)) {
  if (file.endsWith(".debug.svg")) {
    fs.unlinkSync(path.join(outputDir, file));
  }
}

const rows = [];
const outputFiles = [];
const summary = createSummary();
assertContractsAndRegistry(summary);

for (const partId of defaultDebugPartIds) {
  assert(implementedV2PartIds.includes(partId), `${partId}: expected default debug part is not implemented`);
  const graph = generatePartDebugGraph(partId, referenceDebugWidth);
  validateDebugGraph(graph, partId, referenceDebugWidth);
  const outputPath = path.join(outputDir, `${kebab(partId)}-default.debug.svg`);
  fs.writeFileSync(outputPath, generatePartDebugSvg(graph), "utf8");
  outputFiles.push(outputPath);
  rows.push({
    part: partId,
    width: referenceDebugWidth,
    faces: graph.faces.length,
    creases: graph.structuralCreases.length,
    geometry: graph.geometryPrimitives.length,
    anchors: graph.anchors.length,
    warnings: graph.warnings.length,
  });
  summary.warningsPerPart[partId] = (summary.warningsPerPart[partId] ?? 0) + graph.warnings.length;
}

summary.debugSvgCount = outputFiles.length;
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
printRows(rows);
console.log(`Debug SVG files written: ${outputFiles.map((file) => path.relative(projectRoot, file)).join(", ")}`);
console.log(`Summary JSON written: ${path.relative(projectRoot, summaryPath)}`);
console.log("V2 part library verification passed.");

function createSummary() {
  return {
    totalContracts: foldingBoxPartContracts.length,
    implementedParts: [],
    partialParts: [],
    specOnlyParts: [],
    missingContracts: {
      expectedPartIds: [],
      documentedSourcePartIds: [],
    },
    warningsPerPart: {},
    debugSvgCount: 0,
  };
}

function assertContractsAndRegistry(summary) {
  const specOnly = [];
  const registeredIds = new Set(v2FoldingBoxPartRegistry.keys());
  const contractIds = new Set(foldingBoxPartContracts.map((contract) => contract.id));
  const documentedSourcePartIds = Object.keys(documentation.reusableParts ?? {});
  const coveredSourcePartIds = new Set(foldingBoxPartContracts.map((contract) => contract.sourceDocPartId));
  const missingDocumentedSourceParts = documentedSourcePartIds.filter((partId) => !coveredSourcePartIds.has(partId));
  const missingExpectedPartIds = expectedPartIds.filter((partId) => !contractIds.has(partId));

  summary.missingContracts.expectedPartIds = missingExpectedPartIds;
  summary.missingContracts.documentedSourcePartIds = missingDocumentedSourceParts;
  assert(missingExpectedPartIds.length === 0, `Missing V2 contracts for expected parts: ${missingExpectedPartIds.join(", ")}`);
  assert(missingDocumentedSourceParts.length === 0, `Missing source documentation coverage for: ${missingDocumentedSourceParts.join(", ")}`);

  for (const contract of foldingBoxPartContracts) {
    assert(registeredIds.has(contract.id), `${contract.id}: contract is not registered`);
  }

  for (const [partId, entry] of v2FoldingBoxPartRegistry.entries()) {
    assert(entry.contract.productionReady === false, `${partId}: contract must remain productionReady=false`);
    assert(contractIds.has(partId), `${partId}: registry entry has no matching contract`);
    if (entry.contract.implementationStatus === "spec-only") {
      specOnly.push(partId);
      summary.specOnlyParts.push(partId);
      assert(!entry.implementation, `${partId}: spec-only part must not have an implementation yet`);
    } else {
      assert(entry.implementation, `${partId}: non-spec contract must have implementation`);
      if (entry.contract.implementationStatus === "partial-experimental") {
        summary.partialParts.push(partId);
      } else {
        summary.implementedParts.push(partId);
      }
    }
  }
  assert(specOnly.includes("snapLockBottomPanel"), "snapLockBottomPanel must exist as spec-only");
  assert(specOnly.includes("autoLockBottomPanel"), "autoLockBottomPanel must exist as spec-only");
  assert(specOnly.includes("crashBottomPanel"), "crashBottomPanel must exist as spec-only");
  assert(specOnly.includes("gussetRoofPanel"), "gussetRoofPanel must exist as spec-only");
  assert(specOnly.includes("roofRidgeCrease"), "roofRidgeCrease must exist as spec-only");
  assert(specOnly.includes("reversibleLidHinge"), "reversibleLidHinge must exist as spec-only");
}

function validateDebugGraph(graph, partId, width) {
  const faceIds = new Set(graph.faces.map((face) => face.id));
  assertUnique(graph.faces.map((face) => face.id), `${partId}-${width}: duplicate face id`);
  assertUnique(graph.structuralCreases.map((crease) => crease.id), `${partId}-${width}: duplicate crease id`);
  assertUnique(graph.geometryPrimitives.map((primitive) => primitive.id), `${partId}-${width}: duplicate geometry id`);
  assertUnique(graph.anchors.map((anchor) => anchor.id), `${partId}-${width}: duplicate anchor id`);

  for (const face of graph.faces) {
    assert(face.points.length >= 3, `${partId}-${width}: ${face.id} needs at least three points`);
    assert(face.points.every(isFinitePoint), `${partId}-${width}: ${face.id} has non-finite points`);
    assert(!hasTinyEdge(face.points), `${partId}-${width}: ${face.id} has a zero-length edge`);
    assert(!hasSelfCrossingPolygon(face.points), `${partId}-${width}: ${face.id} self-intersects`);
  }

  for (const crease of graph.structuralCreases) {
    assert(faceIds.has(crease.faceA), `${partId}-${width}: crease ${crease.id} faceA is missing`);
    assert(faceIds.has(crease.faceB), `${partId}-${width}: crease ${crease.id} faceB is missing`);
    assert(crease.faceA !== crease.faceB, `${partId}-${width}: crease ${crease.id} references same face twice`);
    assert(isFinitePoint(crease.start) && isFinitePoint(crease.end), `${partId}-${width}: crease ${crease.id} has non-finite points`);
    assert(!/score|slot|hole|window|relief|safe|bleed|perforation|notch|zone/i.test(crease.id), `${partId}-${width}: geometry-only concept became a structural crease: ${crease.id}`);
  }

  for (const primitive of graph.geometryPrimitives) {
    assert(primitive.layer !== undefined, `${partId}-${width}: primitive ${primitive.id} missing layer`);
    assert(!graph.structuralCreases.some((crease) => crease.id === primitive.id), `${partId}-${width}: primitive ${primitive.id} is duplicated as crease`);
    for (const point of primitivePoints(primitive)) {
      assert(isFinitePoint(point), `${partId}-${width}: primitive ${primitive.id} has non-finite point`);
    }
  }
}

function primitivePoints(primitive) {
  if (primitive.type === "circle") {
    return [
      primitive.center,
      { x: primitive.center.x - primitive.radius, y: primitive.center.y },
      { x: primitive.center.x + primitive.radius, y: primitive.center.y },
    ];
  }
  if (primitive.type === "line") return [primitive.start, primitive.end];
  if (primitive.type === "polyline" || primitive.type === "polygon") return primitive.points;
  return [
    { x: primitive.x, y: primitive.y },
    { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
  ];
}

function hasTinyEdge(points) {
  return points.some((point, index) => distance(point, points[(index + 1) % points.length]) <= 0.000001);
}

function hasSelfCrossingPolygon(points) {
  for (let a = 0; a < points.length; a += 1) {
    const a1 = points[a];
    const a2 = points[(a + 1) % points.length];
    for (let b = a + 1; b < points.length; b += 1) {
      if (Math.abs(a - b) <= 1 || (a === 0 && b === points.length - 1)) continue;
      const b1 = points[b];
      const b2 = points[(b + 1) % points.length];
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

function segmentsIntersect(a1, a2, b1, b2) {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);
  return o1 * o2 < -0.000001 && o3 * o4 < -0.000001;
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function isFinitePoint(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    assert(!seen.has(value), `${label}: ${value}`);
    seen.add(value);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function kebab(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^-/, "");
}

function printRows(rows) {
  const columns = ["part", "width", "faces", "creases", "geometry", "anchors", "warnings"];
  const widths = Object.fromEntries(columns.map((column) => [
    column,
    Math.max(column.length, ...rows.map((row) => String(row[column]).length)),
  ]));
  console.log(columns.map((column) => column.padEnd(widths[column])).join(" | "));
  console.log(columns.map((column) => "-".repeat(widths[column])).join(" | "));
  for (const row of rows) {
    console.log(columns.map((column) => String(row[column]).padEnd(widths[column])).join(" | "));
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
