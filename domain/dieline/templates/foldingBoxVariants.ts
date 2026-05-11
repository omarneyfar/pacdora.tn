import { createDielineFace, createExteriorCutPaths, getGraphBounds, pointsToPath } from "../geometry";
import { createTemplateMetadata } from "../structure";
import { generateReverseTuckEnd } from "./reverseTuckEnd";
import type {
  DielineCrease,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  DielineParameter,
  DielinePart,
  Point,
} from "../types";

export type FoldingBoxVariantDefinition = {
  id: string;
  label: string;
  fileName: string;
  description: string;
  length: number;
  width: number;
  height: number;
  top: "tuck-front" | "tuck-back" | "tab-closure" | "handle" | "hang-hole" | "hang-tab" | "centered-tuck" | "gusset" | "reversible";
  bottom: "tuck-front" | "tuck-back" | "snap-lock" | "auto-lock" | "crash-bottom" | "full-flap-auto" | "seal";
  parameters: string[];
  features?: Array<"handle" | "hang-hole" | "hang-tab" | "window" | "divider" | "partitions" | "insert" | "mount" | "tear-strip" | "skillet" | "full-flap">;
};

const GLUE_TAB_WIDTH = 15;
const RIGHT_ANGLE = Math.PI / 2;

export const CEFBOX_FOLDING_BOX_DEFINITIONS: FoldingBoxVariantDefinition[] = [
  {
    id: "reverse-tuck-end",
    label: "Reverse Tuck End Folding Carton Box",
    fileName: "reverse-tuck-end",
    description: "Tuck ends on both top and bottom.",
    length: 65,
    width: 44,
    height: 101,
    top: "tuck-front",
    bottom: "tuck-back",
    parameters: ["TFW", "TFR", "GFW", "DFW"],
  },
  {
    id: "straight-tuck-end",
    label: "Straight Tuck End Folding Carton Box",
    fileName: "straight-tuck-end",
    description: "Tuck ends on both top and bottom of the same side.",
    length: 70,
    width: 35,
    height: 100,
    top: "tuck-front",
    bottom: "tuck-front",
    parameters: ["GFW", "TFW", "TFR", "DFW"],
  },
  {
    id: "auto-lock-bottom",
    label: "Auto Lock Bottom Folding Carton Box",
    fileName: "auto-lock-bottom",
    description: "Tuck top with an automatically locking bottom.",
    length: 80,
    width: 45,
    height: 120,
    top: "tuck-front",
    bottom: "auto-lock",
    parameters: ["GFW", "TFW", "TFR", "DFW"],
  },
  {
    id: "snap-lock-bottom",
    label: "Snap Lock Bottom Folding Carton Box",
    fileName: "snap-lock-bottom",
    description: "Tuck top with a folded snap-lock bottom.",
    length: 80,
    width: 45,
    height: 120,
    top: "tuck-front",
    bottom: "snap-lock",
    parameters: ["GFW", "TFW", "TFR", "DFW"],
  },
  {
    id: "with-handle",
    label: "Carton Gift Box with a folded Handle",
    fileName: "with-handle",
    description: "Folding carton with a folded grip handle, auto-lock bottom, and catalog-lock top.",
    length: 120,
    width: 60,
    height: 160,
    top: "handle",
    bottom: "auto-lock",
    parameters: ["HL", "HW", "HT", "SD1", "SD2", "SR", "TD1", "TD2", "PR", "FW1", "FW2", "GFW", "OD"],
    features: ["handle"],
  },
  {
    id: "with-circular-hang-hole",
    label: "Folding carton box with a circular hang hole",
    fileName: "with-circular-hang-hole",
    description: "Retail folding carton with a circular hang hole.",
    length: 80,
    width: 35,
    height: 125,
    top: "hang-hole",
    bottom: "tuck-front",
    parameters: ["HL", "HW", "SR", "TFW", "TFR", "DFW", "OD", "GFW"],
    features: ["hang-hole"],
  },
  {
    id: "with-hang-tab",
    label: "Folding carton box with a circular hang hole",
    fileName: "with-hang-tab",
    description: "Retail folding carton with an extended hang tab.",
    length: 80,
    width: 35,
    height: 125,
    top: "hang-tab",
    bottom: "tuck-front",
    parameters: ["SL", "SW", "FR", "SAL", "TFW1", "TW", "OD1", "TFW2", "TFR", "DFW"],
    features: ["hang-tab"],
  },
  {
    id: "with-locking-tab-on-top-and-bottom",
    label: "Folding carton box with locking tab on top and bottom",
    fileName: "with-locking-tab-on-top-and-bottom",
    description: "Folding carton with locking tab closures on both ends.",
    length: 85,
    width: 40,
    height: 120,
    top: "tab-closure",
    bottom: "snap-lock",
    parameters: ["TL", "TR", "TD1", "TD2", "PR", "TFW", "TFR", "DFW"],
  },
  {
    id: "with-built-in-inserts",
    label: "Folding Box with built-in inserts",
    fileName: "with-built-in-inserts",
    description: "Folding carton with built-in insert flaps.",
    length: 90,
    width: 45,
    height: 120,
    top: "tuck-front",
    bottom: "tuck-back",
    parameters: ["D1", "D2", "D3", "D4", "D5", "D6", "TFW", "DFR", "DFW", "GFW"],
    features: ["insert"],
  },
  {
    id: "carton-with-integrated-partitions",
    label: "Customizable Folding Carton with Integrated Partitions Design Template, Dieline",
    fileName: "carton-with-integrated-partitions",
    description: "Folding carton with integrated six-compartment partitions.",
    length: 120,
    width: 60,
    height: 120,
    top: "tuck-front",
    bottom: "auto-lock",
    parameters: ["PD1", "PD2", "TFW1", "GFW", "TFR", "DFW"],
    features: ["partitions"],
  },
  {
    id: "carton-with-centered-divider",
    label: "Customizable Folding Cartion with Built-in Divider Design Template, Dieline",
    fileName: "carton-with-centered-divider",
    description: "Folding carton with a centered divider.",
    length: 110,
    width: 55,
    height: 120,
    top: "tab-closure",
    bottom: "auto-lock",
    parameters: ["OD1", "OD2", "TFW1", "GFW", "TFR", "DFW", "DL"],
    features: ["divider"],
  },
  {
    id: "carton-with-three-windows",
    label: "Customizable Snap Lock Bottom Folding Carton with Divider & Windows Deisgn Template, Dieline",
    fileName: "carton-with-three-windows",
    description: "Snap-lock folding carton with divider and three windows.",
    length: 120,
    width: 55,
    height: 130,
    top: "tab-closure",
    bottom: "snap-lock",
    parameters: ["TL", "SR", "TD1", "TD2", "PR", "TFW", "TFR", "GFW", "OD1", "OD2", "OD3", "OD4", "OD5", "DFW", "BWL", "BWH", "UWL", "UWH", "LWL", "LWH", "OD6", "OD7", "OD8", "OD9", "GD"],
    features: ["divider", "window"],
  },
  {
    id: "snap-lock-bottom-carton-with-tab-closure",
    label: "Customizable Snap Lock Bottom Folding Carton with Tab Closure Design Template, Dieline",
    fileName: "snap-lock-bottom-carton-with-tab-closure",
    description: "Snap-lock bottom folding carton with tab closure.",
    length: 95,
    width: 45,
    height: 125,
    top: "tab-closure",
    bottom: "snap-lock",
    parameters: ["TL", "SR", "TD1", "TD2", "PR", "TFW", "TFR", "GFW", "DFW"],
  },
  {
    id: "auto-lock-bottom-carton-with-tab-closure",
    label: "Customizable Auto-lock Bottom Folding Carton with Tab Closure Design Tempplate, Dieline",
    fileName: "auto-lock-bottom-carton-with-tab-closure",
    description: "Auto-lock bottom folding carton with tab closure.",
    length: 95,
    width: 45,
    height: 125,
    top: "tab-closure",
    bottom: "auto-lock",
    parameters: ["TL", "SR", "TD1", "TD2", "PR", "TFW", "TFR", "GFW", "DFW"],
  },
  {
    id: "snap-lock-bottom-carton-with-divider",
    label: "Customizable Snap-lock Bottom Folding Carton with Divider Design Template, Dieline",
    fileName: "snap-lock-bottom-carton-with-divider",
    description: "Snap-lock bottom folding carton with integrated centered divider.",
    length: 105,
    width: 50,
    height: 125,
    top: "tab-closure",
    bottom: "snap-lock",
    parameters: ["TL", "SR", "TD1", "TD2", "PR", "TFW", "TFR", "GFW", "OD1", "OD2", "OD3", "OD4", "OD5", "DFW"],
    features: ["divider"],
  },
  {
    id: "snap-lock-carton-with-arc-handler",
    label: "Customizable Snap-lock Carton with Arc Handler Dieline, Design Template",
    fileName: "snap-lock-carton-with-arc-handler",
    description: "Snap-lock folding carton with an arc handle.",
    length: 120,
    width: 60,
    height: 130,
    top: "handle",
    bottom: "snap-lock",
    parameters: ["HT", "HR", "SR", "TFW", "TFR", "GFW"],
    features: ["handle"],
  },
  {
    id: "centered-tuck-end-carton",
    label: "Fully Customizable Tuck End Folding Carton Dieline, Template",
    fileName: "centered-tuck-end-carton",
    description: "Centered tuck-end carton with angled side gable.",
    length: 95,
    width: 45,
    height: 125,
    top: "centered-tuck",
    bottom: "snap-lock",
    parameters: ["D1", "TFW1", "D2", "TFR", "TFW2", "GFW"],
    features: ["skillet"],
  },
  {
    id: "gusset-roof-carton-with-tear-strip",
    label: "Customizable gusset roof folding carton with tear strip dielines, template",
    fileName: "gusset-roof-carton-with-tear-strip",
    description: "Gusset roof folding carton with embedded tear strip.",
    length: 100,
    width: 55,
    height: 140,
    top: "gusset",
    bottom: "seal",
    parameters: ["BFW", "TFW", "OD", "GFW"],
    features: ["tear-strip"],
  },
  {
    id: "snap-lock-bottom-carton-with-mount",
    label: "Customizable snap-lock folding carton with mount dieline, template",
    fileName: "snap-lock-bottom-carton-with-mount",
    description: "Snap-lock folding carton with built-in product mount.",
    length: 110,
    width: 55,
    height: 120,
    top: "tab-closure",
    bottom: "snap-lock",
    parameters: ["D1", "D2", "SR", "TL", "TR", "TD1", "TD2", "PR", "TFW", "TFR", "GFW"],
    features: ["mount"],
  },
  {
    id: "tuck-end-folding-carton",
    label: "Cusomizable tuck end folding carton dieline, design template",
    fileName: "tuck-end-folding-carton",
    description: "Tuck-end cover with snap-lock bottom.",
    length: 90,
    width: 45,
    height: 120,
    top: "tuck-front",
    bottom: "snap-lock",
    parameters: ["SL", "TFW", "GFW", "FW"],
  },
  {
    id: "reversible-lid-skillet-carton",
    label: "Customizable skillet box with reversible lid dieline, design template",
    fileName: "reversible-lid-skillet-carton",
    description: "Skillet-end carton with reversible top cover.",
    length: 100,
    width: 45,
    height: 115,
    top: "reversible",
    bottom: "snap-lock",
    parameters: ["DFW", "OD1", "OD2", "OD3", "OD4", "SL1", "SL2", "SW2", "SR2", "EA1", "EA2"],
    features: ["skillet"],
  },
  {
    id: "reversible-lid-folding-carton",
    label: "Customizable crash bottom folding carton with reversible top cover dieline, design template",
    fileName: "reversible-lid-folding-carton",
    description: "Crash bottom carton with reversible top cover.",
    length: 105,
    width: 50,
    height: 120,
    top: "reversible",
    bottom: "crash-bottom",
    parameters: ["DFW", "OD1", "OD2", "OD3", "OD4", "SL1", "SL2", "SW2", "SR", "EA1", "EA2"],
    features: ["skillet"],
  },
  {
    id: "gusset-cover-crash-bottom-carton",
    label: "Customizable folding carton with gusset cover and crash bottom dieline, design template",
    fileName: "gusset-cover-crash-bottom-carton",
    description: "Gusset tuck cover with crash bottom.",
    length: 100,
    width: 50,
    height: 130,
    top: "gusset",
    bottom: "crash-bottom",
    parameters: ["TFW", "FW", "GFW", "FR"],
  },
  {
    id: "auto-lock-bottom-with-full-flap",
    label: "Auto Lock Bottom Folding Box with Full-Flap Bottom Panel",
    fileName: "auto-lock-bottom-with-full-flap",
    description: "Auto-lock bottom with an extended full-flap bottom panel.",
    length: 90,
    width: 45,
    height: 120,
    top: "tuck-front",
    bottom: "full-flap-auto",
    parameters: ["TFW", "TFR", "GFW", "DFW"],
    features: ["full-flap"],
  },
  {
    id: "with-circular-hang-hole-and-window",
    label: "With hang hole and window",
    fileName: "with-circular-hang-hole-and-window",
    description: "Folding carton with circular hang hole and display window.",
    length: 85,
    width: 40,
    height: 130,
    top: "hang-hole",
    bottom: "tuck-front",
    parameters: ["HW", "HL", "DR", "WL", "WH", "WR", "TFW", "TFR", "DFW", "OD", "GFW"],
    features: ["hang-hole", "window"],
  },
  {
    id: "with-handle-and-window",
    label: "Folding Box with handle and window",
    fileName: "with-handle-and-window",
    description: "Folding carton with handle and clear window.",
    length: 120,
    width: 60,
    height: 160,
    top: "handle",
    bottom: "auto-lock",
    parameters: ["HL", "HW", "HT", "SD1", "SD2", "SR", "TD1", "TD2", "PR", "FW1", "FW2", "GFW", "OD", "WL", "WH", "WR"],
    features: ["handle", "window"],
  },
  {
    id: "separated-skillet-box",
    label: "Separated skillet box",
    fileName: "separated-skillet-box",
    description: "Two-piece skillet box with reversible top and insert.",
    length: 100,
    width: 45,
    height: 115,
    top: "reversible",
    bottom: "snap-lock",
    parameters: ["FL", "BL", "TFW", "GD", "OD", "SR", "SL", "SW1", "SW2"],
    features: ["skillet", "insert"],
  },
  {
    id: "crash-bottom-carton-with-tear-strip",
    label: "Auto Lock Bottom Box with Tearable Strip Seal",
    fileName: "crash-bottom-carton-with-tear-strip",
    description: "Auto-lock bottom box with tearable strip seal.",
    length: 95,
    width: 45,
    height: 130,
    top: "tab-closure",
    bottom: "crash-bottom",
    parameters: ["GFW", "DFW", "OD1", "OD2", "EXD", "R1", "R2", "R3", "GFA"],
    features: ["tear-strip"],
  },
  {
    id: "snap-lock-bottom-with-tear-strip",
    label: "Snap Lock Bottom Folding Box with Tearable Strip Seal",
    fileName: "snap-lock-bottom-with-tear-strip",
    description: "Snap-lock bottom folding box with tearable strip seal.",
    length: 95,
    width: 45,
    height: 130,
    top: "tab-closure",
    bottom: "snap-lock",
    parameters: ["GFW", "DFW", "OD1", "OD2", "EXD", "R1", "R2", "R3", "GFA"],
    features: ["tear-strip"],
  },
];

