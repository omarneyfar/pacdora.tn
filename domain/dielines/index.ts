import type { DielineGraph } from "@/domain/dieline/types";

export const DIELINE_TEMPLATE_STATUSES = ["draft", "ready"] as const;
export const DIELINE_TEMPLATE_SOURCES = ["template", "svg-upload"] as const;

export type DielineTemplateStatus = (typeof DIELINE_TEMPLATE_STATUSES)[number];
export type DielineTemplateSource = (typeof DIELINE_TEMPLATE_SOURCES)[number];

export type DielineTemplate = {
  id: string;
  name: string;
  status: DielineTemplateStatus;
  source: DielineTemplateSource;
  fileName?: string;
  graph: DielineGraph;
  createdAt: string;
  updatedAt: string;
};

export type DielineTemplateListOptions = {
  limit?: number;
  query?: string;
  status?: DielineTemplateStatus | "all";
};

export function normalizeDielineTemplateStatus(
  value: unknown,
  fallback: DielineTemplateStatus = "draft"
): DielineTemplateStatus {
  return DIELINE_TEMPLATE_STATUSES.includes(value as DielineTemplateStatus)
    ? (value as DielineTemplateStatus)
    : fallback;
}

export function normalizeDielineTemplateSource(
  value: unknown,
  fallback: DielineTemplateSource = "svg-upload"
): DielineTemplateSource {
  return DIELINE_TEMPLATE_SOURCES.includes(value as DielineTemplateSource)
    ? (value as DielineTemplateSource)
    : fallback;
}
