"use client";

import Link from "next/link";
import { Box, Edit3, FileUp, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DIELINE_CATEGORY_ORDER,
  getDielineCategory,
  getDielineCategoryLabel,
  getDielineFamilyLabel,
  getDielineParts,
} from "@/domain/dieline/structure";
import type { DielineCategory } from "@/domain/dieline/types";
import type { DielineTemplate, DielineTemplateStatus } from "@/domain/dielines";
import { deleteDieline, listDielines, updateDieline } from "./dielineClient";
import { DielinePreview } from "./DielinePreview";

type StatusFilter = "all" | DielineTemplateStatus;
type CategoryFilter = "all" | DielineCategory;

export function DielinesDashboard() {
  const [templates, setTemplates] = useState<DielineTemplate[]>([]);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTemplates = useCallback(async (searchQuery: string, status: StatusFilter, signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const nextTemplates = await listDielines({
        limit: 80,
        query: searchQuery.trim(),
        status,
        signal,
      });

      setTemplates(nextTemplates);
      setNameDrafts(Object.fromEntries(nextTemplates.map((template) => [template.id, template.name])));
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Could not load dielines.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const visibleTemplates = useMemo(
    () => templates.filter((template) => matchesFilters(template, query, statusFilter, categoryFilter)),
    [categoryFilter, query, statusFilter, templates],
  );
  const categoryCounts = useMemo(() => getCategoryCounts(templates), [templates]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      loadTemplates(query, statusFilter, controller.signal);
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadTemplates, query, statusFilter]);

  async function updateSavedDieline(template: DielineTemplate, patch: Partial<Pick<DielineTemplate, "name" | "status">>) {
    setActionId(template.id);
    setError("");
    setNotice("");

    try {
      const updated = await updateDieline(template.id, patch);
      setTemplates((current) =>
        current.flatMap((candidate) => {
          if (candidate.id !== updated.id) {
            return [candidate];
          }

          return matchesFilters(updated, query, statusFilter, categoryFilter) ? [updated] : [];
        }),
      );
      setNameDrafts((current) => ({ ...current, [updated.id]: updated.name }));
      setNotice(`Saved "${updated.name}".`);
    } catch (updateError) {
      setNameDrafts((current) => ({ ...current, [template.id]: template.name }));
      setError(updateError instanceof Error ? updateError.message : "Could not update this dieline.");
    } finally {
      setActionId("");
    }
  }

  function saveName(template: DielineTemplate, rawName = nameDrafts[template.id] ?? template.name) {
    const nextName = rawName.trim();

    if (!nextName || nextName === template.name) {
      setNameDrafts((current) => ({ ...current, [template.id]: template.name }));
      return;
    }

    updateSavedDieline(template, { name: nextName });
  }

  async function deleteSavedDieline(template: DielineTemplate) {
    const confirmed = window.confirm(`Delete "${template.name}" from the dieline library?`);
    if (!confirmed) {
      return;
    }

    setActionId(template.id);
    setError("");
    setNotice("");

    try {
      await deleteDieline(template.id);
      setTemplates((current) => current.filter((candidate) => candidate.id !== template.id));
      setNotice(`Deleted "${template.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this dieline.");
    } finally {
      setActionId("");
    }
  }

  return (
    <main className="projects-page dielines-page">
      <header className="topbar projects-topbar">
        <div className="brand">
          <span className="brand-mark">
            <Box aria-hidden size={19} />
          </span>
          <div className="brand-copy">
            <h1>FoldView</h1>
            <p>Dieline library</p>
          </div>
        </div>
        <div className="header-actions">
          <Link className="secondary-button dashboard-header-button" href="/projects">
            Projects
          </Link>
          <Link className="primary-button dashboard-header-button" href="/dielines/new">
            <FileUp aria-hidden size={18} />
            Import dieline
          </Link>
          <button className="secondary-button dashboard-header-button" disabled={isLoading} type="button" onClick={() => loadTemplates(query, statusFilter)}>
            {isLoading ? <LoaderCircle aria-hidden className="spin" size={18} /> : <RefreshCw aria-hidden size={18} />}
            Refresh
          </button>
        </div>
      </header>

      <section className="projects-main" aria-label="Dieline library">
        <div className="projects-toolbar">
          <div>
            <span className="eyebrow">Reusable dielines</span>
            <h2>Prepare once, reuse everywhere</h2>
          </div>
          <label className="projects-search">
            <Search aria-hidden size={18} />
            <input aria-label="Search dielines" placeholder="Search by name, file, or ID" value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
          </label>
          <div className="project-status-filter" aria-label="Filter dielines by status">
            {(["all", "draft", "ready"] as const).map((status) => (
              <button className={statusFilter === status ? "is-active" : ""} key={status} type="button" onClick={() => setStatusFilter(status)}>
                {getStatusLabel(status)}
              </button>
            ))}
          </div>
          <div className="project-status-filter" aria-label="Filter dielines by category">
            <button className={categoryFilter === "all" ? "is-active" : ""} type="button" onClick={() => setCategoryFilter("all")}>
              All categories
            </button>
            {DIELINE_CATEGORY_ORDER.filter((category) => categoryCounts.get(category)).map((category) => (
              <button className={categoryFilter === category ? "is-active" : ""} key={category} type="button" onClick={() => setCategoryFilter(category)}>
                {getDielineCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="error-banner projects-message">{error}</div> : null}
        {notice ? <div className="success-banner projects-message">{notice}</div> : null}

        {isLoading ? (
          <div className="projects-empty">
            <LoaderCircle aria-hidden className="spin" size={26} />
            Loading dielines
          </div>
        ) : visibleTemplates.length === 0 ? (
          <div className="projects-empty">
            <strong>No dielines yet</strong>
            <span>Import an SVG, adjust the filters, or prepare a category-backed template.</span>
            <Link className="primary-button projects-empty-action" href="/dielines/new">
              <Plus aria-hidden size={18} />
              Import dieline
            </Link>
          </div>
        ) : (
          <div className="dieline-template-list">
            {visibleTemplates.map((template) => (
              <article className="dieline-template-row" key={template.id}>
                <DielinePreview className="dieline-template-thumb" graph={template.graph} />
                <div className="project-row-main">
                  <div className="project-row-title">
                    <input
                      aria-label={`Dieline name for ${template.name}`}
                      className="project-name-editor"
                      disabled={Boolean(actionId)}
                      value={nameDrafts[template.id] ?? template.name}
                      onBlur={(event) => saveName(template, event.currentTarget.value)}
                      onChange={(event) => setNameDrafts((current) => ({ ...current, [template.id]: event.currentTarget.value }))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") {
                          setNameDrafts((current) => ({ ...current, [template.id]: template.name }));
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <DielineStatusControl disabled={Boolean(actionId)} value={template.status} onChange={(status) => updateSavedDieline(template, { status })} />
                    <span>{template.id}</span>
                  </div>
                  <div className="project-row-meta">
                    <span>{getDielineCategoryLabel(getDielineCategory(template.graph))}</span>
                    <span>{getDielineFamilyLabel(template.graph)}</span>
                    <span>{template.graph.faces.length} faces</span>
                    <span>{getDielineParts(template.graph).length} parts</span>
                    <span>{template.graph.faces.filter((face) => face.artworkEnabled).length} artwork zones</span>
                    <span>{template.fileName ?? template.source}</span>
                    <span>Updated {formatDate(template.updatedAt)}</span>
                  </div>
                </div>
                <div className="project-row-actions">
                  <Link className="secondary-button project-action-button" href={`/dielines/${template.id}/edit`}>
                    <Edit3 aria-hidden size={17} />
                    Edit
                  </Link>
                  <a className="secondary-button project-action-button" href={`/api/dielines/${template.id}/export?format=svg`}>
                    SVG
                  </a>
                  <a className="secondary-button project-action-button" href={`/api/dielines/${template.id}/export?format=dxf`}>
                    DXF
                  </a>
                  {template.status === "ready" ? (
                    <Link className="primary-button project-action-button" href={`/?dielineId=${template.id}`}>
                      <Plus aria-hidden size={17} />
                      Use
                    </Link>
                  ) : (
                    <button className="primary-button project-action-button" disabled type="button">
                      <Plus aria-hidden size={17} />
                      Use
                    </button>
                  )}
                  <button className="icon-button danger-button" disabled={Boolean(actionId)} title="Delete dieline" type="button" onClick={() => deleteSavedDieline(template)}>
                    {actionId === template.id ? <LoaderCircle aria-hidden className="spin" size={17} /> : <Trash2 aria-hidden size={17} />}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function DielineStatusControl({ disabled, value, onChange }: { disabled: boolean; value: DielineTemplateStatus; onChange: (status: DielineTemplateStatus) => void }) {
  return (
    <div className="project-row-status-control" aria-label="Dieline status">
      {(["draft", "ready"] as const).map((status) => (
        <button className={value === status ? `is-active status-${status}` : ""} disabled={disabled || value === status} key={status} type="button" onClick={() => onChange(status)}>
          {getStatusLabel(status)}
        </button>
      ))}
    </div>
  );
}

function getStatusLabel(status: StatusFilter): string {
  if (status === "all") return "All";
  return status === "ready" ? "Ready" : "Draft";
}

function matchesFilters(
  template: DielineTemplate,
  query: string,
  statusFilter: StatusFilter,
  categoryFilter: CategoryFilter,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (statusFilter !== "all" && template.status !== statusFilter) return false;
  if (categoryFilter !== "all" && getDielineCategory(template.graph) !== categoryFilter) return false;

  if (!normalizedQuery) return true;

  const structureText = [
    getDielineCategoryLabel(getDielineCategory(template.graph)),
    getDielineFamilyLabel(template.graph),
    ...getDielineParts(template.graph).map((part) => part.label),
  ].join(" ").toLowerCase();

  return (
    template.name.toLowerCase().includes(normalizedQuery) ||
    template.id.toLowerCase().includes(normalizedQuery) ||
    structureText.includes(normalizedQuery)
  );
}

function getCategoryCounts(templates: DielineTemplate[]): Map<DielineCategory, number> {
  const counts = new Map<DielineCategory, number>();

  for (const template of templates) {
    const category = getDielineCategory(template.graph);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return counts;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