export function generateCefBoxFoldingBoxGraph(definition: FoldingBoxVariantDefinition): DielineGraph {
  if (definition.id === "reverse-tuck-end") {
    return generateReverseTuckEnd({
      L: definition.length,
      W: definition.width,
      H: definition.height,
    });
  }

  const L = definition.length;
  const W = definition.width;
  const H = definition.height;
  const glueW = getParameterValue(definition, "GFW", GLUE_TAB_WIDTH);
  const topH = getTopBandHeight(definition, W);
  const topExtraH = getTopExtraHeight(definition, W);
  const bottomH = getBottomBandHeight(definition, W);
  const bodyTop = topExtraH + topH;
  const bodyBottom = bodyTop + H;
  const col0 = 0;
  const col1 = glueW;
  const col2 = col1 + W;
  const col3 = col2 + L;
  const col4 = col3 + W;
  const col5 = col4 + L;
  const faces: DielineFace[] = [];
  const creases: DielineCrease[] = [];
  const cutPaths: DielineGraph["cutPaths"] = [];
  const childrenByParent = new Map<string, DielineFaceNode[]>();
  const topFaces: string[] = [];
  const topCreases: string[] = [];
  const bottomFaces: string[] = [];
  const bottomCreases: string[] = [];
  const featureParts: DielinePart[] = [];

  const addFace = (face: DielineFace) => {
    faces.push(face);
    return face;
  };
  const addCrease = (
    id: string,
    parentFaceId: string,
    childFaceId: string,
    edgeStart: Point,
    edgeEnd: Point,
  ) => {
    creases.push({
      id,
      faceA: parentFaceId,
      faceB: childFaceId,
      edgeStart,
      edgeEnd,
      foldAngle: RIGHT_ANGLE,
      direction: 1,
    });
    addChild(parentFaceId, { faceId: childFaceId, creaseId: id, children: [] });
    return id;
  };

  addFace(rect("glue-tab", col0, bodyTop, glueW, H, "glue", "Glue tab"));
  addFace(rect("left", col1, bodyTop, W, H, "panel", "Left"));
  addFace(rect("front", col2, bodyTop, L, H, "panel", "Front"));
  addFace(rect("right", col3, bodyTop, W, H, "panel", "Right"));
  addFace(rect("back", col4, bodyTop, L, H, "panel", "Back"));

  const bodyCreases = [
    addCrease("cr-glue-left", "left", "glue-tab", { x: col1, y: bodyTop }, { x: col1, y: bodyBottom }),
    addCrease("cr-left-front", "front", "left", { x: col2, y: bodyTop }, { x: col2, y: bodyBottom }),
    addCrease("cr-front-right", "front", "right", { x: col3, y: bodyTop }, { x: col3, y: bodyBottom }),
    addCrease("cr-right-back", "right", "back", { x: col4, y: bodyTop }, { x: col4, y: bodyBottom }),
  ];

  addTopClosure();
  addBottomClosure();
  addFeatureFaces();
  addFeatureCutPaths();

  const graphBounds = getGraphBounds({ faces });
  const graph: DielineGraph = {
    size: {
      width: graphBounds.x + graphBounds.width,
      height: graphBounds.y + graphBounds.height,
    },
    faces,
    creases,
    cutPaths: [...createExteriorCutPaths(faces), ...cutPaths],
    faceTree: [buildTree("front", null)],
    metadata: createTemplateMetadata({
      category: "folding-box",
      family: definition.id,
      familyLabel: definition.label,
      parts: [
        {
          id: "body-panels",
          label: "Body panels",
          role: "body",
          faceIds: ["front", "back", "left", "right"],
          creaseIds: bodyCreases,
        },
        ...(topFaces.length
          ? [{
              id: "top-closure",
              label: "Top closure",
              role: "top-closure" as const,
              faceIds: topFaces,
              creaseIds: topCreases,
            }]
          : []),
        ...(bottomFaces.length
          ? [{
              id: "bottom-closure",
              label: "Bottom closure",
              role: "bottom-closure" as const,
              faceIds: bottomFaces,
              creaseIds: bottomCreases,
            }]
          : []),
        {
          id: "glue-tab",
          label: "Glue tab",
          role: "glue-flap",
          faceIds: ["glue-tab"],
          creaseIds: ["cr-glue-left"],
        },
        ...featureParts,
      ],
      parameters: createFoldingBoxParameters(definition),
    }),
    source: { type: "template", templateId: definition.id },
  };

  return graph;

  function addTopClosure() {
    const y = bodyTop - topH;
    const extraY = y - topExtraH;
    const dustH = Math.min(topH, getParameterValue(definition, "DFW", W * 0.5));
    const tuckH = Math.min(topH, getParameterValue(definition, "TFW", W * 0.78));
    const sideTaper = 0.14;

    addConnectedFace("left", rect("top-dust-left", col1, bodyTop - dustH, W, dustH, "flap", "Top dust flap (L)"), "cr-left-topdust", { x: col1, y: bodyTop }, { x: col2, y: bodyTop }, topFaces, topCreases);
    addConnectedFace("right", rect("top-dust-right", col3, bodyTop - dustH, W, dustH, "flap", "Top dust flap (R)"), "cr-right-topdust", { x: col3, y: bodyTop }, { x: col4, y: bodyTop }, topFaces, topCreases);

    if (definition.top === "tuck-back") {
      addConnectedFace("back", trapezoid("top-tuck", col4, bodyTop - tuckH, L, tuckH, sideTaper, "top", "flap", "Top tuck flap"), "cr-back-toptuck", { x: col4, y: bodyTop }, { x: col5, y: bodyTop }, topFaces, topCreases);
      addConnectedFace("front", rect("top-panel", col2, y, L, topH, "flap", "Top panel"), "cr-front-toppanel", { x: col2, y: bodyTop }, { x: col3, y: bodyTop }, topFaces, topCreases);
      return;
    }

    if (definition.top === "tab-closure" || definition.top === "handle" || definition.top === "hang-hole" || definition.top === "hang-tab" || definition.top === "centered-tuck" || definition.top === "gusset" || definition.top === "reversible") {
      addConnectedFace("back", rect("top-panel", col4, y, L, topH, "flap", "Top panel"), "cr-back-toppanel", { x: col4, y: bodyTop }, { x: col5, y: bodyTop }, topFaces, topCreases);
      const label = getTopExtensionLabel(definition.top);
      const tabId = definition.top === "handle" ? "top-handle" : definition.top === "hang-hole" || definition.top === "hang-tab" ? "top-hanger" : "top-lock-tab";
      const tabFace = definition.top === "handle" || definition.top === "gusset" || definition.top === "reversible"
        ? arcTopFace(tabId, col4, extraY, L, topExtraH, "flap", label)
        : trapezoid(tabId, col4, extraY, L, topExtraH, 0.18, "top", "flap", label);
      addConnectedFace("top-panel", tabFace, `cr-top-panel-${tabId}`, { x: col4, y }, { x: col5, y }, topFaces, topCreases);
      return;
    }

    addConnectedFace("front", trapezoid("top-tuck", col2, bodyTop - tuckH, L, tuckH, sideTaper, "top", "flap", "Top tuck flap"), "cr-front-toptuck", { x: col2, y: bodyTop }, { x: col3, y: bodyTop }, topFaces, topCreases);
    addConnectedFace("back", rect("top-panel", col4, y, L, topH, "flap", "Top panel"), "cr-back-toppanel", { x: col4, y: bodyTop }, { x: col5, y: bodyTop }, topFaces, topCreases);
  }

  function addBottomClosure() {
    const y = bodyBottom;
    const flapH = bottomH;
    const longFlapH = definition.bottom === "full-flap-auto" ? Math.max(flapH, W) : flapH;
    const bottomKindLabel = getBottomLabel(definition.bottom);

    if (definition.bottom === "tuck-back") {
      addConnectedFace("back", trapezoid("bottom-tuck", col4, y, L, flapH, 0.14, "bottom", "flap", "Bottom tuck flap"), "cr-back-bottomtuck", { x: col4, y }, { x: col5, y }, bottomFaces, bottomCreases);
      addConnectedFace("front", rect("bottom-panel", col2, y, L, flapH, "flap", "Bottom panel"), "cr-front-bottompanel", { x: col2, y }, { x: col3, y }, bottomFaces, bottomCreases);
    } else {
      const frontFace = definition.bottom === "tuck-front"
        ? trapezoid("bottom-tuck", col2, y, L, flapH, 0.14, "bottom", "flap", "Bottom tuck flap")
        : rect("bottom-front", col2, y, L, longFlapH, "flap", `${bottomKindLabel} (front)`);
      addConnectedFace("front", frontFace, "cr-front-bottom", { x: col2, y }, { x: col3, y }, bottomFaces, bottomCreases);
      addConnectedFace("back", rect("bottom-back", col4, y, L, flapH, "flap", `${bottomKindLabel} (back)`), "cr-back-bottom", { x: col4, y }, { x: col5, y }, bottomFaces, bottomCreases);
    }

    addConnectedFace("left", rect("bottom-left", col1, y, W, flapH, "flap", `${bottomKindLabel} (L)`), "cr-left-bottom", { x: col1, y }, { x: col2, y }, bottomFaces, bottomCreases);
    addConnectedFace("right", rect("bottom-right", col3, y, W, flapH, "flap", `${bottomKindLabel} (R)`), "cr-right-bottom", { x: col3, y }, { x: col4, y }, bottomFaces, bottomCreases);
  }

  function addFeatureFaces() {
    if (definition.features?.includes("divider")) {
      const divider = rect("center-divider", col5, bodyTop, W, H, "flap", "Centered divider");
      addConnectedFace("back", divider, "cr-back-divider", { x: col5, y: bodyTop }, { x: col5, y: bodyBottom });
      featureParts.push({ id: "center-divider", label: "Centered divider", role: "divider", faceIds: ["center-divider"], creaseIds: ["cr-back-divider"] });
    }

    if (definition.features?.includes("partitions")) {
      const partitionA = rect("partition-a", col5, bodyTop, W * 0.82, H, "flap", "Integrated partition A");
      const partitionB = rect("partition-b", col5 + W * 0.82, bodyTop, W * 0.82, H, "flap", "Integrated partition B");
      addConnectedFace("back", partitionA, "cr-back-partition-a", { x: col5, y: bodyTop }, { x: col5, y: bodyBottom });
      addConnectedFace("partition-a", partitionB, "cr-partition-a-b", { x: col5 + W * 0.82, y: bodyTop }, { x: col5 + W * 0.82, y: bodyBottom });
      featureParts.push({ id: "integrated-partitions", label: "Integrated partitions", role: "divider", faceIds: ["partition-a", "partition-b"], creaseIds: ["cr-back-partition-a", "cr-partition-a-b"] });
    }

    if (definition.features?.includes("insert")) {
      const insertH = Math.max(W * 0.32, 10);
      const insertTop = rect("insert-top", col2 + L * 0.12, bodyTop - insertH, L * 0.76, insertH, "flap", "Built-in insert top");
      addConnectedFace("front", insertTop, "cr-front-insert", { x: col2 + L * 0.12, y: bodyTop }, { x: col2 + L * 0.88, y: bodyTop });
      featureParts.push({ id: "built-in-inserts", label: "Built-in inserts", role: "insert", faceIds: ["insert-top"], creaseIds: ["cr-front-insert"] });
    }

    if (definition.features?.includes("mount")) {
      const mount = rect("product-mount", col5, bodyTop + H * 0.12, W * 0.9, H * 0.76, "flap", "Product mount");
      addConnectedFace("back", mount, "cr-back-mount", { x: col5, y: bodyTop + H * 0.12 }, { x: col5, y: bodyTop + H * 0.88 });
      featureParts.push({ id: "product-mount", label: "Product mount", role: "insert", faceIds: ["product-mount"], creaseIds: ["cr-back-mount"] });
    }

    if (definition.features?.includes("handle") && faces.some((face) => face.id === "top-handle")) {
      featureParts.push({ id: "handle", label: "Handle", role: "handle", faceIds: ["top-handle"] });
    }
  }

  function addFeatureCutPaths() {
    if (definition.features?.includes("hang-hole")) {
      cutPaths.push(createCircleCutPath("cut-hang-hole", col4 + L / 2, Math.max(topExtraH * 0.45, 8), Math.max(4, Math.min(L, W) * 0.11)));
      featureParts.push({ id: "hang-hole", label: "Hang hole", role: "handle", faceIds: ["top-hanger"] });
    }

    if (definition.features?.includes("hang-tab")) {
      cutPaths.push(createRoundedSlotCutPath("cut-hang-slot", col4 + L / 2, Math.max(topExtraH * 0.45, 8), Math.max(16, L * 0.34), Math.max(5, W * 0.16)));
      featureParts.push({ id: "hang-tab", label: "Hang tab", role: "handle", faceIds: ["top-hanger"] });
    }

    if (definition.features?.includes("window")) {
      cutPaths.push(createRectCutPath("cut-front-window", col2 + L * 0.24, bodyTop + H * 0.2, L * 0.52, H * 0.46));
      featureParts.push({ id: "display-window", label: "Display window", role: "window", faceIds: ["front"] });
    }

    if (definition.features?.includes("tear-strip")) {
      cutPaths.push(createTearStripCutPath("cut-tear-strip", col2 + L * 0.08, bodyTop + H * 0.12, L * 0.84, Math.max(5, W * 0.12)));
      featureParts.push({ id: "tear-strip", label: "Tear strip", role: "tear-strip", faceIds: ["front"] });
    }
  }

  function addConnectedFace(
    parentFaceId: string,
    face: DielineFace,
    creaseId: string,
    edgeStart: Point,
    edgeEnd: Point,
    partFaceIds?: string[],
    partCreaseIds?: string[],
  ) {
    addFace(face);
    addCrease(creaseId, parentFaceId, face.id, edgeStart, edgeEnd);
    partFaceIds?.push(face.id);
    partCreaseIds?.push(creaseId);
  }

  function addChild(parentId: string, child: DielineFaceNode) {
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), child]);
  }

  function buildTree(faceId: string, creaseId: string | null): DielineFaceNode {
    return {
      faceId,
      creaseId,
      children: (childrenByParent.get(faceId) ?? []).map((child) => buildTree(child.faceId, child.creaseId)),
    };
  }
}

