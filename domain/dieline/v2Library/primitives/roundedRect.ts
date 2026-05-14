import type { V2GeometryPrimitive, V2Point } from "../contracts/types";
import { sampleArc } from "./arcs";

export function roundedRectPrimitive(input: {
  id: string;
  label: string;
  layer: Extract<V2GeometryPrimitive["layer"], "hole" | "window" | "safe-area" | "bleed" | "glue" | "no-print" | "film" | "guide">;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  ownerFaceId?: string;
}): V2GeometryPrimitive {
  return {
    id: input.id,
    label: input.label,
    layer: input.layer,
    type: "rounded-rect",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    radius: clampRadius(input.radius, input.width, input.height),
    ownerFaceId: input.ownerFaceId,
  };
}

export function roundedRectPoints(x: number, y: number, width: number, height: number, radius: number): V2Point[] {
  const r = clampRadius(radius, width, height);
  if (r <= 0) {
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  return [
    ...sampleArc({ x: x + r, y: y + r }, r, Math.PI, Math.PI * 1.5, 4).slice(0, -1),
    ...sampleArc({ x: x + width - r, y: y + r }, r, Math.PI * 1.5, Math.PI * 2, 4).slice(0, -1),
    ...sampleArc({ x: x + width - r, y: y + height - r }, r, 0, Math.PI * 0.5, 4).slice(0, -1),
    ...sampleArc({ x: x + r, y: y + height - r }, r, Math.PI * 0.5, Math.PI, 4).slice(0, -1),
  ];
}

function clampRadius(radius: number, width: number, height: number): number {
  return Math.max(0, Math.min(radius, width / 2, height / 2));
}
