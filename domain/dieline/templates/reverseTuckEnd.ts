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
  L: 70,
  W: 35,
  H: 100,
  TFW: 27.3,
  TFR: 5.6,
  GFW: 15,
  DFW: 17.5,
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
  const topBand = Math.max(TFW, DFW);
  const bottomBand = Math.max(TFW, DFW);
  const bodyTop = topBand;
  const bodyBottom = bodyTop + H;
  const col0 = 0;
  const col1 = GFW;
  const col2 = col1 + W;
  const col3 = col2 + L;
  const col4 = col3 + W;
  const col5 = col4 + L;

  const faces: DielineFace[] = [
    rect("front", col2, bodyTop, L, H, "panel", "Front"),
    rect("back", col4, bodyTop, L, H, "panel", "Back"),
    rect("left", col1, bodyTop, W, H, "panel", "Left"),
    rect("right", col3, bodyTop, W, H, "panel", "Right"),
    glueTab("glue-tab", col0, bodyTop, GFW, H),
    dustFlap("top-dust-left", col1, bodyTop - DFW, W, DFW, "top", "Top dust flap (L)"),
    dustFlap("top-dust-right", col3, bodyTop - DFW, W, DFW, "top", "Top dust flap (R)"),
    tuckFlap("top-tuck", col2, bodyTop - TFW, L, TFW, TFR, "top", "Top tuck flap"),
    dustFlap("top-panel", col4, bodyTop - DFW, L, DFW, "top", "Top panel"),
    dustFlap("bottom-dust-left", col1, bodyBottom, W, DFW, "bottom", "Bottom dust flap (L)"),
    dustFlap("bottom-dust-right", col3, bodyBottom, W, DFW, "bottom", "Bottom dust flap (R)"),
    tuckFlap("bottom-tuck", col4, bodyBottom, L, TFW, TFR, "bottom", "Bottom tuck flap"),
    dustFlap("bottom-panel", col2, bodyBottom, L, DFW, "bottom", "Bottom panel"),
  ];

  const creases: DielineCrease[] = [
    crease("cr-glue-left", "glue-tab", "left", { x: col1, y: bodyTop }, { x: col1, y: bodyBottom }),
    crease("cr-left-front", "left", "front", { x: col2, y: bodyTop }, { x: col2, y: bodyBottom }),
    crease("cr-front-right", "front", "right", { x: col3, y: bodyTop }, { x: col3, y: bodyBottom }),
    crease("cr-right-back", "right", "back", { x: col4, y: bodyTop }, { x: col4, y: bodyBottom }),
    crease("cr-left-topdust", "left", "top-dust-left", { x: col1, y: bodyTop }, { x: col2, y: bodyTop }),
    crease("cr-front-toptuck", "front", "top-tuck", { x: col2, y: bodyTop }, { x: col3, y: bodyTop }),
    crease("cr-right-topdust", "right", "top-dust-right", { x: col3, y: bodyTop }, { x: col4, y: bodyTop }),
    crease("cr-back-toppanel", "back", "top-panel", { x: col4, y: bodyTop }, { x: col5, y: bodyTop }),
    crease("cr-left-bottomdust", "left", "bottom-dust-left", { x: col1, y: bodyBottom }, { x: col2, y: bodyBottom }),
    crease("cr-front-bottompanel", "front", "bottom-panel", { x: col2, y: bodyBottom }, { x: col3, y: bodyBottom }),
    crease("cr-right-bottomdust", "right", "bottom-dust-right", { x: col3, y: bodyBottom }, { x: col4, y: bodyBottom }),
    crease("cr-back-bottomtuck", "back", "bottom-tuck", { x: col4, y: bodyBottom }, { x: col5, y: bodyBottom }),
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
          creaseIds: ["cr-left-front", "cr-front-right", "cr-right-back"],
        },
        {
          id: "top-closure",
          label: "Top closure",
          role: "top-closure",
          faceIds: ["top-tuck", "top-panel", "top-dust-left", "top-dust-right"],
          creaseIds: ["cr-front-toptuck", "cr-back-toppanel", "cr-left-topdust", "cr-right-topdust"],
        },
        {
          id: "bottom-closure",
          label: "Bottom closure",
          role: "bottom-closure",
          faceIds: ["bottom-tuck", "bottom-panel", "bottom-dust-left", "bottom-dust-right"],
          creaseIds: ["cr-back-bottomtuck", "cr-front-bottompanel", "cr-left-bottomdust", "cr-right-bottomdust"],
        },
        {
          id: "glue-tab",
          label: "Glue tab",
          role: "glue-flap",
          faceIds: ["glue-tab"],
          creaseIds: ["cr-glue-left"],
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
  const bevel = Math.min(width * 0.35, height * 0.08);
  return createDielineFace({
    id,
    label: "Glue tab",
    vertices: [
      { x: x + bevel, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x: x + bevel, y: y + height },
      { x, y: y + height - bevel },
      { x, y: y + bevel },
    ],
    role: "glue",
    artworkEnabled: false,
  });
}

function dustFlap(id: string, x: number, y: number, width: number, height: number, direction: "top" | "bottom", label: string): DielineFace {
  const taper = Math.min(width * 0.12, height * 0.5);
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x: x + width, y: y + height },
        { x: x + width - taper, y },
        { x: x + taper, y },
      ]
    : [
        { x, y },
        { x: x + width, y },
        { x: x + width - taper, y: y + height },
        { x: x + taper, y: y + height },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function tuckFlap(id: string, x: number, y: number, width: number, height: number, radius: number, direction: "top" | "bottom", label: string): DielineFace {
  const inset = Math.min(radius, width * 0.38, height * 0.7);
  const shoulder = Math.min(width * 0.08, height * 0.32);
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x: x + width, y: y + height },
        { x: x + width - shoulder, y: y + height * 0.38 },
        { x: x + width - inset, y },
        { x: x + inset, y },
        { x: x + shoulder, y: y + height * 0.38 },
      ]
    : [
        { x, y },
        { x: x + width, y },
        { x: x + width - shoulder, y: y + height * 0.62 },
        { x: x + width - inset, y: y + height },
        { x: x + inset, y: y + height },
        { x: x + shoulder, y: y + height * 0.62 },
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
            { faceId: "glue-tab", creaseId: "cr-glue-left", children: [] },
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
                { faceId: "top-panel", creaseId: "cr-back-toppanel", children: [] },
                { faceId: "bottom-tuck", creaseId: "cr-back-bottomtuck", children: [] },
              ],
            },
            { faceId: "top-dust-right", creaseId: "cr-right-topdust", children: [] },
            { faceId: "bottom-dust-right", creaseId: "cr-right-bottomdust", children: [] },
          ],
        },
        { faceId: "top-tuck", creaseId: "cr-front-toptuck", children: [] },
        { faceId: "bottom-panel", creaseId: "cr-front-bottompanel", children: [] },
      ],
    },
  ];
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
