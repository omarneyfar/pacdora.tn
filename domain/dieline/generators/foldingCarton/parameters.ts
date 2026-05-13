import type { FoldingCartonInput, NormalizedParams } from "./types";

const DEFAULTS = {
  L: 120.65,
  W: 60.72,
  H: 161.13,
  materialThickness: 1.5,
} as const;

/**
 * Normalize raw user input into a complete set of folding-carton parameters.
 * Handles aliases (width/height/depth → L/W/H), auto-closure derivation,
 * manual clamping, and outer→inner dimension conversion.
 */
export function normalizeFoldingCartonParameters(input: FoldingCartonInput = {}): NormalizedParams {
  const L = positive(input.L ?? input.width, DEFAULTS.L);
  const W = positive(input.W ?? input.depth, DEFAULTS.W);
  const H = positive(input.H ?? input.height, DEFAULTS.H);
  const closureMode = input.closureMode === "manual" ? "manual" : "auto";
  const auto = autoClosureValues(L, W);

  const TFW = closureMode === "manual"
    ? clampNumber(input.TFW, W * 0.15, W * 0.6, auto.TFW)
    : auto.TFW;
  const DFW = closureMode === "manual"
    ? clampNumber(input.DFW, W * 0.25, Math.min(W * 0.9, W * 1.15 - TFW), auto.DFW)
    : auto.DFW;
  const TFR = closureMode === "manual"
    ? clampNumber(input.TFR, 0, Math.min(W * 0.5, L * 0.25), auto.TFR)
    : auto.TFR;
  const GFW = closureMode === "manual"
    ? clampNumber(input.GFW, 10, 22, auto.GFW)
    : auto.GFW;

  const outputSizeMode = input.outputSizeMode === "outer" ? "outer" : "inner";
  const materialThickness = clampNumber(input.materialThickness, 0, 12, DEFAULTS.materialThickness);

  const base: NormalizedParams = { L, W, H, TFW, TFR, GFW, DFW, closureMode, outputSizeMode, materialThickness };
  return outputSizeMode === "outer" ? applyOuterDimensionMode(base) : base;
}

/**
 * Derive closure values from box dimensions.
 * NOTE: These proportions are approximate and need production verification.
 */
export function autoClosureValues(L: number, W: number) {
  return {
    TFW: clampNumber(W * 0.32, W * 0.22, W * 0.45, W * 0.32),
    DFW: clampNumber(W * 0.58, W * 0.45, W * 0.75, W * 0.58),
    TFR: clampNumber(W * 0.25, 4, Math.min(W * 0.35, L * 0.2), W * 0.25),
    GFW: clampNumber(W * 0.25, 10, 22, W * 0.25),
  };
}

function applyOuterDimensionMode(params: NormalizedParams): NormalizedParams {
  const inset = params.materialThickness * 2;
  const L = Math.max(1, params.L - inset);
  const W = Math.max(1, params.W - inset);
  const H = Math.max(1, params.H - inset);

  if (params.closureMode === "auto") {
    const auto = autoClosureValues(L, W);
    return { ...params, L, W, H, ...auto };
  }

  const TFW = clampNumber(params.TFW, W * 0.15, W * 0.6, params.TFW);
  return {
    ...params,
    L, W, H,
    TFW,
    DFW: clampNumber(params.DFW, W * 0.25, Math.min(W * 0.9, W * 1.15 - TFW), params.DFW),
    TFR: clampNumber(params.TFR, 0, Math.min(W * 0.5, L * 0.25), params.TFR),
    GFW: clampNumber(params.GFW, 10, 22, params.GFW),
  };
}

// ── Utilities ──────────────────────────────────────────────────

export function positive(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  if (!Number.isFinite(numeric)) {
    return Math.min(safeMax, Math.max(safeMin, fallback));
  }
  return Math.min(safeMax, Math.max(safeMin, numeric));
}
