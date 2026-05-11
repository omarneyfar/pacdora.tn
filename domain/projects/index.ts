import type {
  CartonDimensions,
  Project,
  ProjectStatus,
  ProjectWorkspace,
  TemplateId,
} from "@/domain/packaging";

export {
  PROJECT_STATUSES,
  normalizeProjectStatus,
} from "@/domain/packaging";

export type {
  Project,
  ProjectArtworkSource,
  ProjectCropSettings,
  ProjectFaceAsset,
  ProjectStatus,
  ProjectWorkspace,
  TemplateId,
} from "@/domain/packaging";

export type ProjectPatch = Partial<{
  name: Project["name"];
  status: ProjectStatus;
  templateId: TemplateId;
  dimensions: Partial<CartonDimensions>;
  faces: Record<string, string | null>;
  workspace: ProjectWorkspace;
}>;

export type ProjectListOptions = {
  limit?: number;
  query?: string;
  status?: ProjectStatus | "all";
};
