import type { DielineFace, Point } from "../types";
import type { Anchor, AnchorEdge } from "./types";

const EPSILON = 0.000001;

export function createFaceEdgeAnchors(ownerPartId: string, face: DielineFace, prefix = face.id): Anchor[] {
  return (["top", "right", "bottom", "left"] as const).map((edge) =>
    createFaceEdgeAnchor(ownerPartId, face, edge, `${prefix}.${edge}`),
  );
}

export function createFaceEdgeAnchor(
  ownerPartId: string,
  face: DielineFace,
  edge: Exclude<AnchorEdge, "custom">,
  id = `${face.id}.${edge}`,
): Anchor {
  const { x, y, width, height } = face.bounds;

  if (edge === "top") {
    return createAnchor(ownerPartId, face.id, edge, id, { x, y }, { x: x + width, y }, { x: 0, y: -1 });
  }

  if (edge === "right") {
    return createAnchor(ownerPartId, face.id, edge, id, { x: x + width, y }, { x: x + width, y: y + height }, { x: 1, y: 0 });
  }

  if (edge === "bottom") {
    return createAnchor(ownerPartId, face.id, edge, id, { x, y: y + height }, { x: x + width, y: y + height }, { x: 0, y: 1 });
  }

  return createAnchor(ownerPartId, face.id, edge, id, { x, y }, { x, y: y + height }, { x: -1, y: 0 });
}

export function createAnchor(
  ownerPartId: string,
  faceId: string,
  edge: AnchorEdge,
  id: string,
  start: Point,
  end: Point,
  normal: Point,
): Anchor {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);

  if (length <= EPSILON) {
    throw new Error(`Anchor ${id} has zero length.`);
  }

  return {
    id,
    ownerPartId,
    faceId,
    edge,
    start,
    end,
    normal,
    tangent: { x: dx / length, y: dy / length },
    length,
  };
}
