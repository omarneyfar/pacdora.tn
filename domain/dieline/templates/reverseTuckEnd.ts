import { createDielineFace, createExteriorCutPaths } from "../geometry";
import { createTemplateMetadata } from "../structure";
import type {
  DielineCrease,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  GeometryPrimitive,
  ParameterSpec,
  ParameterValueMap,
  Point,
} from "../types";

const RIGHT_ANGLE = Math.PI / 2;
const DEFAULTS = {
  L: 120.65,
  W: 60.72,
  H: 161.13,
  TFW: 19.85,
  TFR: 15.08,
  GFW: 15.88,
  DFW: 36.12,
  materialThickness: 1.5,
} as const;
const DEFAULT_AUTO_CLOSURE = autoClosureValues(DEFAULTS.L, DEFAULTS.W);

export type ReverseTuckEndParameters = {
  L?: number;
  W?: number;
  H?: number;
  TFW?: number;
  TFR?: number;
  GFW?: number;
  DFW?: number;
  closureMode?: "auto" | "manual";
  outputSizeMode?: "inner" | "outer";
  materialThickness?: number;
  material?: string;
  bleeds?: "none" | number;
  pdfExport?: boolean;
  dxfExport?: boolean;
  width?: number;
  height?: number;
  depth?: number;
};

type NormalizedReverseTuckEndParameters = Required<Omit<ReverseTuckEndParameters, "width" | "height" | "depth">>;

export const REVERSE_TUCK_END_PARAMETER_SPECS: ParameterSpec[] = [
  numberSpec("L", "Length(L)", DEFAULTS.L, 10, 800, 1, "mm"),
  numberSpec("W", "Width(W)", DEFAULTS.W, 8, 500, 1, "mm"),
  numberSpec("H", "Height(H)", DEFAULTS.H, 10, 900, 1, "mm"),
  {
    id: "closureMode",
    label: "Closure dimensions",
    kind: "closure",
    input: "select",
    defaultValue: "auto",
    options: [
      { label: "Auto", value: "auto" },
      { label: "Manual", value: "manual" },
    ],
  },
  {
    id: "outputSizeMode",
    label: "Output Size Mode",
    kind: "export",
    input: "select",
    defaultValue: "inner",
    options: [
      { label: "Inner dimensions", value: "inner" },
      { label: "Outer dimensions", value: "outer" },
    ],
  },
  numberSpec("materialThickness", "Material Thickness", DEFAULTS.materialThickness, 0, 12, 0.1, "mm", "material"),
  {
    id: "material",
    label: "Material",
    kind: "material",
    input: "select",
    defaultValue: "E-flute paper",
    options: [
      { label: "E-flute paper", value: "E-flute paper" },
      { label: "Cardboard", value: "Cardboard" },
      { label: "Kraft paper", value: "Kraft paper" },
    ],
  },
  {
    id: "bleeds",
    label: "Bleeds",
    kind: "export",
    input: "select",
    defaultValue: "none",
    options: [
      { label: "No bleeds", value: "none" },
      { label: "3 mm", value: 3 },
      { label: "5 mm", value: 5 },
    ],
  },
  { id: "pdfExport", label: "PDF for Dielines", kind: "export", input: "boolean", defaultValue: true },
  { id: "dxfExport", label: "DXF for Dielines", kind: "export", input: "boolean", defaultValue: true },
  numberSpec("TFW", "Tuck flap lip", DEFAULT_AUTO_CLOSURE.TFW, 1, 500, 0.5, "mm", "closure"),
  numberSpec("TFR", "Tuck flap radius", DEFAULT_AUTO_CLOSURE.TFR, 0, 120, 0.5, "mm", "closure"),
  numberSpec("GFW", "Glue tab width", DEFAULT_AUTO_CLOSURE.GFW, 1, 120, 0.5, "mm", "closure"),
  numberSpec("DFW", "Dust flap depth", DEFAULT_AUTO_CLOSURE.DFW, 1, 300, 0.5, "mm", "closure"),
];

