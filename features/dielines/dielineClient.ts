import type { DielineTemplate, DielineTemplateListOptions, DielineTemplateStatus } from "@/domain/dielines";
import type { DielineGraph } from "@/domain/dieline/types";

export type DielineTemplateMutationPayload = {
  name?: string;
  status?: DielineTemplateStatus;
  source?: "template" | "svg-upload";
  fileName?: string;
  graph?: DielineGraph;
};

export type DielineListQuery = DielineTemplateListOptions & {
  signal?: AbortSignal;
};

export async function listDielines({ limit = 80, query = "", status = "all", signal }: DielineListQuery = {}): Promise<DielineTemplate[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    q: query,
    status,
  });
  const payload = await requestJson<{ templates?: DielineTemplate[] }>(`/api/dielines?${params.toString()}`, {
    cache: "no-store",
    signal,
  });

  return payload.templates ?? [];
}

export function readDieline(id: string, signal?: AbortSignal): Promise<DielineTemplate> {
  return requestJson<DielineTemplate>(`/api/dielines/${id}`, {
    cache: "no-store",
    signal,
  });
}

export function createDieline(payload: DielineTemplateMutationPayload): Promise<DielineTemplate> {
  return requestJson<DielineTemplate>("/api/dielines", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function updateDieline(id: string, payload: DielineTemplateMutationPayload): Promise<DielineTemplate> {
  return requestJson<DielineTemplate>(`/api/dielines/${id}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "PATCH",
  });
}

export async function deleteDieline(id: string): Promise<void> {
  await requestJson<{ ok?: boolean }>(`/api/dielines/${id}`, {
    method: "DELETE",
  });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}
