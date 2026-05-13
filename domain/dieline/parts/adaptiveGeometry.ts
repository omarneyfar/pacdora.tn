const EPSILON = 0.000001;

export function assertPositiveFinite(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
}

export function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export function clampRadius(radius: number, width: number, height: number): number {
  assertFinite(radius, "corner radius");
  assertPositiveFinite(width, "flap width");
  assertPositiveFinite(height, "flap height");

  const maxByGeometry = Math.max(0, Math.min(width, height) / 2 - EPSILON);
  const maxByProportion = Math.max(0, Math.min(width * 0.22, height * 0.32));
  return clamp(Math.max(0, radius), 0, Math.min(maxByGeometry, maxByProportion));
}

export function clampTaper(taper: number, width: number, height: number): number {
  assertFinite(taper, "flap taper");
  assertPositiveFinite(width, "flap width");
  assertPositiveFinite(height, "flap height");

  const maxByGeometry = Math.max(0, width / 2 - EPSILON);
  const maxByProportion = Math.max(0, Math.min(width * 0.24, height * 0.3));
  return clamp(Math.max(0, taper), 0, Math.min(maxByGeometry, maxByProportion));
}

export function clampScoreOffset(
  scoreOffset: number,
  flapHeight: number,
  cornerRadius: number,
  roundedEdge: "top" | "bottom",
): number {
  assertFinite(scoreOffset, "score offset");
  assertPositiveFinite(flapHeight, "flap height");
  assertFinite(cornerRadius, "corner radius");

  const margin = Math.min(Math.max(flapHeight * 0.02, 0.25), Math.max(flapHeight * 0.2, EPSILON));
  const roundedClearance = Math.min(Math.max(0, cornerRadius) + margin, flapHeight / 2);
  const minOffset = roundedEdge === "top" ? roundedClearance : margin;
  const maxOffset = roundedEdge === "bottom" ? flapHeight - roundedClearance : flapHeight - margin;

  if (maxOffset <= minOffset) {
    return flapHeight / 2;
  }

  return clamp(scoreOffset, minOffset, maxOffset);
}

export function safeBevel(width: number, height: number): number {
  assertPositiveFinite(width, "glue tab width");
  assertPositiveFinite(height, "glue tab height");

  const requested = Math.min(width * 0.34, height * 0.08);
  const maxByGeometry = Math.max(0, Math.min(width * 0.45, height / 2) - EPSILON);
  return clamp(requested, 0, maxByGeometry);
}

export function pushAdjustmentWarning(
  warnings: string[],
  partId: string,
  property: string,
  requested: number,
  used: number,
) {
  if (Math.abs(requested - used) <= EPSILON) return;

  warnings.push(`${partId}: adjusted ${property} from ${formatNumber(requested)} to ${formatNumber(used)} to keep geometry valid.`);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
