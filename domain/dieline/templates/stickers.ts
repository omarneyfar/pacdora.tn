import { createDielineFace, pointsToPath } from "../geometry";
import { createFlatSizeParameters, createTemplateMetadata } from "../structure";
import type { DielineGraph, DielineParameter, Point } from "../types";

type StickerDimensions = {
  length: number;
  width: number;
};

type RoundedStickerDimensions = StickerDimensions & {
  cornerRadius?: number;
};

const STICKER_FACE_ID = "front";
const CURVE_SEGMENTS = 12;
const OVAL_SEGMENTS = 64;

export function generateRectangleSticker({ length, width }: StickerDimensions): DielineGraph {
  const vertices = [
    { x: 0, y: 0 },
    { x: length, y: 0 },
    { x: length, y: width },
    { x: 0, y: width },
  ];

  return createStickerGraph({
    family: "sticker-rectangle",
    familyLabel: "Rectangular Sticker/Label",
    parameters: createFlatSizeParameters(length, width),
    vertices,
  });
}

export function generateRoundedSticker({
  length,
  width,
  cornerRadius = Math.min(length, width) * 0.18,
}: RoundedStickerDimensions): DielineGraph {
  const radius = clamp(cornerRadius, 0.5, Math.min(length, width) / 2);
  const vertices = createRoundedRectanglePoints(length, width, radius);

  return createStickerGraph({
    family: "sticker-rounded",
    familyLabel: "Well-rounded Sticker/Label",
    parameters: [
      ...createFlatSizeParameters(length, width),
      { id: "corner-radius", label: "Corner radius", kind: "dimension", value: radius, unit: "mm" },
    ],
    vertices,
  });
}

export function generateOvalSticker({ length, width }: StickerDimensions): DielineGraph {
  const vertices = createOvalPoints(length, width);

  return createStickerGraph({
    family: "sticker-oval",
    familyLabel: "Oval Sticker",
    parameters: createFlatSizeParameters(length, width),
    vertices,
  });
}

function createStickerGraph({
  family,
  familyLabel,
  parameters,
  vertices,
}: {
  family: string;
  familyLabel: string;
  parameters: DielineParameter[];
  vertices: Point[];
}): DielineGraph {
  const face = createDielineFace({
    id: STICKER_FACE_ID,
    label: familyLabel,
    vertices,
    role: "panel",
    artworkEnabled: true,
  });

  return {
    size: {
      width: face.bounds.width,
      height: face.bounds.height,
    },
    faces: [face],
    creases: [],
    cutPaths: [
      {
        id: "cut-sticker-outline",
        d: pointsToPath(vertices),
        points: vertices,
      },
    ],
    faceTree: [{ faceId: STICKER_FACE_ID, creaseId: null, children: [] }],
    metadata: createTemplateMetadata({
      category: "sticker",
      family,
      familyLabel,
      parts: [
        {
          id: "sticker-face",
          label: "Sticker face",
          role: "panel",
          faceIds: [STICKER_FACE_ID],
        },
      ],
      parameters: [
        ...parameters,
        { id: "bleeds", label: "Bleeds", kind: "export", value: "No bleeds" },
        { id: "pdf-export", label: "PDF for dielines", kind: "export", value: true },
        { id: "dxf-export", label: "DXF for dielines", kind: "export", value: true },
      ],
    }),
    source: { type: "template", templateId: family },
  };
}

function createRoundedRectanglePoints(length: number, width: number, radius: number): Point[] {
  return [
    ...arcPoints(length - radius, radius, radius, -Math.PI / 2, 0),
    ...arcPoints(length - radius, width - radius, radius, 0, Math.PI / 2),
    ...arcPoints(radius, width - radius, radius, Math.PI / 2, Math.PI),
    ...arcPoints(radius, radius, radius, Math.PI, Math.PI * 1.5),
  ];
}

function createOvalPoints(length: number, width: number): Point[] {
  const centerX = length / 2;
  const centerY = width / 2;
  const radiusX = length / 2;
  const radiusY = width / 2;
  const points: Point[] = [];

  for (let index = 0; index < OVAL_SEGMENTS; index += 1) {
    const angle = (index / OVAL_SEGMENTS) * Math.PI * 2;
    points.push({
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
    });
  }

  return points;
}

function arcPoints(centerX: number, centerY: number, radius: number, start: number, end: number): Point[] {
  const points: Point[] = [];

  for (let index = 0; index <= CURVE_SEGMENTS; index += 1) {
    const angle = start + ((end - start) * index) / CURVE_SEGMENTS;
    points.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }

  return points;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