export function generateReverseTuckEnd(input: ReverseTuckEndParameters = {}): DielineGraph {
  const rawValues = normalizeReverseTuckEndParameters(input);
  const values = applyDimensionMode(rawValues);
  const { L, W, H, TFW, TFR, GFW, DFW } = values;
  const topBand = Math.max(W + TFW, DFW);
  const bottomBand = Math.max(W + TFW, DFW);
  const bodyTop = topBand;
  const dustTop = bodyTop - DFW;
  const topTuckY = bodyTop - (W + TFW);
  const bodyBottom = bodyTop + H;
  const col0 = 0;
  const col1 = W;
  const col2 = col1 + L;
  const col3 = col2 + W;
  const col4 = col3 + L;
  const col5 = col4 + GFW;

  const faces: DielineFace[] = [
    rect("left", col0, bodyTop, W, H, "panel", "Left"),
    rect("front", col1, bodyTop, L, H, "panel", "Front"),
    rect("right", col2, bodyTop, W, H, "panel", "Right"),
    rect("back", col3, bodyTop, L, H, "panel", "Back"),
    glueTab("glue-tab", col4, bodyTop, GFW, H),
    dustFlap("top-dust-left", col0, dustTop, W, DFW, "top", "Top dust flap (L)"),
    dustFlap("top-dust-right", col2, dustTop, W, DFW, "top", "Top dust flap (R)"),
    tuckFlap("top-tuck", col1, topTuckY, L, W + TFW, TFW, TFR, "top", "Top tuck flap"),
    dustFlap("bottom-dust-left", col0, bodyBottom, W, DFW, "bottom", "Bottom dust flap (L)"),
    dustFlap("bottom-dust-right", col2, bodyBottom, W, DFW, "bottom", "Bottom dust flap (R)"),
    tuckFlap("bottom-tuck", col3, bodyBottom, L, W + TFW, TFW, TFR, "bottom", "Bottom tuck flap"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-left-front", "left", "front", { x: col1, y: bodyTop }, { x: col1, y: bodyBottom }),
    crease("cr-front-right", "front", "right", { x: col2, y: bodyTop }, { x: col2, y: bodyBottom }),
    crease("cr-right-back", "right", "back", { x: col3, y: bodyTop }, { x: col3, y: bodyBottom }),
    crease("cr-back-glue", "back", "glue-tab", { x: col4, y: bodyTop }, { x: col4, y: bodyBottom }),
    crease("cr-left-topdust", "left", "top-dust-left", { x: col0, y: bodyTop }, { x: col1, y: bodyTop }),
    crease("cr-front-toptuck", "front", "top-tuck", { x: col1, y: bodyTop }, { x: col2, y: bodyTop }),
    crease("cr-right-topdust", "right", "top-dust-right", { x: col2, y: bodyTop }, { x: col3, y: bodyTop }),
    crease("cr-left-bottomdust", "left", "bottom-dust-left", { x: col0, y: bodyBottom }, { x: col1, y: bodyBottom }),
    crease("cr-right-bottomdust", "right", "bottom-dust-right", { x: col2, y: bodyBottom }, { x: col3, y: bodyBottom }),
    crease("cr-back-bottomtuck", "back", "bottom-tuck", { x: col3, y: bodyBottom }, { x: col4, y: bodyBottom }),
  ];

  // Internal score lines on tuck flaps (lip bend marks).
  // These are NOT structural hinges — they don't create child faces in faceTree.
  // They live in graph.geometry as visual/manufacturing crease lines.
  const internalScoreLines: GeometryPrimitive[] = [
    { id: "score-toptuck-lip", layer: "crease", type: "line", start: { x: col1, y: topTuckY + TFW }, end: { x: col2, y: topTuckY + TFW } },
    { id: "score-bottomtuck-lip", layer: "crease", type: "line", start: { x: col3, y: bodyBottom + W }, end: { x: col4, y: bodyBottom + W } },
  ];

  const exteriorCutPaths = createExteriorCutPaths(faces);
  const geometry: GeometryPrimitive[] = [
    ...exteriorCutPaths.flatMap((path, index) => path.points && path.points.length >= 2
      ? [{ id: path.id || `cut-${index + 1}`, layer: "cut" as const, type: "polyline" as const, points: path.points }]
      : []),
    ...creases.map((current): GeometryPrimitive => ({
      id: current.id,
      layer: "crease",
      type: "line",
      start: current.edgeStart,
      end: current.edgeEnd,
    })),
    ...internalScoreLines,
    ...faces.map((face): GeometryPrimitive => ({
      id: `label-${face.id}`,
      layer: "label",
      type: "label",
      position: face.centroid,
      text: face.label,
    })),
  ];

  const graph: DielineGraph = {
    size: { width: col5, height: bodyBottom + bottomBand },
    faces,
    creases,
    cutPaths: exteriorCutPaths,
    faceTree: getFaceTree(),
    geometry,
    metadata: createTemplateMetadata({
      category: "folding-box",
      family: "reverse-tuck-end",
      familyLabel: "Reverse Tuck End Folding Carton Box",
      parts: [
        {
          id: "body-panels",
          label: "Body panels",
          role: "body",
          faceIds: ["front", "back", "left", "right"],
          creaseIds: ["cr-left-front", "cr-front-right", "cr-right-back", "cr-back-glue"],
        },
        {
          id: "top-closure",
          label: "Top closure",
          role: "top-closure",
          faceIds: ["top-tuck", "top-dust-left", "top-dust-right"],
          creaseIds: ["cr-front-toptuck", "cr-left-topdust", "cr-right-topdust"],
        },
        {
          id: "bottom-closure",
          label: "Bottom closure",
          role: "bottom-closure",
          faceIds: ["bottom-tuck", "bottom-dust-left", "bottom-dust-right"],
          creaseIds: ["cr-back-bottomtuck", "cr-left-bottomdust", "cr-right-bottomdust"],
        },
        {
          id: "glue-tab",
          label: "Glue tab",
          role: "glue-flap",
          faceIds: ["glue-tab"],
          creaseIds: ["cr-back-glue"],
        },
      ],
      parameterSpecs: REVERSE_TUCK_END_PARAMETER_SPECS,
      parameterValues: values,
      parameters: parameterValuesToList(values),
    }),
    source: { type: "template", templateId: "reverse-tuck-end" },
  };

  validateReverseTuckEndGraph(graph, values);

  return graph;
}

export function normalizeReverseTuckEndParameters(input: ReverseTuckEndParameters = {}): NormalizedReverseTuckEndParameters {
  const L = positive(input.L ?? input.width, DEFAULTS.L);
  const W = positive(input.W ?? input.depth, DEFAULTS.W);
  const H = positive(input.H ?? input.height, DEFAULTS.H);
  const closureMode = input.closureMode === "manual" ? "manual" : "auto";
  const auto = autoClosureValues(L, W);
  const TFW = closureMode === "manual"
    ? clampNumber(input.TFW, W * 0.15, W * 0.6, auto.TFW)
    : auto.TFW;
  const DFW = closureMode === "manual"
    ? clampNumber(input.DFW, W * 0.25, Math.min(W * 0.9, W * 1.15 - TFW), auto.DFW)
    : auto.DFW;
  const TFR = closureMode === "manual"
    ? clampNumber(input.TFR, 0, Math.min(W * 0.5, L * 0.25), auto.TFR)
    : auto.TFR;
  const GFW = closureMode === "manual"
    ? clampNumber(input.GFW, 10, 22, auto.GFW)
    : auto.GFW;

  return {
    L,
    W,
    H,
    TFW,
    TFR,
    GFW,
    DFW,
    closureMode,
    outputSizeMode: input.outputSizeMode === "outer" ? "outer" : "inner",
    materialThickness: clampNumber(input.materialThickness, 0, 12, DEFAULTS.materialThickness),
    material: input.material || "E-flute paper",
    bleeds: input.bleeds ?? "none",
    pdfExport: input.pdfExport ?? true,
    dxfExport: input.dxfExport ?? true,
  };
}

function applyDimensionMode(values: NormalizedReverseTuckEndParameters): NormalizedReverseTuckEndParameters {
  if (values.outputSizeMode !== "outer") {
    return values;
  }

  const inset = values.materialThickness * 2;
  const resized = {
    ...values,
    L: Math.max(1, values.L - inset),
    W: Math.max(1, values.W - inset),
    H: Math.max(1, values.H - inset),
  };

  if (resized.closureMode === "auto") {
    return {
      ...resized,
      ...autoClosureValues(resized.L, resized.W),
    };
  }

  const TFW = clampNumber(resized.TFW, resized.W * 0.15, resized.W * 0.6, DEFAULT_AUTO_CLOSURE.TFW);

  return {
    ...resized,
    TFW,
    DFW: clampNumber(resized.DFW, resized.W * 0.25, Math.min(resized.W * 0.9, resized.W * 1.15 - TFW), DEFAULT_AUTO_CLOSURE.DFW),
    TFR: clampNumber(resized.TFR, 0, Math.min(resized.W * 0.5, resized.L * 0.25), DEFAULT_AUTO_CLOSURE.TFR),
    GFW: clampNumber(resized.GFW, 10, 22, DEFAULT_AUTO_CLOSURE.GFW),
  };
}

function parameterValuesToList(values: ParameterValueMap) {
  return REVERSE_TUCK_END_PARAMETER_SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    kind: spec.kind,
    value: values[spec.id],
    ...(spec.unit ? { unit: spec.unit } : {}),
  }));
}

