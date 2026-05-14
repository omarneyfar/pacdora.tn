import type { V2GeometryPrimitive } from "../contracts/types";

export function roundedSlotPrimitive(input: {
  id: string;
  label: string;
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
    type: "slot",
    layer: "hole",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    radius: Math.max(0, Math.min(input.radius, input.width / 2, input.height / 2)),
    ownerFaceId: input.ownerFaceId,
  };
}

export function euroSlotPrimitive(input: {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  crownRadius: number;
  ownerFaceId?: string;
}): V2GeometryPrimitive {
  return {
    id: input.id,
    label: input.label,
    type: "euro-slot",
    layer: "hole",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    radius: Math.max(0, Math.min(input.radius, input.width / 2, input.height / 2)),
    crownRadius: Math.max(0, input.crownRadius),
    ownerFaceId: input.ownerFaceId,
  };
}
