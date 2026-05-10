"use client";

import Link from "next/link";
import {
  Box,
  Copy,
  Edit3,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { Project, ProjectStatus } from "@/lib/carton";

type ProjectsResponse = {
  projects?: Project[];
  error?: string;
};

type StatusFilter = "all" | ProjectStatus;

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [actionProjectId, setActionProjectId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProjects = useCallback(async (searchQuery: string, status: StatusFilter, signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ limit: "80" });
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      if (status !== "all") {
        params.set("status", status);
      }

      const response = await fetch(`/api/projects?${params.toString()}`, {
        cache: "no-store",
        signal
      });
      const payload = (await response.json()) as ProjectsResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load projects.");
      }

      setProjects(payload.projects ?? []);
      setNameDrafts(Object.fromEntries((payload.projects ?? []).map((project) => [project.id, project.name])));
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") {
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Could not load projects.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      loadProjects(query, statusFilter, controller.signal);
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadProjects, query, statusFilter]);

  async function updateSavedProject(project: Project, patch: Partial<Pick<Project, "name" | "status">>) {
    setActionProjectId(project.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(patch)
      });
      const updatedProject = (await response.json()) as Project & { error?: string };

      if (!response.ok) {
        throw new Error(updatedProject.error ?? "Could not update this project.");
      }

      setProjects((current) =>
        current.flatMap((candidate) => {
          if (candidate.id !== updatedProject.id) {
            return [candidate];
          }

          return matchesProjectFilters(updatedProject, query, statusFilter) ? [updatedProject] : [];
        })
      );
      setNameDrafts((current) => ({
        ...current,
        [updatedProject.id]: updatedProject.name
      }));
      setNotice(`Saved "${updatedProject.name}".`);
    } catch (updateError) {
      setNameDrafts((current) => ({
        ...current,
        [project.id]: project.name
      }));
      setError(updateError instanceof Error ? updateError.message : "Could not update this project.");
    } finally {
      setActionProjectId("");
    }
  }

  function saveProjectName(project: Project) {
    const nextName = (nameDrafts[project.id] ?? project.name).trim();

    if (!nextName) {
      setNameDrafts((current) => ({
        ...current,
        [project.id]: project.name
      }));
      return;
    }

    if (nextName === project.name) {
      return;
    }

    updateSavedProject(project, { name: nextName });
  }

  async function duplicateSavedProject(project: Project) {
    setActionProjectId(project.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
      const copyProject = (await response.json()) as Project & { error?: string };

      if (!response.ok) {
        throw new Error(copyProject.error ?? "Could not duplicate this project.");
      }

      setProjects((current) => [copyProject, ...current.filter((candidate) => candidate.id !== copyProject.id)]);
      setNameDrafts((current) => ({
        ...current,
        [copyProject.id]: copyProject.name
      }));
      setNotice(`Duplicated "${project.name}".`);
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Could not duplicate this project.");
    } finally {
      setActionProjectId("");
    }
  }

  async function deleteSavedProject(project: Project) {
    const confirmed = window.confirm(`Delete "${project.name}" and its stored artwork?`);
    if (!confirmed) {
      return;
    }

    setActionProjectId(project.id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not delete this project.");
      }

      setProjects((current) => current.filter((candidate) => candidate.id !== project.id));
      setNameDrafts((current) => {
        const next = { ...current };
        delete next[project.id];
        return next;
      });
      setNotice(`Deleted "${project.name}".`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this project.");
    } finally {
      setActionProjectId("");
    }
  }

  return (
    <main className="projects-page">
      <header className="topbar projects-topbar">
        <div className="brand">
          <span className="brand-mark">
            <Box aria-hidden size={19} />
          </span>
          <div className="brand-copy">
            <h1>FoldView</h1>
            <p>Saved projects</p>
          </div>
        </div>
        <div className="header-actions">
          <Link className="secondary-button dashboard-header-button" href="/">
            <Plus aria-hidden size={18} />
            New project
          </Link>
          <button
            className="secondary-button dashboard-header-button"
            disabled={isLoading}
            type="button"
            onClick={() => loadProjects(query, statusFilter)}
          >
            {isLoading ? <LoaderCircle aria-hidden className="spin" size={18} /> : <RefreshCw aria-hidden size={18} />}
            Refresh
          </button>
        </div>
      </header>

      <section className="projects-main" aria-label="Saved projects">
        <div className="projects-toolbar">
          <div>
            <span className="eyebrow">Project library</span>
            <h2>Manage saved boxes</h2>
          </div>
          <label className="projects-search">
            <Search aria-hidden size={18} />
            <input
              aria-label="Search projects"
              placeholder="Search by project name or ID"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
          <div className="project-status-filter" aria-label="Filter projects by status">
            {(["all", "draft", "published"] as const).map((status) => (
              <button
                className={statusFilter === status ? "is-active" : ""}
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {getStatusFilterLabel(status)}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="error-banner projects-message">{error}</div> : null}
        {notice ? <div className="success-banner projects-message">{notice}</div> : null}

        {isLoading ? (
          <div className="projects-empty">
            <LoaderCircle aria-hidden className="spin" size={26} />
            Loading saved projects
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty">
            <strong>No saved projects found</strong>
            <span>{query ? "Try another search." : "Create and save a carton to see it here."}</span>
            <Link className="primary-button projects-empty-action" href="/">
              <Plus aria-hidden size={18} />
              New project
            </Link>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map((project) => (
              <article className="project-row" key={project.id}>
                <div className="project-row-preview" aria-hidden>
                  <Box size={24} />
                </div>
                <div className="project-row-main">
                  <div className="project-row-title">
                    <input
                      aria-label={`Project name for ${project.name}`}
                      className="project-name-editor"
                      disabled={Boolean(actionProjectId)}
                      value={nameDrafts[project.id] ?? project.name}
                      onBlur={() => saveProjectName(project)}
                      onChange={(event) =>
                        setNameDrafts((current) => ({
                          ...current,
                          [project.id]: event.currentTarget.value
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }

                        if (event.key === "Escape") {
                          setNameDrafts((current) => ({
                            ...current,
                            [project.id]: project.name
                          }));
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <ProjectStatusControl
                      disabled={Boolean(actionProjectId)}
                      value={project.status}
                      onChange={(status) => updateSavedProject(project, { status })}
                    />
                    <span>{project.id}</span>
                  </div>
                  <div className="project-row-meta">
                    <span>{formatDimensions(project)}</span>
                    <span>{getAssignedFaceCount(project)}/6 faces</span>
                    <span>{getSourceCount(project)} source images</span>
                    <span>Updated {formatDate(project.updatedAt)}</span>
                  </div>
                </div>
                <div className="project-row-actions">
                  <Link className="secondary-button project-action-button" href={`/project/${project.id}/edit`}>
                    <Edit3 aria-hidden size={17} />
                    Edit
                  </Link>
                  {project.status === "published" ? (
                    <Link className="icon-button" href={`/view/${project.id}`} target="_blank" title="Open share viewer">
                      <ExternalLink aria-hidden size={17} />
                    </Link>
                  ) : (
                    <button className="icon-button" disabled title="Publish before sharing" type="button">
                      <ExternalLink aria-hidden size={17} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    disabled={Boolean(actionProjectId)}
                    title="Duplicate project"
                    type="button"
                    onClick={() => duplicateSavedProject(project)}
                  >
                    {actionProjectId === project.id ? (
                      <LoaderCircle aria-hidden className="spin" size={17} />
                    ) : (
                      <Copy aria-hidden size={17} />
                    )}
                  </button>
                  <button
                    className="icon-button danger-button"
                    disabled={Boolean(actionProjectId)}
                    title="Delete project"
                    type="button"
                    onClick={() => deleteSavedProject(project)}
                  >
                    <Trash2 aria-hidden size={17} />
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

function ProjectStatusControl({
  disabled,
  value,
  onChange
}: {
  disabled: boolean;
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
}) {
  return (
    <div className="project-row-status-control" aria-label="Project status">
      {(["draft", "published"] as const).map((status) => (
        <button
          className={value === status ? `is-active status-${status}` : ""}
          disabled={disabled || value === status}
          key={status}
          type="button"
          onClick={() => onChange(status)}
        >
          {getProjectStatusLabel(status)}
        </button>
      ))}
    </div>
  );
}

function formatDimensions(project: Project): string {
  return `${project.dimensions.width} x ${project.dimensions.depth} x ${project.dimensions.height} mm`;
}

function getAssignedFaceCount(project: Project): number {
  const workspaceCount = Object.keys(project.workspace?.faceAssets ?? {}).length;
  const legacyCount = Object.keys(project.faces ?? {}).length;
  return Math.max(workspaceCount, legacyCount);
}

function getSourceCount(project: Project): number {
  return project.workspace?.sources.length ?? 0;
}

function getStatusFilterLabel(status: StatusFilter): string {
  if (status === "all") {
    return "All";
  }

  return getProjectStatusLabel(status);
}

function getProjectStatusLabel(status: ProjectStatus): string {
  return status === "published" ? "Published" : "Draft";
}

function matchesProjectFilters(project: Project, query: string, statusFilter: StatusFilter): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (statusFilter !== "all" && project.status !== statusFilter) {
    return false;
  }

  return !normalizedQuery || project.name.toLowerCase().includes(normalizedQuery) || project.id.toLowerCase().includes(normalizedQuery);
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
