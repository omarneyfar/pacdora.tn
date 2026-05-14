import type { V2Anchor, V2Face, V2PartBuildContext } from "../contracts/types";

export function resolveAnchor(context: V2PartBuildContext, anchorId: string): V2Anchor {
  return context.getAnchor(anchorId);
}

export function resolveFace(context: V2PartBuildContext, faceId: string): V2Face {
  return context.getFace(faceId);
}
