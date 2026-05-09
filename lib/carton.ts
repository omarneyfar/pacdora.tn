feat: initialize project with Next.js, TypeScript, and Playwright for visual verification

export type FaceKey = (typeof FACE_KEYS)[number];

export type CartonDimensions = {
  width: number;
  height: number;
  depth: number;
};

export type Project = {
  id: string;
  dimensions: CartonDimensions;
  faces: Partial<Record<FaceKey, string>>;
  createdAt: string;
};

export type FaceSpec = {
  key: FaceKey;
  label: string;
  width: number;
  height: number;
  x: number;
  y: number;
};

export const CARTON_DIMENSIONS: CartonDimensions = {
  width: 100,
  height: 160,
  depth: 60
};

export const DIELINE_SIZE = {
  width: CARTON_DIMENSIONS.depth + CARTON_DIMENSIONS.width + CARTON_DIMENSIONS.depth + CARTON_DIMENSIONS.width,
  height: CARTON_DIMENSIONS.depth + CARTON_DIMENSIONS.height + CARTON_DIMENSIONS.depth
};

export const FACE_SPECS: Record<FaceKey, FaceSpec> = {
  top: {
    key: "top",
    label: "Top",
    width: CARTON_DIMENSIONS.width,
    height: CARTON_DIMENSIONS.depth,
    x: CARTON_DIMENSIONS.depth,
    y: 0
  },
  left: {
    key: "left",
    label: "Left",
    width: CARTON_DIMENSIONS.depth,
    height: CARTON_DIMENSIONS.height,
    x: 0,
    y: CARTON_DIMENSIONS.depth
  },
  front: {
    key: "front",
    label: "Front",
    width: CARTON_DIMENSIONS.width,
    height: CARTON_DIMENSIONS.height,
    x: CARTON_DIMENSIONS.depth,
    y: CARTON_DIMENSIONS.depth
  },
  right: {
    key: "right",
    label: "Right",
    width: CARTON_DIMENSIONS.depth,
    height: CARTON_DIMENSIONS.height,
    x: CARTON_DIMENSIONS.depth + CARTON_DIMENSIONS.width,
    y: CARTON_DIMENSIONS.depth
  },
  back: {
    key: "back",
    label: "Back",
    width: CARTON_DIMENSIONS.width,
    height: CARTON_DIMENSIONS.height,
    x: CARTON_DIMENSIONS.depth + CARTON_DIMENSIONS.width + CARTON_DIMENSIONS.depth,
    y: CARTON_DIMENSIONS.depth
  },
  bottom: {
    key: "bottom",
    label: "Bottom",
    width: CARTON_DIMENSIONS.width,
    height: CARTON_DIMENSIONS.depth,
    x: CARTON_DIMENSIONS.depth,
    y: CARTON_DIMENSIONS.depth + CARTON_DIMENSIONS.height
  }
};

export function isFaceKey(value: string): value is FaceKey {
  return FACE_KEYS.includes(value as FaceKey);
}
