"use client";

import { useCallback } from "react";

import type { Project, ProjectStatus } from "@/domain/packaging";
import { useAppDispatch, useAppSelector } from "@/store";
import { setIsSharing } from "@/store/builderSlice";
import { setCopied, setError, setShareUrl } from "@/store/uiSlice";
import { getErrorMessage } from "@/utils/projectPayload";

/**
 * Manages the publish → share link flow:
 * 1. Save with status "published"
 * 2. Build the share URL
 * 3. Copy to clipboard
 */
export function useShareLink(
  saveProject: (status: ProjectStatus) => Promise<Project | null>,
) {
  const dispatch = useAppDispatch();
  const shareUrl = useAppSelector((s) => s.ui.shareUrl);
  const copied = useAppSelector((s) => s.ui.copied);

  const createShareLink = useCallback(async () => {
    dispatch(setIsSharing(true));
    dispatch(setError(""));

    try {
      const project = await saveProject("published");
      if (!project) return;

      const url = `${window.location.origin}/view/${project.id}`;
      dispatch(setShareUrl(url));

      try {
        await navigator.clipboard.writeText(url);
        dispatch(setCopied(true));
        window.setTimeout(() => dispatch(setCopied(false)), 1600);
      } catch {
        // Clipboard access may be denied — the URL is still shown in the UI.
        dispatch(setCopied(false));
      }
    } catch (error) {
      dispatch(
        setError(getErrorMessage(error, "Could not create a share link.")),
      );
    } finally {
      dispatch(setIsSharing(false));
    }
  }, [dispatch, saveProject]);

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      dispatch(setCopied(true));
      window.setTimeout(() => dispatch(setCopied(false)), 1600);
    } catch {
      dispatch(setCopied(false));
    }
  }, [dispatch, shareUrl]);

  return { createShareLink, copyShareUrl, shareUrl, copied };
}
