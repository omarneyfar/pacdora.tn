import type { CartonDimensions, Project, ProjectStatus, TemplateId } from "@/domain/packaging";

export type ProjectMutationPayload = {
  name?: string;
  status?: ProjectStatus;
  templateId?: TemplateId;
  dimensions?: Partial<CartonDimensions>;
  faces?: Record<string, string | null>;
  workspace?: unknown;
};

export type ProjectListQuery = {
  limit?: number;
  query?: string;
  status?: ProjectStatus | "all";
  signal?: AbortSignal;
};

export async function listProjects({ limit = 80, query = "", status = "all", signal }: ProjectListQuery = {}): Promise<Project[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    q: query,
    status
  });
  const payload = await requestJson<{ projects?: Project[] }>(`/api/projects?${params.toString()}`, {
    cache: "no-store",
    signal
  });

  return payload.projects ?? [];
}

export function readProject(id: string, signal?: AbortSignal): Promise<Project> {
  return requestJson<Project>(`/api/projects/${id}`, {
    cache: "no-store",
    signal
  });
}

export function createProject(payload: ProjectMutationPayload): Promise<Project> {
  return requestJson<Project>("/api/projects", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

export function updateProject(id: string, payload: ProjectMutationPayload): Promise<Project> {
  return requestJson<Project>(`/api/projects/${id}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    },
    method: "PATCH"
  });
}

export function duplicateProject(id: string): Promise<Project> {
  return requestJson<Project>(`/api/projects/${id}/duplicate`, {
    method: "POST"
  });
}

export async function deleteProject(id: string): Promise<void> {
  await requestJson<{ ok?: boolean }>(`/api/projects/${id}`, {
    method: "DELETE"
  });
}

export function publishProject(id: string, payload: ProjectMutationPayload = {}): Promise<Project> {
  return updateProject(id, { ...payload, status: "published" });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}