function rect(id: string, x: number, y: number, width: number, height: number, role: DielineFace["role"], label: string): DielineFace {
  return createDielineFace({
    id,
    label,
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    role,
    artworkEnabled: role === "panel",
  });
}

function glueTab(id: string, x: number, y: number, width: number, height: number): DielineFace {
  const bevel = Math.min(width * 0.34, height * 0.08);
  return createDielineFace({
    id,
    label: "Glue tab",
    vertices: [
      { x, y },
      { x: x + width, y: y + bevel },
      { x: x + width, y: y + height - bevel },
      { x, y: y + height },
    ],
    role: "glue",
    artworkEnabled: false,
  });
}

function dustFlap(id: string, x: number, y: number, width: number, height: number, direction: "top" | "bottom", label: string): DielineFace {
  const taper = Math.min(width * 0.15, height * 0.3);
  const shoulder = Math.min(3, height * 0.1);
  const topY = direction === "top" ? y : y + height;
  const lidY = direction === "top" ? y + height : y;
  const shoulderY = direction === "top" ? lidY - shoulder : lidY + shoulder;

  const vertices = direction === "top"
    ? [
        { x, y: lidY },
        { x, y: shoulderY },
        { x: x + taper, y: topY },
        { x: x + width - taper, y: topY },
        { x: x + width, y: shoulderY },
        { x: x + width, y: lidY },
      ]
    : [
        { x, y: lidY },
        { x, y: shoulderY },
        { x: x + taper, y: topY },
        { x: x + width - taper, y: topY },
        { x: x + width, y: shoulderY },
        { x: x + width, y: lidY },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function tuckFlap(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  lipHeight: number,
  taper: number,
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const innerY = direction === "top" ? y + lipHeight : y + height - lipHeight;
  const topY = direction === "top" ? y : y + height;
  const lidY = direction === "top" ? y + height : y;
  
  const r = Math.min(5, taper, lipHeight * 0.5); 
  const slit = Math.min(3, taper * 0.5);
  
  const leftSlitX = x + slit;
  const rightSlitX = x + width - slit;
  
  const leftTopCurveCenterX = x + taper + r;
  const rightTopCurveCenterX = x + width - taper - r;
  const topCurveCenterY = direction === "top" ? topY + r : topY - r;
  
  const vertices = direction === "top"
    ? [
        { x, y: lidY },
        { x, y: innerY },
        { x: leftSlitX, y: innerY },
        { x: leftSlitX, y: innerY - slit * 0.5 },
        ...sampleQuarterArc({ x: leftTopCurveCenterX, y: topCurveCenterY }, r, Math.PI, Math.PI * 1.5),
        { x: rightTopCurveCenterX, y: topY },
        ...sampleQuarterArc({ x: rightTopCurveCenterX, y: topCurveCenterY }, r, Math.PI * 1.5, Math.PI * 2).slice(1),
        { x: rightSlitX, y: innerY - slit * 0.5 },
        { x: rightSlitX, y: innerY },
        { x: x + width, y: innerY },
        { x: x + width, y: lidY },
      ]
    : [
        { x, y: lidY },
        { x, y: innerY },
        { x: leftSlitX, y: innerY },
        { x: leftSlitX, y: innerY + slit * 0.5 },
        ...sampleQuarterArc({ x: leftTopCurveCenterX, y: topCurveCenterY }, r, Math.PI, Math.PI * 0.5),
        { x: rightTopCurveCenterX, y: topY },
        ...sampleQuarterArc({ x: rightTopCurveCenterX, y: topCurveCenterY }, r, Math.PI * 0.5, 0).slice(1),
        { x: rightSlitX, y: innerY + slit * 0.5 },
        { x: rightSlitX, y: innerY },
        { x: x + width, y: innerY },
        { x: x + width, y: lidY },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function crease(id: string, faceA: string, faceB: string, edgeStart: Point, edgeEnd: Point): DielineCrease {
  return { id, faceA, faceB, edgeStart, edgeEnd, foldAngle: RIGHT_ANGLE, direction: 1 };
}

function getFaceTree(): DielineFaceNode[] {
  return [
    {
      faceId: "front",
      creaseId: null,
      children: [
        {
          faceId: "left",
          creaseId: "cr-left-front",
          children: [
            { faceId: "top-dust-left", creaseId: "cr-left-topdust", children: [] },
            { faceId: "bottom-dust-left", creaseId: "cr-left-bottomdust", children: [] },
          ],
        },
        {
          faceId: "right",
          creaseId: "cr-front-right",
          children: [
            {
              faceId: "back",
              creaseId: "cr-right-back",
              children: [
                { faceId: "glue-tab", creaseId: "cr-back-glue", children: [] },
                { faceId: "bottom-tuck", creaseId: "cr-back-bottomtuck", children: [] },
              ],
            },
            { faceId: "top-dust-right", creaseId: "cr-right-topdust", children: [] },
            { faceId: "bottom-dust-right", creaseId: "cr-right-bottomdust", children: [] },
          ],
        },
        { faceId: "top-tuck", creaseId: "cr-front-toptuck", children: [] },
      ],
    },
  ];
}

function sampleQuarterArc(center: Point, radius: number, startAngle: number, endAngle: number): Point[] {
  return Array.from({ length: 7 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / 6;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

function autoClosureValues(L: number, W: number) {
  return {
    TFW: clampNumber(W * 0.32, W * 0.22, W * 0.45, W * 0.32),
    DFW: clampNumber(W * 0.58, W * 0.45, W * 0.75, W * 0.58),
    TFR: clampNumber(W * 0.25, 4, Math.min(W * 0.35, L * 0.2), W * 0.25),
    GFW: clampNumber(W * 0.25, 10, 22, W * 0.25),
  };
}

function validateReverseTuckEndGraph(graph: DielineGraph, values: NormalizedReverseTuckEndParameters) {
  const errors: string[] = [];
  const faceIds = new Set<string>();
  const facesById = new Map<string, DielineFace>();
  const creaseIds = new Set<string>();
  const creasesById = new Map<string, DielineCrease>();

  if (!isPositiveFinite(graph.size.width) || !isPositiveFinite(graph.size.height)) {
    errors.push("graph size must be positive and finite");
  }

  if (values.TFW + values.DFW > values.W * 1.15 + 0.0001) {
    errors.push("TFW + DFW must not exceed W * 1.15");
  }

  if (values.GFW < 10 || values.GFW > 22) {
    errors.push("GFW must stay between 10 and 22 mm");
  }

  if (values.TFR > values.W / 2) {
    errors.push("TFR must not exceed half of W");
  }

  for (const face of graph.faces) {
    if (faceIds.has(face.id)) {
      errors.push(`duplicate face id ${face.id}`);
    }

    faceIds.add(face.id);
    facesById.set(face.id, face);

    if (face.vertices.length < 3) {
      errors.push(`face ${face.id} must have at least 3 vertices`);
    }

    if (!face.vertices.every(isFinitePoint)) {
      errors.push(`face ${face.id} contains non-finite points`);
    }

    if (face.bounds.width < 0 || face.bounds.height < 0 || !isFinitePoint({ x: face.bounds.x, y: face.bounds.y })) {
      errors.push(`face ${face.id} has invalid bounds`);
    }

    if (hasSelfIntersection(face.vertices)) {
      errors.push(`face ${face.id} has self-crossing polygon geometry`);
    }

    if (hasTinyPolygonEdge(face.vertices)) {
      errors.push(`face ${face.id} has duplicate or zero-length polygon edges`);
    }
  }

  for (const crease of graph.creases) {
    if (creaseIds.has(crease.id)) {
      errors.push(`duplicate crease id ${crease.id}`);
    }

    creaseIds.add(crease.id);
    creasesById.set(crease.id, crease);

    if (!faceIds.has(crease.faceA) || !faceIds.has(crease.faceB)) {
      errors.push(`crease ${crease.id} references a missing face`);
    }

    if (!isFinitePoint(crease.edgeStart) || !isFinitePoint(crease.edgeEnd)) {
      errors.push(`crease ${crease.id} contains non-finite endpoints`);
    }

    if (distance2D(crease.edgeStart, crease.edgeEnd) <= 0.000001) {
      errors.push(`crease ${crease.id} has zero length`);
    }

    const faceA = facesById.get(crease.faceA);
    const faceB = facesById.get(crease.faceB);
    if (faceA && !isCreaseOnFaceBoundary(crease, faceA)) {
      errors.push(`crease ${crease.id} is not on boundary of face ${faceA.id}`);
    }
    if (faceB && !isCreaseOnFaceBoundary(crease, faceB)) {
      errors.push(`crease ${crease.id} is not on boundary of face ${faceB.id}`);
    }
  }

  for (const cutPath of graph.cutPaths) {
    if (cutPath.points && !cutPath.points.every(isFinitePoint)) {
      errors.push(`cut path ${cutPath.id} contains non-finite points`);
    }

    if (cutPath.points && hasTinyPolylineSegment(cutPath.points)) {
      errors.push(`cut path ${cutPath.id} contains zero-length segments`);
    }
  }

  for (const primitive of graph.geometry ?? []) {
    if (!getPrimitivePoints(primitive).every(isFinitePoint)) {
      errors.push(`geometry primitive ${primitive.id} contains non-finite points`);
    }
  }

  const treeFaceIds = new Set<string>();
  if (graph.faceTree.length !== 1) {
    errors.push(`faceTree must have exactly one root, got ${graph.faceTree.length}`);
  }

  for (const node of graph.faceTree) {
    validateFaceTreeNode(node, true, null, faceIds, creasesById, treeFaceIds, errors);
  }

  for (const faceId of faceIds) {
    if (!treeFaceIds.has(faceId)) {
      errors.push(`faceTree missing face ${faceId}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid Reverse Tuck End graph: ${errors.join("; ")}`);
  }
}

function getPrimitivePoints(primitive: GeometryPrimitive): Point[] {
  switch (primitive.type) {
    case "line":
      return [primitive.start, primitive.end];
    case "polyline":
    case "polygon":
      return primitive.points;
    case "arc":
    case "circle":
    case "ellipse":
      return [primitive.center];
    case "label":
      return [primitive.position];
    case "rounded-rect":
    case "slot":
      return [
        { x: primitive.x, y: primitive.y },
        { x: primitive.x + primitive.width, y: primitive.y + primitive.height },
      ];
  }
}

function validateFaceTreeNode(
  node: DielineFaceNode,
  isRoot: boolean,
  parentFaceId: string | null,
  faceIds: Set<string>,
  creasesById: Map<string, DielineCrease>,
  treeFaceIds: Set<string>,
  errors: string[],
) {
  if (!faceIds.has(node.faceId)) {
    errors.push(`faceTree references missing face ${node.faceId}`);
  }

  if (treeFaceIds.has(node.faceId)) {
    errors.push(`faceTree contains duplicate face ${node.faceId}`);
  }

  treeFaceIds.add(node.faceId);

  if (isRoot) {
    if (node.creaseId !== null) {
      errors.push(`faceTree root ${node.faceId} must not have a crease`);
    }
  } else if (!node.creaseId) {
    errors.push(`faceTree face ${node.faceId} references missing crease null`);
  } else {
    const crease = creasesById.get(node.creaseId);
    if (!crease) {
      errors.push(`faceTree face ${node.faceId} references missing crease ${node.creaseId}`);
    } else if (parentFaceId && !creaseConnectsFaces(crease, parentFaceId, node.faceId)) {
      errors.push(`faceTree crease ${node.creaseId} does not connect parent ${parentFaceId} to child ${node.faceId}`);
    }
  }

  for (const child of node.children) {
    validateFaceTreeNode(child, false, node.faceId, faceIds, creasesById, treeFaceIds, errors);
  }
}

function creaseConnectsFaces(crease: DielineCrease, faceA: string, faceB: string): boolean {
  return (crease.faceA === faceA && crease.faceB === faceB) || (crease.faceA === faceB && crease.faceB === faceA);
}

function isCreaseOnFaceBoundary(crease: DielineCrease, face: DielineFace): boolean {
  return isPointOnFaceBoundary(crease.edgeStart, face) && isPointOnFaceBoundary(crease.edgeEnd, face);
}

function isPointOnFaceBoundary(point: Point, face: DielineFace): boolean {
  return face.vertices.some((start, index) => pointOnSegment(point, start, face.vertices[(index + 1) % face.vertices.length]));
}

function pointOnSegment(point: Point, start: Point, end: Point): boolean {
  const length = distance2D(start, end);

  if (length <= 0.000001) {
    return distance2D(point, start) <= 0.00001;
  }

  const cross = Math.abs((point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y));
  const dot = (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);

  return cross / length <= 0.00001 && dot >= -0.00001 && dot <= length * length + 0.00001;
}

function hasTinyPolygonEdge(points: Point[]): boolean {
  return points.some((point, index) => distance2D(point, points[(index + 1) % points.length]) <= 0.000001);
}

function hasTinyPolylineSegment(points: Point[]): boolean {
  return points.some((point, index) => index > 0 && distance2D(point, points[index - 1]) <= 0.000001);
}

function distance2D(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hasSelfIntersection(points: Point[]): boolean {
  for (let a = 0; a < points.length; a += 1) {
    const a1 = points[a];
    const a2 = points[(a + 1) % points.length];

    for (let b = a + 1; b < points.length; b += 1) {
      if (Math.abs(a - b) <= 1 || (a === 0 && b === points.length - 1)) {
        continue;
      }

      const b1 = points[b];
      const b2 = points[(b + 1) % points.length];

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  return false;
}

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  return o1 * o2 < -0.0000001 && o3 * o4 < -0.0000001;
}

function orientation(a: Point, b: Point, c: Point): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function numberSpec(
  id: string,
  label: string,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  kind: ParameterSpec["kind"] = "dimension",
): ParameterSpec {
  return { id, label, kind, input: "number", defaultValue, min, max, step, unit };
}

function positive(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);

  if (!Number.isFinite(numeric)) {
    return Math.min(safeMax, Math.max(safeMin, fallback));
  }

  return Math.min(safeMax, Math.max(safeMin, numeric));
}
