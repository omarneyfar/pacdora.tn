"use client";

import dynamic from "next/dynamic";
import { Box, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { renderProjectFaces } from "@/features/artwork/artwork";
import { readProject } from "@/features/projects/projectClient";
import type { Project } from "@/domain/packaging";
import { migrateProject } from "@/utils/migrateProject";

const DielineCartonStage = dynamic(() => import("@/features/builder/DielineCartonStage").then((mod) => mod.DielineCartonStage), {
  ssr: false,
  loading: () => <div className="stage-loading">Loading shared preview</div>
});

export function ProjectViewer({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [faces, setFaces] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      try {
        const nextProject = await readProject(projectId);
        if (nextProject.status !== "published") {
          throw new Error("This carton is still a draft. Publish it before sharing with a client.");
        }

        const migratedProject = migrateProject(nextProject);
        const nextFaces = await renderProjectFaces(migratedProject);
        if (isMounted) {
          setProject(migratedProject);
          setFaces(nextFaces);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Could not load this shared carton.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  return (
    <main className="shared-page">
      <header className="shared-topbar">
        <div className="brand">
          <span className="brand-mark">
            <Box aria-hidden size={19} />
          </span>
          <div>
            <h1>FoldView</h1>
            <p>View-only carton preview</p>
          </div>
        </div>
      </header>

      <section className="shared-viewer">
        {isLoading ? (
          <div className="empty-state">
            <LoaderCircle aria-hidden className="spin" size={26} />
            Loading shared preview
          </div>
        ) : error ? (
          <div className="empty-state error-state">{error}</div>
        ) : project && project.workspace?.dieline?.graph ? (
          <DielineCartonStage className="shared-stage" graph={project.workspace.dieline.graph} faces={faces} />
        ) : null}
      </section>
    </main>
  );
}