function createFoldingBoxParameters(definition: FoldingBoxVariantDefinition): DielineParameter[] {
  return [
    { id: "L", label: "Length(L)", kind: "dimension", value: definition.length, unit: "mm" },
    { id: "W", label: "Width(W)", kind: "dimension", value: definition.width, unit: "mm" },
    { id: "H", label: "Height(H)", kind: "dimension", value: definition.height, unit: "mm" },
    { id: "output-size-mode", label: "Output Size Mode", kind: "export", value: "Inner dimensions" },
    { id: "material-thickness", label: "Material Thickness", kind: "material", value: 1.5, unit: "mm" },
    { id: "material", label: "Material", kind: "material", value: "E-flute paper" },
    { id: "bleeds", label: "Bleeds", kind: "export", value: "No bleeds" },
    { id: "pdf-export", label: "PDF for Dielines", kind: "export", value: true },
    { id: "dxf-export", label: "DXF for Dielines", kind: "export", value: true },
    ...definition.parameters.map((code) => ({
      id: code,
      label: code,
      kind: getParameterKind(code),
      value: getParameterValue(definition, code),
      unit: code.startsWith("EA") || code === "GFA" ? "deg" : "mm",
    })),
  ];
}

function getParameterKind(code: string): DielineParameter["kind"] {
  if (code.startsWith("EA") || code === "GFA") return "other";
  if (code.includes("L") || code.includes("W") || code.includes("H") || code.includes("D") || code.includes("R")) return "dimension";
  return "closure";
}

