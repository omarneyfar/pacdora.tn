import { createDielineFace } from "../../../geometry";
import type { DielineFace, GeometryPrimitive, Point } from "../../../types";
import type { BodyStripResult, ClosureResult, NormalizedParams } from "../types";

/**
 * Create tuck flap faces and internal score lines for a tuck-end closure.
 *
 * The tuck flap geometry uses lip/slit/arc shapes extracted from the
 * Reverse Tuck End implementation. These proportions are approximate
 * and have NOT been verified against production CAD references.
 *
 * @param tuckPanel - the body panel the tuck connects to (e.g., "front")
 * @param position - "top" or "bottom"
 */
export function createTuckEndFaces(
  params: NormalizedParams,
  tuckPanel: string,
  position: "top" | "bottom",
  strip: BodyStripResult,
): ClosureResult {
  const col = strip.columnsByFaceId.get(tuckPanel);
  if (!col) return { faces: [], scoreLines: [] };

  const { W, TFW, TFR } = params;
  const tuckHeight = W + TFW;
  const faceId = `${position}-tuck`;
  const label = `${capitalize(position)} tuck flap`;

  let face: DielineFace;
  let scoreLine: GeometryPrimitive;

  if (position === "top") {
    const flapY = strip.bodyTop - tuckHeight;
    face = createTuckFlapFace(faceId, col.x, flapY, col.width, tuckHeight, TFW, TFR, "top", label);
    scoreLine = {
      id: `score-${faceId}-lip`,
      layer: "crease" as const,
      type: "line" as const,
      start: { x: col.x, y: flapY + TFW },
      end: { x: col.x + col.width, y: flapY + TFW },
    };
  } else {
    const flapY = strip.bodyBottom;
    face = createTuckFlapFace(faceId, col.x, flapY, col.width, tuckHeight, TFW, TFR, "bottom", label);
    scoreLine = {
      id: `score-${faceId}-lip`,
      layer: "crease" as const,
      type: "line" as const,
      start: { x: col.x, y: flapY + W },
      end: { x: col.x + col.width, y: flapY + W },
    };
  }

  return { faces: [face], scoreLines: [scoreLine] };
}

/**
 * Create a tuck flap face with lip, slit, and rounded arc geometry.
 *
 * WARNING: This geometry is an approximation. The lip height, slit depth,
 * arc radius, and vertex positions need verification against trusted
 * manufacturing references before production use.
 */
function createTuckFlapFace(
  id: string, x: number, y: number,
  width: number, height: number, lipHeight: number, taper: number,
  direction: "top" | "bottom", label: string,
): DielineFace {
  const innerY = direction === "top" ? y + lipHeight : y + height - lipHeight;
  const topY = direction === "top" ? y : y + height;
  const lidY = direction === "top" ? y + height : y;

  const r = Math.min(5, taper, lipHeight * 0.5);
  const slit = Math.min(3, taper * 0.5);

  const leftSlitX = x + slit;
  const rightSlitX = x + width - slit;
  const leftArcCenterX = x + taper + r;
  const rightArcCenterX = x + width - taper - r;
  const arcCenterY = direction === "top" ? topY + r : topY - r;

  const vertices = direction === "top"
    ? [
        { x, y: lidY },
        { x, y: innerY },
        { x: leftSlitX, y: innerY },
        { x: leftSlitX, y: innerY - slit * 0.5 },
        ...sampleQuarterArc({ x: leftArcCenterX, y: arcCenterY }, r, Math.PI, Math.PI * 1.5),
        { x: rightArcCenterX, y: topY },
        ...sampleQuarterArc({ x: rightArcCenterX, y: arcCenterY }, r, Math.PI * 1.5, Math.PI * 2).slice(1),
        { x: rightSlitX, y: innerY - slit * 0.5 },
        { x: rightSlitX, y: innerY },
        { x: x + width, y: innerY },
        { x: x + width, y: lidY },
      ]
    : [
        { x, y: lidY },
        { x, y: innerY },
        { x: leftSlitX, y: innerY },
        { x: leftSlitX, y: innerY + slit * 0.5 },
        ...sampleQuarterArc({ x: leftArcCenterX, y: arcCenterY }, r, Math.PI, Math.PI * 0.5),
        { x: rightArcCenterX, y: topY },
        ...sampleQuarterArc({ x: rightArcCenterX, y: arcCenterY }, r, Math.PI * 0.5, 0).slice(1),
        { x: rightSlitX, y: innerY + slit * 0.5 },
        { x: rightSlitX, y: innerY },
        { x: x + width, y: innerY },
        { x: x + width, y: lidY },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

function sampleQuarterArc(center: Point, radius: number, startAngle: number, endAngle: number): Point[] {
  return Array.from({ length: 7 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / 6;
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    };
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
