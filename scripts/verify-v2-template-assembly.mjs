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

const reverseTuckEndTemplate = loadTs(path.join(projectRoot, "domain", "dieline", "v2Templates", "foldingBox", "reverseTuckEnd.v2template"));
const straightTuckEndTemplate = loadTs(path.join(projectRoot, "domain", "dieline", "v2Templates", "foldingBox", "straightTuckEnd.v2template"));
const {
  generateV2ReverseTuckEndAssembly,
  generateV2ReverseTuckEndDielineGraph,
} = reverseTuckEndTemplate;
const {
  generateV2StraightTuckEndAssembly,
  generateV2StraightTuckEndDielineGraph,
} = straightTuckEndTemplate;
const { validateDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation", "validateDielineGraph"));
const { graphToSvg } = loadTs(path.join(projectRoot, "domain", "dieline", "canonicalGeometry"));

fs.mkdirSync(outputDir, { recursive: true });

const templateCases = [
  {
    name: "Reverse Tuck End",
    outputStem: "reverse-tuck-end-v2-template",
    expectedClosureContract: "standardTuckClosureFlap",
    assemblyFactory: generateV2ReverseTuckEndAssembly,
    graphFactory: generateV2ReverseTuckEndDielineGraph,
  },
  {
    name: "Straight Tuck End",
    outputStem: "straight-tuck-end-v2-template",
    expectedClosureContract: "standardTuckClosureFlap",
    assemblyFactory: generateV2StraightTuckEndAssembly,
    graphFactory: generateV2StraightTuckEndDielineGraph,
  },
];

const results = [];

for (const templateCase of templateCases) {
  const values = { L: 120, W: 60, H: 160 };
  const assembly = templateCase.assemblyFactory(values);
  const graph = templateCase.graphFactory(values);
  const validation = validateDielineGraph(graph);

  assert(validation.ok, `${templateCase.name}: DielineGraph validation failed: ${validation.errors.join("; ")}`);
  assertGraphShape(graph, assembly, templateCase);

  const svgPath = path.join(outputDir, `${templateCase.outputStem}.debug.svg`);
  const graphPath = path.join(outputDir, `${templateCase.outputStem}.graph.json`);

  fs.writeFileSync(svgPath, graphToSvg(graph), "utf8");
  fs.writeFileSync(graphPath, `${JSON.stringify(graph, null, 2)}\n`, "utf8");

  results.push({
    name: templateCase.name,
    faces: graph.faces.length,
    creases: graph.creases.length,
    geometry: graph.geometry?.length ?? 0,
    warnings: validation.warnings,
    svgPath,
    graphPath,
  });
}

console.log(`V2 template assembly verification passed for ${results.length} templates.`);
for (const result of results) {
  console.log(`${result.name}: faces=${result.faces}, creases=${result.creases}, geometry=${result.geometry}, warnings=${result.warnings.join("; ") || "none"}`);
  console.log(`  Debug SVG: ${path.relative(projectRoot, result.svgPath)}`);
  console.log(`  Graph JSON: ${path.relative(projectRoot, result.graphPath)}`);
}

function assertGraphShape(graph, assembly, templateCase) {
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
    assert(faceIds.has(faceId), `${templateCase.name}: missing stable V2 face id: ${faceId}`);
  }

  for (const face of graph.faces) {
    assert(face.vertices.every(isFinitePoint), `${templateCase.name}: ${face.id}: non-finite vertices`);
    assert(!hasSelfCrossingPolygon(face.vertices), `${templateCase.name}: ${face.id}: self-intersecting polygon`);
  }

  for (const crease of graph.creases) {
    assert(faceIds.has(crease.faceA), `${templateCase.name}: ${crease.id}: missing faceA`);
    assert(faceIds.has(crease.faceB), `${templateCase.name}: ${crease.id}: missing faceB`);
    assert(crease.faceA !== crease.faceB, `${templateCase.name}: ${crease.id}: self-referencing crease`);
    assert(isFinitePoint(crease.edgeStart) && isFinitePoint(crease.edgeEnd), `${templateCase.name}: ${crease.id}: non-finite endpoints`);
    assert(!/score|slot|hole|window|relief|safe|bleed|perforation|notch|zone/i.test(crease.id), `${templateCase.name}: ${crease.id}: geometry-only item became crease`);
    assert(crease.foldAngle > 0 && crease.foldAngle <= Math.PI + 0.000001, `${templateCase.name}: ${crease.id}: foldAngle should be radians`);
  }

  const contractIds = assembly.parts.map((part) => part.contractId);
  assert(contractIds.includes(templateCase.expectedClosureContract), `${templateCase.name}: expected closure contract ${templateCase.expectedClosureContract} was not used.`);

  for (const part of assembly.parts) {
    assert(part.implementationStatus !== "spec-only", `${templateCase.name}: ${part.id}: spec-only part was used`);
    assert(part.productionReady === false, `${templateCase.name}: ${part.id}: productionReady must remain false`);
  }

  assert(graph.metadata?.catalog?.generatorId === "v2Library/template-assembly", `${templateCase.name}: graph metadata must identify v2Library template assembly source.`);
  assert(graph.metadata?.catalog?.productionReady === false, `${templateCase.name}: graph metadata must remain productionReady=false.`);
  assert(graph.source?.type === "template" && graph.source.templateId.includes("v2Library/template-assembly"), `${templateCase.name}: graph source must identify v2Library.`);
  assertDustFlapHandedness(graph, templateCase.name);
}

