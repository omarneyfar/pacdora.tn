"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  FACE_KEYS,
  normalizeDimensions,
  type Project,
  type ProjectStatus,
} from "@/domain/packaging";
import {
  DEFAULT_CROP_SETTINGS,
  normalizeCropSettings,
  renderProjectFaces,
} from "@/features/artwork/artwork";
import { createProject, readProject, updateProject } from "@/features/projects/projectClient";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  hydrateBuilder,
  setIsProjectLoading,
  setIsProjectSaving,
  setSaveStatus,
} from "@/store/builderSlice";
import { hydrateArtwork, type ArtworkSource, type FaceAsset } from "@/store/artworkSlice";
import { clearShareUrl, setError } from "@/store/uiSlice";
import {
  createFullProjectPayload,
  createProjectPatchPayload,
  createSavedPayloadFromProject,
  getErrorMessage,
  isEmptyPatchPayload,
  type ProjectSavePayload,
} from "@/utils/projectPayload";

/**
 * Manages project lifecycle — loading, saving, patching, and hydrating.
 * All async persistence logic lives here, not in components.
 */
export function useProjectPersistence(initialProjectId?: string) {
  const dispatch = useAppDispatch();

  const projectId = useAppSelector((s) => s.builder.projectId);
  const projectName = useAppSelector((s) => s.builder.projectName);
  const projectStatus = useAppSelector((s) => s.builder.projectStatus);
  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const sources = useAppSelector((s) => s.artwork.sources);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);
  const faces = useAppSelector((s) => s.artwork.faces);

  // These refs track the last saved snapshot for diffing — they don't drive renders.
  const lastSavedProjectRef = useRef<Project | null>(null);
  const lastSavedPayloadRef = useRef<ProjectSavePayload | null>(null);
  const suppressDimSyncRef = useRef(false);

  /* ── Hydrate project state from API response ─────────────────── */

  const hydrateProject = useCallback(
    async (project: Project) => {
      suppressDimSyncRef.current = true;

      const workspaceSources: ArtworkSource[] =
        project.workspace?.sources.map((source) => ({
          id: source.id,
          dataUrl: source.url,
          fileName: source.fileName,
          mimeType: source.mimeType,
          sourceType: source.sourceType,
        })) ?? [];

      const renderedFaces = await renderProjectFaces(project);
      const hasEditableWorkspace = Boolean(project.workspace?.sources.length);

      const nextFaces = FACE_KEYS.reduce<Partial<Record<string, FaceAsset>>>((acc, face) => {
        const asset = project.workspace?.faceAssets[face];

        if (asset) {
          acc[face] = {
            sourceId: asset.sourceId,
            dataUrl: renderedFaces[face] ?? "",
            fileName: asset.fileName,
            sourceType: asset.sourceType,
            crop: normalizeCropSettings(asset.crop),
          };
          return acc;
        }

        if (!hasEditableWorkspace && project.faces[face]) {
          acc[face] = {
            sourceId: "",
            dataUrl: project.faces[face],
            fileName: `${face}.png`,
            sourceType: "image",
            crop: DEFAULT_CROP_SETTINGS,
          };
        }

        return acc;
      }, {});

      dispatch(
        hydrateBuilder({
          projectId: project.id,
          name: project.name,
          status: project.status,
          dimensions: normalizeDimensions(project.dimensions),
        }),
      );

      dispatch(
        hydrateArtwork({
          sources: workspaceSources,
          selectedSourceId:
            project.workspace?.selectedSourceId ?? workspaceSources[0]?.id ?? "",
          faces: nextFaces,
        }),
      );

      dispatch(clearShareUrl());

      lastSavedProjectRef.current = project;
      lastSavedPayloadRef.current = createSavedPayloadFromProject(project);
    },
    [dispatch],
  );

  /* ── Load project on mount ───────────────────────────────────── */

  useEffect(() => {
    if (!initialProjectId) return;

    let isMounted = true;

    async function loadProject() {
      dispatch(setIsProjectLoading(true));
      dispatch(setError(""));

      try {
        const project = await readProject(initialProjectId!);
        if (isMounted) {
          await hydrateProject(project);
          dispatch(
            setSaveStatus(project.status === "published" ? "published" : "saved"),
          );
        }
      } catch (loadError) {
        if (isMounted) {
          dispatch(setError(getErrorMessage(loadError, "Could not open this project.")));
        }
      } finally {
        if (isMounted) {
          dispatch(setIsProjectLoading(false));
        }
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [initialProjectId, dispatch, hydrateProject]);

  /* ── Save / create project ───────────────────────────────────── */

  const saveProject = useCallback(
    async (nextStatus?: ProjectStatus): Promise<Project | null> => {
      const statusToSave = nextStatus ?? projectStatus;
      dispatch(setIsProjectSaving(true));
      dispatch(setError(""));

      try {
        const liveState = {
          projectName,
          projectStatus: statusToSave,
          dimensions,
          sources: sources.map((s) => ({
            id: s.id,
            dataUrl: s.dataUrl,
            fileName: s.fileName,
            mimeType: s.mimeType,
            sourceType: s.sourceType,
          })),
          selectedSourceId,
          faces,
        };

        const fullPayload = createFullProjectPayload(liveState, statusToSave);

        if (projectId) {
          const patch = createProjectPatchPayload(fullPayload, lastSavedPayloadRef.current);
          if (isEmptyPatchPayload(patch)) {
            dispatch(
              setSaveStatus(lastSavedProjectRef.current?.status === "published" ? "published" : "saved"),
            );
            return lastSavedProjectRef.current;
          }

          const project = await updateProject(projectId, patch);
          await hydrateProject(project);
          return project;
        }

        const project = await createProject(fullPayload);
        await hydrateProject(project);

        // Update browser URL without a full navigation.
        window.history.replaceState(null, "", `/project/${project.id}/edit`);

        return project;
      } catch (saveError) {
        dispatch(setError(getErrorMessage(saveError, "Could not save this project.")));
        return null;
      } finally {
        dispatch(setIsProjectSaving(false));
      }
    },
    [
      dispatch,
      hydrateProject,
      projectId,
      projectName,
      projectStatus,
      dimensions,
      sources,
      selectedSourceId,
      faces,
    ],
  );

  return {
    saveProject,
    suppressDimSyncRef,
  };
}
