export const FACE_KEYS = ["front", "back", "left", "right", "top", "bottom"] as const;

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
  artworkWidth: number;
  artworkHeight: number;
  x: number;
  y: number;
};

export const DEFAULT_CARTON_DIMENSIONS: CartonDimensions = {
  width: 232,
  height: 70,
  depth: 232,
};

export const DIMENSION_LIMITS = {
  min: 20,
  max: 600,
};

export function getDielineSize(dimensions: CartonDimensions) {
  return {
    width: dimensions.height + dimensions.width + dimensions.height,
    height:
      dimensions.height +
      dimensions.depth +
      dimensions.height +
      dimensions.depth,
  };
}

export function getFaceSpecs(
  dimensions: CartonDimensions,
): Record<FaceKey, FaceSpec> {
  const { width, height, depth } = dimensions;

  return {
    back: {
      key: "back",
      label: "Back",
      width,
      height,
      artworkWidth: width,
      artworkHeight: height,
      x: height,
      y: 0,
    },
    left: {
      key: "left",
      label: "Left",
      width: height,
      height: depth,
      artworkWidth: depth,
      artworkHeight: height,
      x: 0,
      y: height,
    },
    top: {
      key: "top",
      label: "Top",
      width,
      height: depth,
      artworkWidth: width,
      artworkHeight: depth,
      x: height,
      y: height,
    },
    right: {
      key: "right",
      label: "Right",
      width: height,
      height: depth,
      artworkWidth: depth,
      artworkHeight: height,
      x: height + width,
      y: height,
    },
    front: {
      key: "front",
      label: "Front",
      width,
      height,
      artworkWidth: width,
      artworkHeight: height,
      x: height,
      y: height + depth,
    },
    bottom: {
      key: "bottom",
      label: "Bottom",
      width,
      height: depth,
      artworkWidth: width,
      artworkHeight: depth,
      x: height,
      y: height + depth + height,
    },
  };
}

export function normalizeDimensions(
  dimensions: Partial<CartonDimensions> | undefined,
): CartonDimensions {
  return {
    width: normalizeDimensionValue(
      dimensions?.width,
      DEFAULT_CARTON_DIMENSIONS.width,
    ),
    height: normalizeDimensionValue(
      dimensions?.height,
      DEFAULT_CARTON_DIMENSIONS.height,
    ),
    depth: normalizeDimensionValue(
      dimensions?.depth,
      DEFAULT_CARTON_DIMENSIONS.depth,
    ),
  };
}

export function isFaceKey(value: string): value is FaceKey {
  return FACE_KEYS.includes(value as FaceKey);
}

function normalizeDimensionValue(value: unknown, fallback: number): number {
  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(
    DIMENSION_LIMITS.max,
    Math.max(DIMENSION_LIMITS.min, Math.round(numericValue)),
  );
}
