import type { V2Anchor, V2AnchorEdge, V2Face, V2Point } from "../contracts/types";
import { distance, normalize } from "../primitives/points";

const EPSILON = 0.000001;

export function createAnchor(input: {
  id: string;
  ownerPartId: string;
  faceId: string;
  edge: V2AnchorEdge;
  start: V2Point;
  end: V2Point;
  normal: V2Point;
}): V2Anchor {
  const length = distance(input.start, input.end);
  if (length <= EPSILON) {
    throw new Error(`${input.id}: anchor length must be positive.`);
  }

  return {
    ...input,
    tangent: normalize({ x: input.end.x - input.start.x, y: input.end.y - input.start.y }),
    length,
  };
}

export function createFaceEdgeAnchors(ownerPartId: string, face: V2Face, prefix = face.id): V2Anchor[] {
  return (["top", "right", "bottom", "left"] as const).map((edge) => createFaceEdgeAnchor(ownerPartId, face, edge, `${prefix}.${edge}`));
}

export function createFaceEdgeAnchor(ownerPartId: string, face: V2Face, edge: Exclude<V2AnchorEdge, "custom">, id = `${face.id}.${edge}`): V2Anchor {
  const { x, y, width, height } = face.bounds;
  if (edge === "top") {
    return createAnchor({ id, ownerPartId, faceId: face.id, edge, start: { x, y }, end: { x: x + width, y }, normal: { x: 0, y: -1 } });
  }
  if (edge === "right") {
    return createAnchor({ id, ownerPartId, faceId: face.id, edge, start: { x: x + width, y }, end: { x: x + width, y: y + height }, normal: { x: 1, y: 0 } });
  }
  if (edge === "bottom") {
    return createAnchor({ id, ownerPartId, faceId: face.id, edge, start: { x, y: y + height }, end: { x: x + width, y: y + height }, normal: { x: 0, y: 1 } });
  }
  return createAnchor({ id, ownerPartId, faceId: face.id, edge, start: { x, y }, end: { x, y: y + height }, normal: { x: -1, y: 0 } });
}
