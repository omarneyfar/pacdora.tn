"use client";

import { useCallback } from "react";

import { importSvgDieline } from "@/domain/dieline/svgImporter";
import { useAppDispatch } from "@/store";
import { markChanged, resetDieline, setImportedDieline } from "@/store/builderSlice";
import { clearShareUrl, setError } from "@/store/uiSlice";
import { getErrorMessage } from "@/utils/projectPayload";

const MAX_SVG_BYTES = 700_000;

export function useDielineImport() {
  const dispatch = useAppDispatch();

  const importDielineFile = useCallback(
    async (file: File) => {
      dispatch(setError(""));

      if (file.size > MAX_SVG_BYTES) {
        dispatch(setError("SVG dieline is too large. Please use a file under 700 KB."));
        return;
      }

      try {
        const svgText = await file.text();
        const { graph, warnings } = importSvgDieline(svgText);

        dispatch(setImportedDieline({ fileName: file.name, graph }));
        dispatch(clearShareUrl());
        dispatch(markChanged());

        if (warnings.length > 0) {
          dispatch(setError(warnings.slice(0, 2).join(" ")));
        }
      } catch (error) {
        dispatch(setError(getErrorMessage(error, "Could not import this SVG dieline.")));
      }
    },
    [dispatch],
  );

  const useTemplateDieline = useCallback(() => {
    dispatch(resetDieline());
    dispatch(clearShareUrl());
    dispatch(markChanged());
    dispatch(setError(""));
  }, [dispatch]);

  return {
    importDielineFile,
    useTemplateDieline,
  };
}