function getParameterValue(definition: FoldingBoxVariantDefinition, code: string, fallback?: number): number {
  const W = definition.width;
  const L = definition.length;
  const H = definition.height;
  const values: Record<string, number> = {
    GFW: GLUE_TAB_WIDTH,
    TFW: W * 0.78,
    TFW1: W * 0.66,
    TFW2: W * 0.72,
    TFR: W * 0.16,
    DFW: W * 0.5,
    DFR: W * 0.15,
    FW: W * 0.55,
    FW1: W * 0.5,
    FW2: W * 0.62,
    BFW: W * 0.64,
    HL: L * 0.46,
    HW: W * 0.5,
    HT: W * 0.35,
    HR: W * 0.35,
    TL: Math.min(L * 0.42, W * 1.1),
    TR: W * 0.14,
    TD1: W * 0.3,
    TD2: W * 0.42,
    PR: W * 0.12,
    SR: W * 0.12,
    SR2: W * 0.12,
    SAL: L * 0.5,
    SL: L * 0.32,
    SL1: L * 0.28,
    SL2: L * 0.32,
    SW: W * 0.18,
    SW1: W * 0.22,
    SW2: W * 0.24,
    TW: W * 0.28,
    FR: W * 0.16,
    OD: W * 0.2,
    OD1: W * 0.16,
    OD2: W * 0.22,
    OD3: W * 0.28,
    OD4: W * 0.34,
    OD5: W * 0.4,
    OD6: W * 0.18,
    OD7: W * 0.24,
    OD8: W * 0.3,
    OD9: W * 0.36,
    D1: W * 0.24,
    D2: W * 0.32,
    D3: W * 0.4,
    D4: W * 0.48,
    D5: W * 0.56,
    D6: W * 0.64,
    PD1: L * 0.32,
    PD2: W * 0.55,
    DL: H * 0.82,
    BWL: L * 0.5,
    BWH: H * 0.22,
    UWL: L * 0.42,
    UWH: H * 0.2,
    LWL: L * 0.42,
    LWH: H * 0.2,
    GD: W * 0.18,
    DR: W * 0.12,
    WL: L * 0.5,
    WH: H * 0.42,
    WR: W * 0.12,
    FL: L * 0.44,
    BL: L * 0.44,
    EXD: W * 0.22,
    R1: W * 0.08,
    R2: W * 0.12,
    R3: W * 0.16,
    EA1: 35,
    EA2: 35,
    GFA: 35,
  };

  return roundMetric(values[code] ?? fallback ?? W * 0.5);
}

