"use client";

import { useEffect, useRef } from "react";

import { readDieline } from "@/features/dielines/dielineClient";
import { useAppDispatch, useAppSelector } from "@/store";
import { markChanged, setLibraryDieline } from "@/store/builderSlice";
import { clearShareUrl, setError } from "@/store/uiSlice";

export function useInitialDieline(initialDielineId?: string) {
  const dispatch = useAppDispatch();
  const projectId = useAppSelector((state) => state.builder.projectId);
  const loadedDielineId = useRef("");

  useEffect(() => {
    if (!initialDielineId || projectId || loadedDielineId.current === initialDielineId) {
      return;
    }

    let isMounted = true;
    const loadDielineId = initialDielineId;
    loadedDielineId.current = loadDielineId;

    async function loadDieline() {
      try {
        const template = await readDieline(loadDielineId);

        if (!isMounted) {
          return;
        }

        if (template.status !== "ready") {
          dispatch(setError("That dieline is still draft. Mark it ready before using it in a project."));
          return;
        }

        dispatch(
          setLibraryDieline({
            templateId: template.id,
            name: template.name,
            fileName: template.fileName,
            graph: template.graph,
          }),
        );
        dispatch(clearShareUrl());
        dispatch(markChanged());
      } catch (error) {
        if (isMounted) {
          dispatch(setError(error instanceof Error ? error.message : "Could not load that dieline."));
        }
      }
    }

    loadDieline();

    return () => {
      isMounted = false;
    };
  }, [dispatch, initialDielineId, projectId]);
}
