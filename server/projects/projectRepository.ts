import type { Project, ProjectListOptions, ProjectPatch } from "@/domain/projects";

export type ProjectRepository = {
  create(project: Project): Promise<Project>;
  update(id: string, patch: ProjectPatch): Promise<Project | null>;
  findById(id: string): Promise<Project | null>;
  list(options: ProjectListOptions): Promise<Project[]>;
  delete(id: string): Promise<boolean>;
};
