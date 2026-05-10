import {
  FACE_KEYS,
  FOLDING_CARTON_TEMPLATE_ID,
  normalizeDimensions,
  type CartonDimensions,
  type FaceKey,
  type Project,
  type ProjectDieline,
  type ProjectStatus,
  type TemplateId,
} from "@/domain/packaging";

import { normalizeCropSettings, type CropSettings } from "@/features/artwork/artwork";

/* ── Payload types ────────────────────────────────────────────── */

export type SourcePayload = {
  id: string;
  dataUrl: string;
  fileName: string;
  mimeType?: string;
  sourceType: "image" | "pdf";
};

export type FacePayload = {
  sourceId: string;
  fileName: string;
  sourceType: "image" | "pdf";
  crop: CropSettings;
};

export type ProjectSavePayload = {
  name: string;
  status: ProjectStatus;
  templateId: TemplateId;
  dimensions: CartonDimensions;
  workspace: {
    sources: SourcePayload[];
    selectedSourceId: string;
    faceAssets: Partial<Record<FaceKey, FacePayload>>;
    dieline: ProjectDieline | null;
  };
};

export type ProjectPatchPayload = {
  name?: string;
  status?: ProjectStatus;
  templateId?: TemplateId;
  dimensions?: CartonDimensions;
  workspace?: {
    sources?: SourcePayload[];
    selectedSourceId?: string | null;
    faceAssets?: Partial<Record<FaceKey, FacePayload | null>>;
    dieline?: ProjectDieline | null;
  };
};

/* ── Build full payload from live state ───────────────────────── */

export type LiveProjectState = {
  projectName: string;
  projectStatus: ProjectStatus;
  dimensions: CartonDimensions;
  sources: SourcePayload[];
  selectedSourceId: string;
  faces: Partial<Record<FaceKey, { sourceId: string; fileName: string; sourceType: "image" | "pdf"; crop: CropSettings } | undefined>>;
  dielineSource: "template" | "svg-upload";
  dielineFileName: string;
  dielineGraph: ProjectDieline["graph"] | null;
};

export function createFullProjectPayload(
  state: LiveProjectState,
  statusOverride?: ProjectStatus,
): ProjectSavePayload {
  const status = statusOverride ?? state.projectStatus;

  return {
    name: state.projectName,
    status,
    templateId: FOLDING_CARTON_TEMPLATE_ID,
    dimensions: state.dimensions,
    workspace: {
      sources: state.sources.map((source) => ({
        id: source.id,
        dataUrl: source.dataUrl,
        fileName: source.fileName,
        mimeType: source.mimeType,
        sourceType: source.sourceType,
      })),
      selectedSourceId: state.selectedSourceId,
      dieline:
        state.dielineSource === "svg-upload" && state.dielineGraph
          ? {
              source: "svg-upload",
              ...(state.dielineFileName ? { fileName: state.dielineFileName } : {}),
              graph: state.dielineGraph,
            }
          : null,
      faceAssets: Object.fromEntries(
        FACE_KEYS.flatMap((face) => {
          const asset = state.faces[face];
          if (!asset?.sourceId) return [];

          return [[
            face,
            {
              sourceId: asset.sourceId,
              fileName: asset.fileName,
              sourceType: asset.sourceType,
              crop: asset.crop,
            },
          ]];
        }),
      ),
    },
  };
}

/* ── Build patch payload (only changed fields) ────────────────── */

export function createProjectPatchPayload(
  current: ProjectSavePayload,
  saved: ProjectSavePayload | null,
): ProjectPatchPayload {
  if (!saved) return current;

  const patch: ProjectPatchPayload = {};

  if (current.name !== saved.name) patch.name = current.name;
  if (current.status !== saved.status) patch.status = current.status;
  if (current.templateId !== saved.templateId) patch.templateId = current.templateId;
  if (!sameJson(current.dimensions, saved.dimensions)) patch.dimensions = current.dimensions;

  const workspacePatch: NonNullable<ProjectPatchPayload["workspace"]> = {};

  const changedSources = current.workspace.sources.filter((source) => {
    const savedSource = saved.workspace.sources.find((c) => c.id === source.id);
    return !savedSource || !sameJson(source, savedSource);
  });

  if (changedSources.length > 0) workspacePatch.sources = changedSources;
  if (current.workspace.selectedSourceId !== saved.workspace.selectedSourceId) {
    workspacePatch.selectedSourceId = current.workspace.selectedSourceId || null;
  }

  const changedFaceAssets: Partial<Record<FaceKey, FacePayload | null>> = {};
  for (const face of FACE_KEYS) {
    const currentAsset = current.workspace.faceAssets[face];
    const savedAsset = saved.workspace.faceAssets[face];
    if (!sameJson(currentAsset ?? null, savedAsset ?? null)) {
      changedFaceAssets[face] = currentAsset ?? null;
    }
  }

  if (Object.keys(changedFaceAssets).length > 0) workspacePatch.faceAssets = changedFaceAssets;
  if (!sameJson(current.workspace.dieline, saved.workspace.dieline)) {
    workspacePatch.dieline = current.workspace.dieline;
  }
  if (Object.keys(workspacePatch).length > 0) patch.workspace = workspacePatch;

  return patch;
}

/* ── Build saved-state snapshot from a hydrated project ────────── */

export function createSavedPayloadFromProject(project: Project): ProjectSavePayload {
  const sources: SourcePayload[] =
    project.workspace?.sources.map((source) => ({
      id: source.id,
      dataUrl: source.url,
      fileName: source.fileName,
      mimeType: source.mimeType,
      sourceType: source.sourceType,
    })) ?? [];

  return {
    name: project.name,
    status: project.status,
    templateId: project.templateId ?? FOLDING_CARTON_TEMPLATE_ID,
    dimensions: normalizeDimensions(project.dimensions),
    workspace: {
      sources,
      selectedSourceId: project.workspace?.selectedSourceId ?? sources[0]?.id ?? "",
      dieline: project.workspace?.dieline ?? null,
      faceAssets: Object.fromEntries(
        FACE_KEYS.flatMap((face) => {
          const asset = project.workspace?.faceAssets[face];
          if (!asset) return [];

          return [[
            face,
            {
              sourceId: asset.sourceId,
              fileName: asset.fileName,
              sourceType: asset.sourceType,
              crop: normalizeCropSettings(asset.crop),
            },
          ]];
        }),
      ),
    },
  };
}

/* ── Helpers ──────────────────────────────────────────────────── */

export function isEmptyPatchPayload(payload: ProjectPatchPayload): boolean {
  return Object.keys(payload).length === 0;
}

export function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createArtworkId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `artwork-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getErrorMessage(error: unknown, fallback = "An unknown error occurred."): string {
  return error instanceof Error ? error.message : fallback;
}
