import { FACE_KEYS, isFaceKey } from "@/domain/packaging";
import type { FaceKey } from "@/domain/packaging";
import type { DielineFace, DielineGraph } from "./types";

export function getFaceKeyFromGraphFaceId(faceId: string): FaceKey | null {
  return isFaceKey(faceId) ? faceId : null;
}

export function getGraphFaceForFaceKey(graph: DielineGraph, faceKey: FaceKey): DielineFace | null {
  return graph.faces.find((face) => face.id === faceKey) ?? null;
}

export function getGraphFacesByFaceKey(graph: DielineGraph): Partial<Record<FaceKey, DielineFace>> {
  return FACE_KEYS.reduce<Partial<Record<FaceKey, DielineFace>>>((facesByKey, faceKey) => {
    const face = getGraphFaceForFaceKey(graph, faceKey);

    if (face) {
      facesByKey[faceKey] = face;
    }

    return facesByKey;
  }, {});
}
