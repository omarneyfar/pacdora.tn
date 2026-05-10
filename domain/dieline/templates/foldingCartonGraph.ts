import { createDielineFace, createExteriorCutPaths } from "../geometry";
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
