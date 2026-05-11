import type { Project } from "@/domain/packaging";
import { generateFoldingCartonGraph } from "@/domain/dieline/templates/foldingCartonGraph";

export function migrateProject(project: Project): Project {
  // If it already has faceAssets in the workspace, we still need to check if they are keyed by FaceKey
  // But wait, if they are keyed by legacy FaceKey, those keys happen to be strings!
  // However, we want to ensure dielineGraph exists if it's the default folding carton.
  
  const hasDielineGraph = !!project.workspace?.dieline?.graph;

  if (hasDielineGraph) {
    // Already has a custom graph. We assume the face IDs map correctly.
    // Ensure faces is a Record<string, string> (which it is, since TS is just a compiler thing)
    return project;
  }

  // It's a legacy project or a new default project.
  // Generate the default graph.
  const graph = generateFoldingCartonGraph(project.dimensions);
  
  // Attach legacy faces to the new dynamic graph.
  // The foldingCartonGraph generates faces with IDs: "front", "back", "top", "bottom", "left", "right".
  // So the legacy FaceKeys directly match the generated FaceIds!
  // We just need to make sure the workspace is fully populated and normalized.
  
  const nextProject: Project = { ...project };
  
  if (!nextProject.workspace) {
    nextProject.workspace = {
      sources: [],
      faceAssets: {},
    };
  }

  // Set the dieline graph in the workspace
  nextProject.workspace.dieline = {
    source: "template",
    templateId: "folding-carton",
    graph,
  };

  // Convert old project.faces into workspace.faceAssets if they are missing
  
  for (const face of Object.keys(project.faces || {})) {
    if (!nextProject.workspace.faceAssets[face] && project.faces?.[face]) {
      nextProject.workspace.faceAssets[face] = {
        sourceId: "", // Legacy projects without workspace don't have source IDs
        fileName: `${face}.png`,
        sourceType: "image",
        crop: {
          coordinates: null,
          transforms: { flip: { horizontal: false, vertical: false }, rotate: 0 }
        },
      };
    }
  }

  return nextProject;
}
