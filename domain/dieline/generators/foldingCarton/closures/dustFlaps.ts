import { createDielineFace } from "../../../geometry";
import type { DielineFace } from "../../../types";
import type { BodyStripResult, ClosureResult, NormalizedParams } from "../types";

/**
 * Create dust flap faces for specified body panels on one side (top or bottom).
 *
 * Dust flaps are tapered trapezoidal faces that fold inward from the side panels
 * to hold the box structure before the tuck flap closes.
 *
 * WARNING: Taper and shoulder proportions are approximate (needs verification).
 */
export function createDustFlapFaces(
  params: NormalizedParams,
  dustPanels: string[],
  position: "top" | "bottom",
  strip: BodyStripResult,
): ClosureResult {
  const faces: DielineFace[] = [];

  for (const panelId of dustPanels) {
    const col = strip.columnsByFaceId.get(panelId);
    if (!col) continue;

    const faceId = `${position}-dust-${panelId}`;
    const label = `${capitalize(position)} dust flap (${panelId.charAt(0).toUpperCase()})`;
    const face = createDustFlapFace(faceId, col.x, position === "top" ? strip.bodyTop - params.DFW : strip.bodyBottom, col.width, params.DFW, position, label);
    faces.push(face);
  }

  return { faces, scoreLines: [] };
}

function createDustFlapFace(
  id: string, x: number, y: number,
  width: number, height: number,
  direction: "top" | "bottom", label: string,
): DielineFace {
  // Taper and shoulder proportions are approximate (needs production verification).
  const taper = Math.min(width * 0.15, height * 0.3);
  const shoulder = Math.min(3, height * 0.1);
  const topY = direction === "top" ? y : y + height;
  const lidY = direction === "top" ? y + height : y;
  const shoulderY = direction === "top" ? lidY - shoulder : lidY + shoulder;

  const vertices = direction === "top"
    ? [
        { x, y: lidY },
        { x, y: shoulderY },
        { x: x + taper, y: topY },
        { x: x + width - taper, y: topY },
        { x: x + width, y: shoulderY },
        { x: x + width, y: lidY },
      ]
    : [
        { x, y: lidY },
        { x, y: shoulderY },
        { x: x + taper, y: topY },
        { x: x + width - taper, y: topY },
        { x: x + width, y: shoulderY },
        { x: x + width, y: lidY },
      ];

  return createDielineFace({ id, label, vertices, role: "flap", artworkEnabled: false });
}

/**
 * Create simple rectangular panel flap faces (e.g., STE back panel closure flaps).
 */
export function createPanelFlapFaces(
  params: NormalizedParams,
  panelFlaps: string[],
  position: "top" | "bottom",
  strip: BodyStripResult,
): ClosureResult {
  const faces: DielineFace[] = [];

  for (const panelId of panelFlaps) {
    const col = strip.columnsByFaceId.get(panelId);
    if (!col) continue;

    const faceId = `${position}-panel`;
    const label = `${capitalize(position)} panel`;
    const y = position === "top" ? strip.bodyTop - params.DFW : strip.bodyBottom;
    faces.push(createRectFlap(faceId, col.x, y, col.width, params.DFW, label));
  }

  return { faces, scoreLines: [] };
}

function createRectFlap(id: string, x: number, y: number, width: number, height: number, label: string): DielineFace {
  return createDielineFace({
    id, label,
    vertices: [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    role: "flap",
    artworkEnabled: false,
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
