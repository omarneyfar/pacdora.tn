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

export type ReverseTuckEndParameters = {
  L?: number;
  W?: number;
  H?: number;
  TFW?: number;
  TFR?: number;
  GFW?: number;
  DFW?: number;
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

export const REVERSE_TUCK_END_PARAMETER_SPECS: ParameterSpec[] = [
  numberSpec("L", "Length(L)", DEFAULTS.L, 10, 800, 1, "mm"),
  numberSpec("W", "Width(W)", DEFAULTS.W, 8, 500, 1, "mm"),
  numberSpec("H", "Height(H)", DEFAULTS.H, 10, 900, 1, "mm"),
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
  numberSpec("TFW", "TFW", DEFAULTS.TFW, 1, 500, 0.5, "mm", "closure"),
  numberSpec("TFR", "TFR", DEFAULTS.TFR, 0, 120, 0.5, "mm", "closure"),
  numberSpec("GFW", "GFW", DEFAULTS.GFW, 1, 120, 0.5, "mm", "closure"),
  numberSpec("DFW", "DFW", DEFAULTS.DFW, 1, 300, 0.5, "mm", "closure"),
];

export function generateReverseTuckEnd(input: ReverseTuckEndParameters = {}): DielineGraph {
  const rawValues = normalizeReverseTuckEndParameters(input);
  const values = applyDimensionMode(rawValues);
  const { L, W, H, TFW, TFR, GFW, DFW } = values;
  const topBand = TFW + DFW;
  const bottomBand = TFW + DFW;
  const dustTop = TFW;
  const bodyTop = topBand;
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
    tuckFlap("top-tuck", col1, 0, L, topBand, TFW, TFR, "top", "Top tuck flap"),
    dustFlap("bottom-dust-left", col0, bodyBottom, W, DFW, "bottom", "Bottom dust flap (L)"),
    dustFlap("bottom-dust-right", col2, bodyBottom, W, DFW, "bottom", "Bottom dust flap (R)"),
    tuckFlap("bottom-tuck", col3, bodyBottom, L, bottomBand, TFW, TFR, "bottom", "Bottom tuck flap"),
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
    ...faces.map((face): GeometryPrimitive => ({
      id: `label-${face.id}`,
      layer: "label",
      type: "label",
      position: face.centroid,
      text: face.label,
    })),
  ];

  return {
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
      parameterValues: rawValues,
      parameters: parameterValuesToList(rawValues),
    }),
    source: { type: "template", templateId: "reverse-tuck-end" },
  };
}

export function normalizeReverseTuckEndParameters(input: ReverseTuckEndParameters = {}): Required<Omit<ReverseTuckEndParameters, "width" | "height" | "depth">> {
  const L = positive(input.L ?? input.width, DEFAULTS.L);
  const W = positive(input.W ?? input.depth, DEFAULTS.W);
  const H = positive(input.H ?? input.height, DEFAULTS.H);
  const TFW = positive(input.TFW, Math.min(DEFAULTS.TFW, W * 0.9));
  const DFW = positive(input.DFW, Math.min(DEFAULTS.DFW, W * 0.6));
  const TFR = clampNumber(input.TFR, 0, Math.min(L, W), Math.min(DEFAULTS.TFR, W * 0.25));
  const GFW = positive(input.GFW, DEFAULTS.GFW);

  return {
    L,
    W,
    H,
    TFW,
    TFR,
    GFW,
    DFW,
    outputSizeMode: input.outputSizeMode === "outer" ? "outer" : "inner",
    materialThickness: clampNumber(input.materialThickness, 0, 12, DEFAULTS.materialThickness),
    material: input.material || "E-flute paper",
    bleeds: input.bleeds ?? "none",
    pdfExport: input.pdfExport ?? true,
    dxfExport: input.dxfExport ?? true,
  };
}

function applyDimensionMode(values: ReturnType<typeof normalizeReverseTuckEndParameters>) {
  if (values.outputSizeMode !== "outer") {
    return values;
  }

  const inset = values.materialThickness * 2;
  return {
    ...values,
    L: Math.max(1, values.L - inset),
    W: Math.max(1, values.W - inset),
    H: Math.max(1, values.H - inset),
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
  const taper = Math.min(width * 0.12, height * 0.45);
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x: x + width, y: y + height },
        { x: x + width - taper, y },
        { x: x + taper * 0.35, y },
        { x: x + taper * 0.25, y: y + height * 0.82 },
      ]
    : [
        { x, y },
        { x: x + width, y },
        { x: x + width - taper, y: y + height },
        { x: x + taper * 0.35, y: y + height },
        { x: x + taper * 0.25, y: y + height * 0.18 },
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
  radius: number,
  direction: "top" | "bottom",
  label: string,
): DielineFace {
  const r = Math.min(radius, width * 0.2, lipHeight * 0.95);
  const innerY = direction === "top" ? y + lipHeight : y + height - lipHeight;
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x, y: innerY + r },
        ...sampleQuarterArc({ x: x + r, y: innerY + r }, r, Math.PI, Math.PI * 1.5),
        { x: x + width - r, y },
        ...sampleQuarterArc({ x: x + width - r, y: innerY + r }, r, Math.PI * 1.5, Math.PI * 2),
        { x: x + width, y: y + height },
      ]
    : [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: innerY - r },
        ...sampleQuarterArc({ x: x + width - r, y: innerY - r }, r, 0, Math.PI / 2),
        { x: x + r, y: y + height },
        ...sampleQuarterArc({ x: x + r, y: innerY - r }, r, Math.PI / 2, Math.PI),
        { x, y },
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
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}
