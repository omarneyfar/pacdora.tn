import { createDielineFace, createExteriorCutPaths } from "../geometry";
import { createDimensionParameters, createTemplateMetadata } from "../structure";
import type { DielineCrease, DielineFace, DielineFaceNode, DielineGraph, Point } from "../types";

type FoldingCartonDimensions = {
  width: number;
  height: number;
  depth: number;
};

const FOLDING_CARTON_TEMPLATE_ID = "folding-carton";
const RIGHT_ANGLE_FOLD = Math.PI / 2;

type FoldingCartonGraphFaceId = "front" | "back" | "left" | "right" | "top" | "bottom";

const FACE_LABELS: Record<FoldingCartonGraphFaceId, string> = {
  front: "Front",
  back: "Back",
  left: "Left",
  right: "Right",
  top: "Top",
  bottom: "Bottom"
};

export function generateFoldingCartonGraph(dimensions: FoldingCartonDimensions): DielineGraph {
  const { width, height, depth } = dimensions;

  const faces = [
    createRectFace("back", height, 0, width, height),
    createRectFace("left", 0, height, height, depth),
    createRectFace("top", height, height, width, depth),
    createRectFace("right", height + width, height, height, depth),
    createRectFace("front", height, height + depth, width, height),
    createRectFace("bottom", height + width + height, height, width, depth)
  ];

  const creases: DielineCrease[] = [
    createCrease("crease-back-top", "back", "top", { x: height, y: height }, { x: height + width, y: height }),
    createCrease("crease-left-top", "left", "top", { x: height, y: height }, { x: height, y: height + depth }),
    createCrease("crease-top-right", "top", "right", { x: height + width, y: height }, { x: height + width, y: height + depth }),
    createCrease("crease-top-front", "top", "front", { x: height, y: height + depth }, { x: height + width, y: height + depth }),
    createCrease(
      "crease-right-bottom",
      "right",
      "bottom",
      { x: height + width + height, y: height },
      { x: height + width + height, y: height + depth }
    )
  ];

  return {
    size: {
      width: height + width + height + width,
      height: height + depth + height
    },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree: getFoldingCartonFaceTree(),
    metadata: createTemplateMetadata({
      category: "folding-box",
      family: "folding-carton",
      familyLabel: "Folding Carton",
      parts: [
        {
          id: "body-panels",
          label: "Body panels",
          role: "body",
          faceIds: ["front", "back", "left", "right"],
          creaseIds: ["crease-left-top", "crease-top-right", "crease-top-front", "crease-back-top"],
        },
        {
          id: "top-panel",
          label: "Top panel",
          role: "top-closure",
          faceIds: ["top"],
          creaseIds: ["crease-back-top", "crease-left-top", "crease-top-right", "crease-top-front"],
        },
        {
          id: "bottom-panel",
          label: "Bottom panel",
          role: "bottom-closure",
          faceIds: ["bottom"],
          creaseIds: ["crease-right-bottom"],
        },
      ],
      parameters: createDimensionParameters(width, height, depth),
    }),
    source: {
      type: "template",
      templateId: FOLDING_CARTON_TEMPLATE_ID
    }
  };
}

function createRectFace(id: FoldingCartonGraphFaceId, x: number, y: number, width: number, height: number): DielineFace {
  return createDielineFace({
    id,
    label: FACE_LABELS[id],
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ],
    role: "panel",
    artworkEnabled: true
  });
}

function createCrease(
  id: string,
  faceA: FoldingCartonGraphFaceId,
  faceB: FoldingCartonGraphFaceId,
  edgeStart: Point,
  edgeEnd: Point,
  direction: 1 | -1 = 1
): DielineCrease {
  return {
    id,
    faceA,
    faceB,
    edgeStart,
    edgeEnd,
    foldAngle: RIGHT_ANGLE_FOLD,
    direction
  };
}

function getFoldingCartonFaceTree(): DielineFaceNode[] {
  return [
    {
      faceId: "top",
      creaseId: null,
      children: [
        {
          faceId: "back",
          creaseId: "crease-back-top",
          children: []
        },
        {
          faceId: "left",
          creaseId: "crease-left-top",
          children: []
        },
        {
          faceId: "right",
          creaseId: "crease-top-right",
          children: [
            {
              faceId: "bottom",
              creaseId: "crease-right-bottom",
              children: []
            }
          ]
        },
        {
          faceId: "front",
          creaseId: "crease-top-front",
          children: []
        }
      ]
    }
  ];
}
