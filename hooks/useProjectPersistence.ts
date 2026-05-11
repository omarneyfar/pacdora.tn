"use client";

import { useCallback, useEffect, useRef } from "react";

import {
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
  resetBuilder,
  setIsProjectLoading,
  setIsProjectSaving,
  setSaveStatus,
} from "@/store/builderSlice";
import {
  hydrateArtwork,
  resetArtwork,
  type ArtworkSource,
  type FaceAsset,
} from "@/store/artworkSlice";
import { clearShareUrl, resetUi, setError } from "@/store/uiSlice";
import {
  createFullProjectPayload,
  createProjectPatchPayload,
  createSavedPayloadFromProject,
  getErrorMessage,
  isEmptyPatchPayload,
  type ProjectSavePayload,
} from "@/utils/projectPayload";
import { migrateProject } from "@/utils/migrateProject";

export function useProjectPersistence(initialProjectId?: string) {
  const dispatch = useAppDispatch();

  const projectId = useAppSelector((s) => s.builder.projectId);
  const projectName = useAppSelector((s) => s.builder.projectName);
  const projectStatus = useAppSelector((s) => s.builder.projectStatus);
  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const dielineSource = useAppSelector((s) => s.builder.dielineSource);
  const dielineTemplateId = useAppSelector((s) => s.builder.dielineTemplateId);
  const dielineTemplateName = useAppSelector((s) => s.builder.dielineTemplateName);
  const dielineFileName = useAppSelector((s) => s.builder.dielineFileName);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);
  const sources = useAppSelector((s) => s.artwork.sources);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);
  const faces = useAppSelector((s) => s.artwork.faces);

  const lastSavedProjectRef = useRef<Project | null>(null);
  const lastSavedPayloadRef = useRef<ProjectSavePayload | null>(null);
  const suppressDimSyncRef = useRef(false);

  const clearSavedSnapshot = useCallback(() => {
    lastSavedProjectRef.current = null;
    lastSavedPayloadRef.current = null;
  }, []);

  const resetBuilderSession = useCallback(() => {
    suppressDimSyncRef.current = true;
    clearSavedSnapshot();
    dispatch(resetBuilder());
    dispatch(resetArtwork());
    dispatch(resetUi());
  }, [clearSavedSnapshot, dispatch]);

  const hydrateProject = useCallback(
    async (project: Project) => {
      suppressDimSyncRef.current = true;

      const migratedProject = migrateProject(project);

      const workspaceSources: ArtworkSource[] =
        migratedProject.workspace?.sources.map((source) => ({
          id: source.id,
          dataUrl: source.url,
          fileName: source.fileName,
          mimeType: source.mimeType,
          sourceType: source.sourceType,
        })) ?? [];

      const renderedFaces = await renderProjectFaces(migratedProject);
      const hasEditableWorkspace = Boolean(migratedProject.workspace?.sources.length);

      const nextFaces: Record<string, FaceAsset> = {};
      const allFaceIds = new Set([
        ...Object.keys(migratedProject.workspace?.faceAssets || {}),
        ...Object.keys(migratedProject.faces || {})
      ]);

      for (const face of allFaceIds) {
        const asset = migratedProject.workspace?.faceAssets?.[face];

        if (asset) {
          nextFaces[face] = {
            sourceId: asset.sourceId,
            dataUrl: renderedFaces[face] ?? "",
            fileName: asset.fileName,
            sourceType: asset.sourceType,
            crop: normalizeCropSettings(asset.crop),
          };
        } else if (!hasEditableWorkspace && migratedProject.faces[face]) {
          nextFaces[face] = {
            sourceId: "",
            dataUrl: migratedProject.faces[face],
            fileName: `${face}.png`,
            sourceType: "image",
            crop: DEFAULT_CROP_SETTINGS,
          };
        }
      }

      dispatch(
        hydrateBuilder({
          projectId: migratedProject.id,
          name: migratedProject.name,
          status: migratedProject.status,
          dimensions: normalizeDimensions(migratedProject.dimensions),
          dieline: migratedProject.workspace?.dieline,
        }),
      );

      dispatch(
        hydrateArtwork({
          sources: workspaceSources,
          selectedSourceId:
            migratedProject.workspace?.selectedSourceId ?? workspaceSources[0]?.id ?? "",
          faces: nextFaces,
        }),
      );

      dispatch(clearShareUrl());

      lastSavedProjectRef.current = migratedProject;
      lastSavedPayloadRef.current = createSavedPayloadFromProject(migratedProject);
    },
    [dispatch],
  );

  useEffect(() => {
    resetBuilderSession();

    if (!initialProjectId) {
      return;
    }

    let isMounted = true;
    const loadProjectId = initialProjectId;

    async function loadProject() {
      dispatch(setIsProjectLoading(true));
      dispatch(setError(""));

      try {
        const project = await readProject(loadProjectId);
        if (isMounted) {
          await hydrateProject(project);
          dispatch(setSaveStatus(project.status === "published" ? "published" : "saved"));
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
  }, [dispatch, hydrateProject, initialProjectId, resetBuilderSession]);

  const saveProject = useCallback(
    async (nextStatus?: ProjectStatus): Promise<Project | null> => {
      const statusToSave = nextStatus ?? projectStatus;
      dispatch(setIsProjectSaving(true));
      dispatch(setError(""));

      try {
        const fullPayload = createFullProjectPayload(
          {
            projectName,
            projectStatus: statusToSave,
            dimensions,
            dielineSource,
            dielineTemplateId,
            dielineTemplateName,
            dielineFileName,
            dielineGraph,
            sources: sources.map((source) => ({
              id: source.id,
              dataUrl: source.dataUrl,
              fileName: source.fileName,
              mimeType: source.mimeType,
              sourceType: source.sourceType,
            })),
            selectedSourceId,
            faces,
          },
          statusToSave,
        );

        if (projectId) {
          const patch = createProjectPatchPayload(fullPayload, lastSavedPayloadRef.current);

          if (isEmptyPatchPayload(patch)) {
            dispatch(
              setSaveStatus(
                lastSavedProjectRef.current?.status === "published" ? "published" : "saved",
              ),
            );
            return lastSavedProjectRef.current;
          }

          const project = await updateProject(projectId, patch);
          await hydrateProject(project);
          return project;
        }

        const project = await createProject(fullPayload);
        await hydrateProject(project);
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
      dimensions,
      dielineFileName,
      dielineGraph,
      dielineSource,
      dielineTemplateId,
      dielineTemplateName,
      dispatch,
      faces,
      hydrateProject,
      projectId,
      projectName,
      projectStatus,
      selectedSourceId,
      sources,
    ],
  );

  return {
    saveProject,
    suppressDimSyncRef,
  };
}
