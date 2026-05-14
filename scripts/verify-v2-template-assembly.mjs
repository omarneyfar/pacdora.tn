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
const circularHangHoleTemplate = loadTs(path.join(projectRoot, "domain", "dieline", "v2Templates", "foldingBox", "circularHangHole.v2template"));
const hangTabTemplate = loadTs(path.join(projectRoot, "domain", "dieline", "v2Templates", "foldingBox", "hangTab.v2template"));
const {
  generateV2ReverseTuckEndAssembly,
  generateV2ReverseTuckEndDielineGraph,
} = reverseTuckEndTemplate;
const {
  generateV2StraightTuckEndAssembly,
  generateV2StraightTuckEndDielineGraph,
} = straightTuckEndTemplate;
const {
  generateV2CircularHangHoleAssembly,
  generateV2CircularHangHoleDielineGraph,
} = circularHangHoleTemplate;
const {
  generateV2HangTabAssembly,
  generateV2HangTabDielineGraph,
} = hangTabTemplate;
const { validateDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation", "validateDielineGraph"));
const { graphToSvg } = loadTs(path.join(projectRoot, "domain", "dieline", "canonicalGeometry"));

fs.mkdirSync(outputDir, { recursive: true });

const templateCases = [
  {
    name: "Reverse Tuck End",
    outputStem: "reverse-tuck-end-v2-template",
    expectedClosureContract: "standardTuckClosureFlap",
    values: { L: 120, W: 60, H: 160 },
    dust: {
      topLeft: ["topDustSideA-face", "topDustSideA"],
      topRight: ["topDustSideB-face", "topDustSideB"],
      bottomLeft: ["bottomDustSideA-face", "bottomDustSideA"],
      bottomRight: ["bottomDustSideB-face", "bottomDustSideB"],
    },
    assemblyFactory: generateV2ReverseTuckEndAssembly,
    graphFactory: generateV2ReverseTuckEndDielineGraph,
  },
  {
    name: "Straight Tuck End",
    outputStem: "straight-tuck-end-v2-template",
    expectedClosureContract: "standardTuckClosureFlap",
    values: { L: 120, W: 60, H: 160 },
    dust: {
      topLeft: ["topDustSideA-face", "topDustSideA"],
      topRight: ["topDustSideB-face", "topDustSideB"],
      bottomLeft: ["bottomDustSideA-face", "bottomDustSideA"],
      bottomRight: ["bottomDustSideB-face", "bottomDustSideB"],
    },
    assemblyFactory: generateV2StraightTuckEndAssembly,
    graphFactory: generateV2StraightTuckEndDielineGraph,
  },
  {
    name: "Circular Hang Hole",
    outputStem: "circular-hang-hole-v2-template",
    expectedClosureContract: "standardTuckClosureFlap",
    values: { L: 150, W: 25, H: 100, GFW: 15, OD: 20, hangExtensionWidth: 70, hangOuterRadius: 25 },
    dust: {
      topLeft: ["topDustSideB-face", "topDustSideB"],
      topRight: ["topDustSideA-face", "topDustSideA"],
      bottomLeft: ["bottomDustSideB-face", "bottomDustSideB"],
      bottomRight: ["bottomDustSideA-face", "bottomDustSideA"],
    },
    circularHang: true,
    assemblyFactory: generateV2CircularHangHoleAssembly,
    graphFactory: generateV2CircularHangHoleDielineGraph,
  },
  {
    name: "Hang Tab",
    outputStem: "hang-tab-v2-template",
    expectedClosureContract: "standardTuckClosureFlap",
    values: { L: 110, W: 80, H: 150, GFW: 15 },
    expectedFaceIds: [
      "body-sideA",
      "body-front",
      "body-sideB",
      "body-back",
      "sideGlue-face",
      "topDustSideA-face",
      "topDustSideB-face",
      "foldedHangTab-lower",
      "foldedHangTab-upper",
      "foldedHangTab-cap",
      "topTuck-face",
      "bottomMinorSideA-face",
      "bottomMajorFront-face",
      "bottomMinorSideB-face",
      "bottomMajorBack-face",
    ],
    hangTab: true,
    assemblyFactory: generateV2HangTabAssembly,
    graphFactory: generateV2HangTabDielineGraph,
  },
];

const results = [];

for (const templateCase of templateCases) {
  const values = templateCase.values;
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
  const expectedFaceIds = templateCase.expectedFaceIds ?? [
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

  if (templateCase.name === "Circular Hang Hole") {
    expectedFaceIds.push("sideHangPanel-face");
  }

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
  if (templateCase.dust) assertDustFlapHandedness(graph, templateCase.name, templateCase.dust);
  if (templateCase.circularHang) assertCircularHangHoleStructure(graph, assembly, templateCase.name);
  if (templateCase.hangTab) assertHangTabStructure(graph, assembly, templateCase.name);
}

function isFinitePoint(point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function assertDustFlapHandedness(graph, templateName, dust) {
  const topLeft = faceById(graph, dust.topLeft[0]);
  const topRight = faceById(graph, dust.topRight[0]);
  const bottomLeft = faceById(graph, dust.bottomLeft[0]);
  const bottomRight = faceById(graph, dust.bottomRight[0]);

  assert(normalizedPointSignature(topLeft) !== normalizedPointSignature(topRight), `${templateName}: top left/right dust flaps must be handed, not identical translated polygons.`);
  assert(normalizedPointSignature(bottomLeft) !== normalizedPointSignature(bottomRight), `${templateName}: bottom left/right dust flaps must be handed, not identical translated polygons.`);

  assertDustBaseMatchesCrease(topLeft, creaseById(graph, `${dust.topLeft[1]}-hinge`));
  assertDustBaseMatchesCrease(topRight, creaseById(graph, `${dust.topRight[1]}-hinge`));
  assertDustBaseMatchesCrease(bottomLeft, creaseById(graph, `${dust.bottomLeft[1]}-hinge`));
  assertDustBaseMatchesCrease(bottomRight, creaseById(graph, `${dust.bottomRight[1]}-hinge`));

  assertLeftHandedDustFlap(graph, topLeft, dust.topLeft[1]);
  assertRightHandedDustFlap(graph, topRight, dust.topRight[1]);
  assertLeftHandedDustFlap(graph, bottomLeft, dust.bottomLeft[1]);
  assertRightHandedDustFlap(graph, bottomRight, dust.bottomRight[1]);

  for (const crease of graph.creases) {
    assert(!/Dust.*relief|relief.*Dust/i.test(crease.id), `${templateName}: ${crease.id}: dust relief became a structural crease.`);
  }
}

function assertCircularHangHoleStructure(graph, assembly, templateName) {
  const contractIds = assembly.parts.map((part) => part.contractId);
  assert(contractIds.includes("sideCircularHangPanel"), `${templateName}: sideCircularHangPanel must be used for the right-side hanger.`);
  assert(contractIds.includes("circularCutout"), `${templateName}: circularCutout must be used for the hang hole.`);
  assert(!contractIds.includes("hangPanel"), `${templateName}: top hangPanel must not be used for the side hanger reference.`);
  assert(!graph.faces.some((face) => face.id === "hangPanel-face"), `${templateName}: top hangPanel face must not exist.`);

  const bodyBack = faceById(graph, "body-back");
  const sideGlue = faceById(graph, "sideGlue-face");
  assert(maxX(sideGlue.vertices) <= minX(bodyBack.vertices) + 0.000001, `${templateName}: glue tab must be on the left of the body strip.`);

  const sideHang = faceById(graph, "sideHangPanel-face");
  const bodyMaxX = Math.max(...graph.faces.filter((face) => face.id.startsWith("body-")).flatMap((face) => face.vertices.map((point) => point.x)));
  assert(minX(sideHang.vertices) >= bodyMaxX - 0.000001, `${templateName}: side hanger must attach on the right side of the body strip.`);
  assert(maxX(sideHang.vertices) > bodyMaxX, `${templateName}: side hanger must extend to the right of the body strip.`);
  assertDisplayBaseMatchesCrease(sideHang, creaseById(graph, "sideHangPanel-hinge"));

  const hole = (graph.geometry ?? []).find((primitive) => primitive.id === "circularCutout-circle");
  assert(hole, `${templateName}: circular cutout geometry primitive is missing.`);
  assert(hole.type === "circle", `${templateName}: circular cutout must be a circle primitive.`);
  assert(hole.layer === "hole", `${templateName}: circular cutout must remain on the hole layer.`);
  assertCircleInsideFace(hole, sideHang, templateName);

  for (const crease of graph.creases) {
    assert(!/circularCutout|circle|hole/i.test(crease.id), `${templateName}: circular cutout became a structural crease.`);
  }
}

function assertHangTabStructure(graph, assembly, templateName) {
  const contractIds = assembly.parts.map((part) => part.contractId);
  assert(contractIds.includes("foldedHangTabPanel"), `${templateName}: foldedHangTabPanel must be used for the top handle/display structure.`);
  assert(contractIds.filter((contractId) => contractId === "interlockingBottomFlap").length === 4, `${templateName}: bottom closure must use four interlockingBottomFlap parts.`);
  assert(contractIds.includes("sideGlueSeamTab"), `${templateName}: side glue seam tab is required.`);

  const bodyBack = faceById(graph, "body-back");
  const sideGlue = faceById(graph, "sideGlue-face");
  assert(minX(sideGlue.vertices) >= maxX(bodyBack.vertices) - 0.000001, `${templateName}: glue tab must remain on the far right.`);

  const lower = faceById(graph, "foldedHangTab-lower");
  const upper = faceById(graph, "foldedHangTab-upper");
  const cap = faceById(graph, "foldedHangTab-cap");
  const front = faceById(graph, "body-front");
  const topTuck = faceById(graph, "topTuck-face");
  const topDust = faceById(graph, "topDustSideA-face");
  const parameters = graph.metadata?.parameterValues ?? {};
  const expectedTuckDepth = parameters.W + parameters.TFW;
  assert(close(faceHeight(topTuck), expectedTuckDepth), `${templateName}: top tuck closure depth must use STE/RTE-style W + TFW calculation.`);
  assert(faceHeight(topTuck) > faceHeight(topDust), `${templateName}: top tuck closure should be deeper than standardDustFlap.`);
  assert(close(faceHeight(lower), faceHeight(upper)), `${templateName}: folded hang tab lower and upper panels must have equal height.`);
  assert(faceHeight(cap) < faceHeight(upper), `${templateName}: folded hang tab top cap must be shorter than the two main hang panels.`);
  assert(maxY(lower.vertices) <= minY(front.vertices) + 0.000001, `${templateName}: lower hang panel must sit above the front panel.`);
  assert(maxY(upper.vertices) <= minY(lower.vertices) + 0.000001, `${templateName}: upper fold-over panel must sit above the lower hang panel.`);
  assert(maxY(cap.vertices) <= minY(upper.vertices) + 0.000001, `${templateName}: short top cap must sit above the upper fold-over panel.`);
  assertDisplayBaseMatchesCrease(lower, creaseById(graph, "foldedHangTab-attach-hinge"));
  assertDisplayBaseMatchesCrease(upper, creaseById(graph, "foldedHangTab-panel-fold"));
  assertDisplayBaseMatchesCrease(cap, creaseById(graph, "foldedHangTab-cap-fold"));

  const lowerSlot = geometryById(graph, "foldedHangTab-lower-euro-slot");
  const upperSlot = geometryById(graph, "foldedHangTab-upper-rounded-slot");
  assert(lowerSlot.layer === "hole", `${templateName}: lower hang slot must stay geometry-only on the hole layer.`);
  assert(upperSlot.layer === "hole", `${templateName}: upper fold-over panel slot must stay geometry-only on the hole layer.`);
  assertPrimitiveSamplesInsideFace(lowerSlot, lower, `${templateName}: lower euro/keyhole slot must stay inside lower hang panel.`);
  assertPrimitiveSamplesInsideFace(upperSlot, upper, `${templateName}: upper rounded slot must stay inside upper fold-over panel.`);
  const foldY = minY(lower.vertices);
  const lowerSlotCenterDistanceFromFold = lowerHangSlotMainCenterY(lowerSlot, parameters) - foldY;
  const upperSlotCenterDistanceFromFold = foldY - slotCenterY(upperSlot);
  assert(close(lowerSlotCenterDistanceFromFold, upperSlotCenterDistanceFromFold), `${templateName}: folded hang tab slots must be positioned to overlay after folding.`);

  for (const crease of graph.creases) {
    assert(!/slot|hole|keyhole/i.test(crease.id), `${templateName}: slot or handle cutout became a structural crease.`);
  }

  const frontMajor = faceById(graph, "bottomMajorFront-face");
  const backMajor = faceById(graph, "bottomMajorBack-face");
  assert(normalizedPointSignature(frontMajor) === normalizedPointSignature(backMajor), `${templateName}: reference major bottom flaps should share the same right-relief cut logic in local coordinates.`);
  assertBottomBaseMatchesCrease(frontMajor, creaseById(graph, "bottomMajorFront-hinge"));
  assertBottomBaseMatchesCrease(backMajor, creaseById(graph, "bottomMajorBack-hinge"));
  assertBottomBaseMatchesCrease(faceById(graph, "bottomMinorSideA-face"), creaseById(graph, "bottomMinorSideA-hinge"));
  assertBottomBaseMatchesCrease(faceById(graph, "bottomMinorSideB-face"), creaseById(graph, "bottomMinorSideB-hinge"));

  const frontNotch = geometryById(graph, "bottomMajorFront-notch-center-guide");
  const backNotch = geometryById(graph, "bottomMajorBack-notch-center-guide");
  const frontNotchLocalX = (frontNotch.start.x + frontNotch.end.x) / 2 - minX(frontMajor.vertices);
  const backNotchLocalX = (backNotch.start.x + backNotch.end.x) / 2 - minX(backMajor.vertices);
  assert(close(frontNotchLocalX, backNotchLocalX), `${templateName}: major bottom notch centers must align in local panel coordinates.`);
}

function assertDisplayBaseMatchesCrease(face, crease) {
  const first = face.vertices[0];
  const last = face.vertices[face.vertices.length - 1];
  assert(pointsEqual(first, crease.edgeStart), `${face.id}: first base point must match display hinge start.`);
  assert(pointsEqual(last, crease.edgeEnd), `${face.id}: last base point must match display hinge end.`);
}

function assertBottomBaseMatchesCrease(face, crease) {
  const first = face.vertices[0];
  const last = face.vertices[face.vertices.length - 1];
  assert(pointsEqual(first, crease.edgeStart), `${face.id}: first base point must match bottom hinge start.`);
  assert(pointsEqual(last, crease.edgeEnd), `${face.id}: last base point must match bottom hinge end.`);
}

function assertCircleInsideFace(circle, face, templateName) {
  const samplePoints = [
    circle.center,
    { x: circle.center.x - circle.radius, y: circle.center.y },
    { x: circle.center.x + circle.radius, y: circle.center.y },
    { x: circle.center.x, y: circle.center.y - circle.radius },
    { x: circle.center.x, y: circle.center.y + circle.radius },
  ];
  for (const point of samplePoints) {
    assert(pointInOrOnPolygon(point, face.vertices), `${templateName}: circular cutout must stay inside side hanger panel.`);
  }
}

function assertPrimitiveSamplesInsideFace(primitive, face, message) {
  for (const point of primitivePoints(primitive)) {
    assert(pointInOrOnPolygon(point, face.vertices), message);
  }
}

function primitivePoints(primitive) {
  if (primitive.type === "circle") {
    return [
      primitive.center,
      { x: primitive.center.x - primitive.radius, y: primitive.center.y },
      { x: primitive.center.x + primitive.radius, y: primitive.center.y },
      { x: primitive.center.x, y: primitive.center.y - primitive.radius },
      { x: primitive.center.x, y: primitive.center.y + primitive.radius },
    ];
  }
  if (primitive.type === "line") return [primitive.start, primitive.end];
  if (primitive.type === "polyline" || primitive.type === "polygon") return primitive.points;
  return [
    { x: primitive.x, y: primitive.y },
    { x: primitive.x + primitive.width, y: primitive.y },
    { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
    { x: primitive.x, y: primitive.y + primitive.height },
    { x: primitive.x + primitive.width / 2, y: primitive.y + primitive.height / 2 },
  ];
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

function geometryById(graph, id) {
  const primitive = (graph.geometry ?? []).find((candidate) => candidate.id === id);
  assert(primitive, `Missing geometry primitive ${id}`);
  return primitive;
}

function minY(points) {
  return Math.min(...points.map((point) => point.y));
}

function maxY(points) {
  return Math.max(...points.map((point) => point.y));
}

function faceHeight(face) {
  return maxY(face.vertices) - minY(face.vertices);
}

function slotCenterY(slot) {
  if (slot.type === "polygon" || slot.type === "polyline") {
    const ys = slot.points.map((point) => point.y);
    return (Math.min(...ys) + Math.max(...ys)) / 2;
  }
  return slot.y + slot.height / 2;
}

function lowerHangSlotMainCenterY(slot, parameters) {
  if ((slot.type === "polygon" || slot.type === "polyline") && Number.isFinite(parameters.lowerSlotHeight)) {
    const bottomY = Math.max(...slot.points.map((point) => point.y));
    return bottomY - parameters.lowerSlotHeight / 2;
  }
  return slotCenterY(slot);
}

function normalizedPointSignature(face) {
  const minX = Math.min(...face.vertices.map((point) => point.x));
  const minY = Math.min(...face.vertices.map((point) => point.y));
  return face.vertices
    .map((point) => `${round(point.x - minX)},${round(point.y - minY)}`)
    .join(" ");
}

function minX(points) {
  return Math.min(...points.map((point) => point.x));
}

function maxX(points) {
  return Math.max(...points.map((point) => point.x));
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
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointOnSegment(point, start, end) {
  const length = distance(start, end);
  if (length <= 0.000001) return distance(point, start) <= 0.000001;
  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
  return cross / length <= 0.000001 && dot >= -0.000001 && dot <= length * length + 0.000001;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
