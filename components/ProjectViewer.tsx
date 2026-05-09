"use client";

import dynamic from "next/dynamic";
import { Box, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { Project } from "@/lib/carton";

const CartonStage = dynamic(() => import("@/components/CartonStage").then((mod) => mod.CartonStage), {
  ssr: false,
  loading: () => <div className="stage-loading">Loading shared preview</div>
});

export function ProjectViewer({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProject() {
      try {
        const response = await fetch(`/api/projects/${projectId}`);

        if (!response.ok) {
          throw new Error("This shared carton could not be found.");
        }

        const nextProject = (await response.json()) as Project;
        if (isMounted) {
          setProject(nextProject);
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
        ) : project ? (
          <CartonStage className="shared-stage" dimensions={project.dimensions} faces={project.faces} />
        ) : null}
      </section>
    </main>
  );
}
