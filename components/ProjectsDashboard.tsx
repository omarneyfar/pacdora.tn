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

import type { Project } from "@/lib/carton";

type ProjectsResponse = {
  projects?: Project[];
  error?: string;
};

export function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionProjectId, setActionProjectId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProjects = useCallback(async (searchQuery: string, signal?: AbortSignal) => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ limit: "80" });
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
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
      loadProjects(query, controller.signal);
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [loadProjects, query]);

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
            onClick={() => loadProjects(query)}
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
                    <h3>{project.name}</h3>
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
                  <Link className="icon-button" href={`/view/${project.id}`} target="_blank" title="Open share viewer">
                    <ExternalLink aria-hidden size={17} />
                  </Link>
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