function getTopBandHeight(definition: FoldingBoxVariantDefinition, depth: number): number {
  if (definition.top === "gusset" || definition.top === "reversible" || definition.top === "handle") return depth * 0.92;
  if (definition.top === "tab-closure" || definition.top === "hang-hole" || definition.top === "hang-tab" || definition.top === "centered-tuck") return depth * 0.76;
  return depth * 0.78;
}

function getTopExtraHeight(definition: FoldingBoxVariantDefinition, depth: number): number {
  if (definition.top === "handle") return depth * 0.82;
  if (definition.top === "hang-hole" || definition.top === "hang-tab") return depth * 0.72;
  if (definition.top === "tab-closure" || definition.top === "centered-tuck") return depth * 0.42;
  if (definition.top === "gusset" || definition.top === "reversible") return depth * 0.5;
  return 0;
}

function getBottomBandHeight(definition: FoldingBoxVariantDefinition, depth: number): number {
  if (definition.bottom === "full-flap-auto") return depth;
  if (definition.bottom === "auto-lock" || definition.bottom === "snap-lock" || definition.bottom === "crash-bottom") return depth * 0.66;
  if (definition.bottom === "seal") return depth * 0.55;
  return depth * 0.78;
}

function getTopExtensionLabel(top: FoldingBoxVariantDefinition["top"]): string {
  if (top === "handle") return "Folded handle";
  if (top === "hang-hole") return "Hang hole panel";
  if (top === "hang-tab") return "Hang tab";
  if (top === "gusset") return "Gusset roof";
  if (top === "reversible") return "Reversible cover";
  return "Locking tab";
}

