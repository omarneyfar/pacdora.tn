"use client";

import { useCallback } from "react";

import type { FaceKey } from "@/domain/packaging";
import {
  cropArtworkToFace,
  DEFAULT_CROP_SETTINGS,
  importArtworkFile,
  normalizeCropSettings,
  type CropSettings,
} from "@/features/artwork/artwork";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  addSource,
  clearFace as clearFaceAction,
  setBusyFace,
  setFace,
  setSelectedSourceId,
} from "@/store/artworkSlice";
import { markChanged } from "@/store/builderSlice";
import { clearShareUrl, openCropModal, setError } from "@/store/uiSlice";
import { createArtworkId, getErrorMessage } from "@/utils/projectPayload";

export function useArtworkWorkspace() {
  const dispatch = useAppDispatch();
  const sources = useAppSelector((s) => s.artwork.sources);
  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);

  const handleUpload = useCallback(
    async (face: FaceKey, file: File) => {
      dispatch(setBusyFace(face));
      dispatch(setError(""));
      dispatch(clearShareUrl());
      dispatch(markChanged());

      try {
        const imported = await importArtworkFile(file);
        const source = {
          id: createArtworkId(),
          mimeType: file.type === "application/pdf" ? "image/png" : file.type,
          ...imported,
        };

        dispatch(addSource(source));
        dispatch(setSelectedSourceId(source.id));
        dispatch(openCropModal({ face, sourceId: source.id, settings: DEFAULT_CROP_SETTINGS }));
      } catch (error) {
        dispatch(setError(getErrorMessage(error, "Could not prepare the selected artwork.")));
      } finally {
        dispatch(setBusyFace(null));
      }
    },
    [dispatch],
  );

  const applySourceToFace = useCallback(
    async (face: FaceKey, sourceId: string, crop: CropSettings = DEFAULT_CROP_SETTINGS) => {
      const source = sources.find((candidate) => candidate.id === sourceId);
      if (!source) {
        return;
      }

      const normalizedCrop = normalizeCropSettings(crop);
      dispatch(setBusyFace(face));
      dispatch(setError(""));
      dispatch(clearShareUrl());
      dispatch(markChanged());

      try {
        const dataUrl = await cropArtworkToFace(source.dataUrl, face, dimensions, normalizedCrop, dielineGraph);

        dispatch(
          setFace({
            face,
            asset: {
              sourceId: source.id,
              dataUrl,
              fileName: source.fileName,
              sourceType: source.sourceType,
              crop: normalizedCrop,
            },
          }),
        );
      } catch (error) {
        dispatch(setError(getErrorMessage(error, "Could not apply that artwork to this side.")));
      } finally {
        dispatch(setBusyFace(null));
      }
    },
    [dielineGraph, dimensions, dispatch, sources],
  );

  const clearFace = useCallback(
    (face: FaceKey) => {
      dispatch(clearShareUrl());
      dispatch(markChanged());
      dispatch(clearFaceAction(face));
    },
    [dispatch],
  );

  return { handleUpload, applySourceToFace, clearFace };
}