function isFinitePoint(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function assertDustFlapHandedness(graph, templateName) {
  const topLeft = faceById(graph, "topDustSideA-face");
  const topRight = faceById(graph, "topDustSideB-face");
  const bottomLeft = faceById(graph, "bottomDustSideA-face");
  const bottomRight = faceById(graph, "bottomDustSideB-face");

  assert(normalizedPointSignature(topLeft) !== normalizedPointSignature(topRight), `${templateName}: top left/right dust flaps must be handed, not identical translated polygons.`);
  assert(normalizedPointSignature(bottomLeft) !== normalizedPointSignature(bottomRight), `${templateName}: bottom left/right dust flaps must be handed, not identical translated polygons.`);

  assertDustBaseMatchesCrease(topLeft, creaseById(graph, "topDustSideA-hinge"));
  assertDustBaseMatchesCrease(topRight, creaseById(graph, "topDustSideB-hinge"));
  assertDustBaseMatchesCrease(bottomLeft, creaseById(graph, "bottomDustSideA-hinge"));
  assertDustBaseMatchesCrease(bottomRight, creaseById(graph, "bottomDustSideB-hinge"));

  assertLeftHandedDustFlap(graph, topLeft, "topDustSideA");
  assertRightHandedDustFlap(graph, topRight, "topDustSideB");
  assertLeftHandedDustFlap(graph, bottomLeft, "bottomDustSideA");
  assertRightHandedDustFlap(graph, bottomRight, "bottomDustSideB");

  for (const crease of graph.creases) {
    assert(!/Dust.*relief|relief.*Dust/i.test(crease.id), `${templateName}: ${crease.id}: dust relief became a structural crease.`);
  }
}

function assertDustBaseMatchesCrease(face, crease) {
  const first = face.vertices[0];
  const last = face.vertices[face.vertices.length - 1];
  assert(pointsEqual(first, crease.edgeStart), `${face.id}: first base point must match dust hinge start.`);
  assert(pointsEqual(last, crease.edgeEnd), `${face.id}: last base point must match dust hinge end.`);
}

function assertLeftHandedDustFlap(graph, face, partId) {
  assert(face.vertices.length === 7, `${face.id}: visual-left dust flap should have seven outline points with integrated shoulder and return relief.`);
  const minX = Math.min(...face.vertices.map((point) => point.x));
  const maxX = Math.max(...face.vertices.map((point) => point.x));
  assert(close(face.vertices[0].x, minX), `${face.id}: visual-left dust flap must start at the outer left base.`);
  assert(face.vertices[1].x > minX, `${face.id}: visual-left lower relief must move inward from the outer left base.`);
  assert(face.vertices[2].x > face.vertices[1].x, `${face.id}: visual-left shoulder must continue stepping inward.`);
  assert(face.vertices[3].x > face.vertices[2].x, `${face.id}: visual-left outer wall must lean inward toward the free edge.`);
  assert(face.vertices[4].x > face.vertices[3].x && face.vertices[4].x < maxX, `${face.id}: visual-left top edge must remain horizontal before the inner taper.`);
  assert(face.vertices[5].x > face.vertices[4].x && face.vertices[5].x < maxX, `${face.id}: visual-left inner taper must return through a lower shoulder before the base.`);
  assertNoWrongSideReliefPrimitive(graph, face, partId);
}

function assertRightHandedDustFlap(graph, face, partId) {
  assert(face.vertices.length === 7, `${face.id}: visual-right dust flap should have seven outline points with integrated shoulder and return relief.`);
  const minX = Math.min(...face.vertices.map((point) => point.x));
  const maxX = Math.max(...face.vertices.map((point) => point.x));
  assert(close(face.vertices[6].x, maxX), `${face.id}: visual-right dust flap must end at the outer right base.`);
  assert(face.vertices[1].x > minX && face.vertices[2].x > face.vertices[1].x, `${face.id}: visual-right inner taper must leave the base through a lower shoulder.`);
  assert(face.vertices[3].x > face.vertices[2].x && face.vertices[3].x < face.vertices[4].x, `${face.id}: visual-right top edge must stay horizontal before the outer wall.`);
  assert(face.vertices[4].x < face.vertices[5].x && face.vertices[5].x < maxX, `${face.id}: visual-right shoulder must step back toward the outer right base.`);
  assertNoWrongSideReliefPrimitive(graph, face, partId);
}

function assertNoWrongSideReliefPrimitive(graph, face, partId) {
  const geometry = graph.geometry ?? [];
  const reliefPrimitives = geometry.filter((primitive) => primitive.id.startsWith(`${partId}-relief-`));
  assert(reliefPrimitives.length === 0, `${face.id}: shoulder relief should be part of the cut outline, not a floating primitive.`);
}

function faceById(graph, id) {
  const face = graph.faces.find((candidate) => candidate.id === id);
  assert(face, `Missing dust flap face ${id}`);
  return face;
}

function creaseById(graph, id) {
  const crease = graph.creases.find((candidate) => candidate.id === id);
  assert(crease, `Missing dust flap hinge ${id}`);
  return crease;
}

function normalizedPointSignature(face) {
  const minX = Math.min(...face.vertices.map((point) => point.x));
  const minY = Math.min(...face.vertices.map((point) => point.y));
  return face.vertices
    .map((point) => `${round(point.x - minX)},${round(point.y - minY)}`)
    .join(" ");
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

function pointsEqual(a, b) {
  return close(a.x, b.x) && close(a.y, b.y);
}

function close(a, b) {
  return Math.abs(a - b) <= 0.000001;
}

function round(value) {
  return Math.round(value * 1000000) / 1000000;
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
