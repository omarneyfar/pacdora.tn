import type { DielineFace, DielineCrease, GeometryPrimitive, ParameterSpec } from "../../types";

// ── Closure types ──────────────────────────────────────────────

export type ClosureType = "tuck-end" | "seal-end" | "none";

export type ClosureSpec = {
  type: ClosureType;
  /** Which body panel the tuck flap connects to (e.g., "front"). */
  tuckPanel?: string;
  /** Which body panels get dust flaps (e.g., ["left", "right"]). */
  dustPanels?: string[];
  /** Which body panels get simple rectangular panel flaps (STE-style). */
  panelFlaps?: string[];
};

// ── Recipe ─────────────────────────────────────────────────────

export type VerificationStatus = "verified" | "geometry-needs-verification" | "placeholder";

export type FoldingCartonRecipe = {
  id: string;
  label: string;
  family: string;
  verificationStatus: VerificationStatus;
  productionReady: boolean;
  /** Optional parameter specs for the UI parameter editor. */
  parameterSpecs?: ParameterSpec[];
  body: {
    /** Panel IDs in left-to-right strip order. Widths alternate W, L, W, L. */
    panelOrder: string[];
    /** Which body panel the glue tab connects to. */
    glueTabAttachedTo: string;
    /** Whether the glue tab appears before or after that panel in the strip. */
    glueTabSide: "before" | "after";
  };
  topClosure: ClosureSpec;
  bottomClosure: ClosureSpec;
};

// ── Input / normalized parameters ──────────────────────────────

export type FoldingCartonInput = {
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
  // Aliases from legacy/catalog
  width?: number;
  height?: number;
  depth?: number;
};

export type NormalizedParams = {
  L: number;
  W: number;
  H: number;
  TFW: number;
  TFR: number;
  GFW: number;
  DFW: number;
  closureMode: "auto" | "manual";
  outputSizeMode: "inner" | "outer";
  materialThickness: number;
};

// ── Body strip result ──────────────────────────────────────────

export type BodyStripColumn = {
  id: string;
  x: number;
  width: number;
};

export type BodyStripResult = {
  faces: DielineFace[];
  glueTabFace: DielineFace;
  columns: BodyStripColumn[];
  columnsByFaceId: Map<string, BodyStripColumn>;
  bodyTop: number;
  bodyBottom: number;
  topBand: number;
  bottomBand: number;
  totalWidth: number;
  totalHeight: number;
};

// ── Closure result ─────────────────────────────────────────────

export type ClosureResult = {
  faces: DielineFace[];
  scoreLines: GeometryPrimitive[];
};