function getBottomLabel(bottom: FoldingBoxVariantDefinition["bottom"]): string {
  if (bottom === "auto-lock" || bottom === "crash-bottom" || bottom === "full-flap-auto") return "Auto-lock bottom";
  if (bottom === "snap-lock") return "Snap-lock bottom";
  if (bottom === "seal") return "Seal flap";
  return "Bottom flap";
}

function rect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  role: DielineFace["role"],
  label: string,
): DielineFace {
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

function trapezoid(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  taper: number,
  direction: "top" | "bottom",
  role: DielineFace["role"],
  label: string,
): DielineFace {
  const inset = width * taper / 2;
  const vertices = direction === "top"
    ? [
        { x, y: y + height },
        { x: x + width, y: y + height },
        { x: x + width - inset, y },
        { x: x + inset, y },
      ]
    : [
        { x, y },
        { x: x + width, y },
        { x: x + width - inset, y: y + height },
        { x: x + inset, y: y + height },
      ];

  return createDielineFace({ id, label, vertices, role, artworkEnabled: false });
}

function arcTopFace(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  role: DielineFace["role"],
  label: string,
): DielineFace {
  const arch = Math.max(4, height * 0.34);
  return createDielineFace({
    id,
    label,
    vertices: [
      { x, y: y + height },
      { x: x + width, y: y + height },
      { x: x + width * 0.86, y: y + arch },
      { x: x + width * 0.7, y },
      { x: x + width * 0.3, y },
      { x: x + width * 0.14, y: y + arch },
    ],
    role,
    artworkEnabled: false,
  });
}

function createCircleCutPath(id: string, cx: number, cy: number, radius: number) {
  const points = Array.from({ length: 32 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  return { id, d: pointsToPath(points), points };
}

function createRoundedSlotCutPath(id: string, cx: number, cy: number, width: number, height: number) {
  return createRectCutPath(id, cx - width / 2, cy - height / 2, width, height);
}

function createRectCutPath(id: string, x: number, y: number, width: number, height: number) {
  const points = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  return { id, d: pointsToPath(points), points };
}

function createTearStripCutPath(id: string, x: number, y: number, width: number, height: number) {
  const points = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  return { id, d: pointsToPath(points), points };
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}
