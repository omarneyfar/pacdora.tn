"use client";

import { useEffect, useRef } from "react";

import { cropArtworkToFace } from "@/features/artwork/artwork";
import { useAppDispatch, useAppSelector } from "@/store";
import { batchUpdateFaces, setIsRecropping } from "@/store/artworkSlice";
import { setError } from "@/store/uiSlice";
import { getErrorMessage } from "@/utils/projectPayload";

/**
 * Debounced re-crop effect.
 * When box dimensions change, all assigned faces are re-rendered
 * with their existing crop settings against the new face proportions.
 *
 * Skips the initial mount and hydration loads (via suppressRef).
 */
export function useDimensionSync(suppressRef: React.RefObject<boolean>) {
  const dispatch = useAppDispatch();
  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const faces = useAppSelector((s) => s.artwork.faces);
  const sources = useAppSelector((s) => s.artwork.sources);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);

  // Snapshot refs so the effect closure always has the latest data
  // without adding faces/sources as dependencies (which would retrigger on every crop).
  const facesRef = useRef(faces);
  const sourcesRef = useRef(sources);
  const dielineGraphRef = useRef(dielineGraph);

  useEffect(() => {
    facesRef.current = faces;
  }, [faces]);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    dielineGraphRef.current = dielineGraph;
  }, [dielineGraph]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the very first render (mount).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip hydration-triggered dimension writes.
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      const currentFaces = facesRef.current;
      const sourceMap = new Map(sourcesRef.current.map((s) => [s.id, s]));
      const assignedFaces = Object.keys(currentFaces);
      const graph = dielineGraphRef.current;

      if (assignedFaces.length === 0) return;

      dispatch(setIsRecropping(true));

      try {
        const updates = await Promise.all(
          assignedFaces.map(async (face) => {
            const assignment = currentFaces[face];
            const source = assignment ? sourceMap.get(assignment.sourceId) : undefined;
            if (!assignment || !source) return null;

            const dataUrl = await cropArtworkToFace(
              source.dataUrl,
              face,
              dimensions,
              assignment.crop,
              graph
            );

            return { face, asset: { ...assignment, dataUrl } };
          }),
        );

        if (cancelled) return;

        const validUpdates = updates.filter(Boolean) as Array<{
          face: string;
          asset: (typeof currentFaces)[string] & { dataUrl: string };
        }>;

        dispatch(batchUpdateFaces(validUpdates));
      } catch (error) {
        if (!cancelled) {
          dispatch(
            setError(getErrorMessage(error, "Could not update crops for the new size.")),
          );
        }
      } finally {
        if (!cancelled) {
          dispatch(setIsRecropping(false));
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
    // Only re-run when dimensions actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, dispatch]);
}
