export const FACE_KEYS = ["front", "back", "left", "right", "top", "bottom"] as const;
export const PROJECT_STATUSES = ["draft", "published"] as const;

export type FaceKey = (typeof FACE_KEYS)[number];
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type CartonDimensions = {
  width: number;
  height: number;
  depth: number;
};

export type ArtworkSourceType = "image" | "pdf";

export type ProjectCropSettings = {
  coordinates: {
    height: number;
    left: number;
    top: number;
    width: number;
  } | null;
  transforms: {
    flip: {
      horizontal: boolean;
      vertical: boolean;
    };
    rotate: number;
  };
};

export type ProjectArtworkSource = {
  id: string;
  fileName: string;
  mimeType: string;
  sourceType: ArtworkSourceType;
  url: string;
};

export type ProjectFaceAsset = {
  sourceId: string;
  fileName: string;
  sourceType: ArtworkSourceType;
  crop: ProjectCropSettings;
};

export type ProjectWorkspace = {
  sources: ProjectArtworkSource[];
  selectedSourceId?: string;
  faceAssets: Partial<Record<FaceKey, ProjectFaceAsset>>;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  dimensions: CartonDimensions;
  faces: Partial<Record<FaceKey, string>>;
  createdAt: string;
  updatedAt: string;
  workspace?: ProjectWorkspace;
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

export type DielineGuideKind = "cut" | "fold" | "bleed" | "safe";

export type DielineSegment = {
  kind: "cut" | "fold";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type DielineRectGuide = {
  kind: "bleed" | "safe";
  face: FaceKey;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DielineLabel = {
  face: FaceKey;
  text: string;
  x: number;
  y: number;
};

export type DielinePrintGuides = {
  bleed: number;
  safe: number;
  labels: DielineLabel[];
  rectangles: DielineRectGuide[];
  segments: DielineSegment[];
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

export const PRINT_GUIDE_OFFSETS = {
  bleed: 3,
  safe: 5,
};

export function getDielineSize(dimensions: CartonDimensions) {
  return {
    width:
      dimensions.height +
      dimensions.width +
      dimensions.height +
      dimensions.width,
    height: dimensions.height + dimensions.depth + dimensions.height,
  };
}

export function getDielinePrintGuides(
  dimensions: CartonDimensions,
): DielinePrintGuides {
  const dielineSize = getDielineSize(dimensions);
  const faceSpecs = getFaceSpecs(dimensions);
  const edgeMap = new Map<string, DielineSegment & { count: number }>();
  const rectangles: DielineRectGuide[] = [];
  const labels: DielineLabel[] = [];

  for (const spec of Object.values(faceSpecs)) {
    const bleed = getResponsiveGuideOffset(
      PRINT_GUIDE_OFFSETS.bleed,
      spec.width,
      spec.height,
    );
    const safe = getResponsiveGuideOffset(
      PRINT_GUIDE_OFFSETS.safe,
      spec.width,
      spec.height,
    );

    rectangles.push({
      kind: "bleed",
      face: spec.key,
      x: Math.max(0, spec.x - bleed),
      y: Math.max(0, spec.y - bleed),
      width: Math.min(dielineSize.width - Math.max(0, spec.x - bleed), spec.width + bleed * 2),
      height: Math.min(dielineSize.height - Math.max(0, spec.y - bleed), spec.height + bleed * 2),
    });
    rectangles.push({
      kind: "safe",
      face: spec.key,
      x: spec.x + safe,
      y: spec.y + safe,
      width: Math.max(1, spec.width - safe * 2),
      height: Math.max(1, spec.height - safe * 2),
    });
    labels.push({
      face: spec.key,
      text: `${spec.label} ${spec.artworkWidth} x ${spec.artworkHeight} mm`,
      x: spec.x + spec.width / 2,
      y: spec.y + Math.min(18, Math.max(10, spec.height * 0.18)),
    });

    for (const edge of getSpecEdges(spec)) {
      const key = getSegmentKey(edge);
      const existing = edgeMap.get(key);

      if (existing) {
        existing.count += 1;
        existing.kind = "fold";
      } else {
        edgeMap.set(key, { ...edge, count: 1 });
      }
    }
  }

  return {
    bleed: PRINT_GUIDE_OFFSETS.bleed,
    safe: PRINT_GUIDE_OFFSETS.safe,
    labels,
    rectangles,
    segments: Array.from(edgeMap.values()).map((segment) => ({
      kind: segment.kind,
      x1: segment.x1,
      y1: segment.y1,
      x2: segment.x2,
      y2: segment.y2,
    })),
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
      x: height + width + height,
      y: height,
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

export function normalizeProjectStatus(
  value: unknown,
  fallback: ProjectStatus = "draft",
): ProjectStatus {
  return PROJECT_STATUSES.includes(value as ProjectStatus)
    ? (value as ProjectStatus)
    : fallback;
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

function getResponsiveGuideOffset(
  offset: number,
  width: number,
  height: number,
): number {
  return Math.min(offset, Math.max(1, Math.floor(Math.min(width, height) / 5)));
}

function getSpecEdges(spec: FaceSpec): DielineSegment[] {
  const left = spec.x;
  const right = spec.x + spec.width;
  const top = spec.y;
  const bottom = spec.y + spec.height;

  return [
    { kind: "cut", x1: left, y1: top, x2: right, y2: top },
    { kind: "cut", x1: right, y1: top, x2: right, y2: bottom },
    { kind: "cut", x1: right, y1: bottom, x2: left, y2: bottom },
    { kind: "cut", x1: left, y1: bottom, x2: left, y2: top },
  ];
}

function getSegmentKey(segment: DielineSegment): string {
  const first = `${segment.x1},${segment.y1}`;
  const second = `${segment.x2},${segment.y2}`;

  return first < second ? `${first}|${second}` : `${second}|${first}`;
}
