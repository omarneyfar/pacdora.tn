import type { DielineCrease, DielineFace, DielineFaceNode } from "../../types";
import type { ClosureSpec, FoldingCartonRecipe } from "./types";

/**
 * Build a DielineFaceNode tree from the recipe structure.
 *
 * Algorithm:
 * 1. Root = the top closure's tuck panel (typically "front")
 * 2. Body panels chain outward from root in both directions
 * 3. Closure faces attach to their parent body panel
 * 4. Glue tab attaches to its specified body panel
 */
export function buildFaceTree(
  recipe: FoldingCartonRecipe,
  allFaces: DielineFace[],
  creases: DielineCrease[],
): DielineFaceNode[] {
  const faceIdSet = new Set(allFaces.map((f) => f.id));
  const creaseIndex = new Map<string, DielineCrease>();
  for (const c of creases) {
    creaseIndex.set(`${c.faceA}|${c.faceB}`, c);
    creaseIndex.set(`${c.faceB}|${c.faceA}`, c);
  }

  const { panelOrder } = recipe.body;
  const rootPanel = recipe.topClosure.tuckPanel ?? panelOrder[0];
  const rootIndex = panelOrder.indexOf(rootPanel);

  function findCreaseId(faceA: string, faceB: string): string | null {
    return creaseIndex.get(`${faceA}|${faceB}`)?.id ?? null;
  }

  function closureChildren(panelId: string): DielineFaceNode[] {
    const children: DielineFaceNode[] = [];

    // Top closure faces for this panel
    addClosureFace(children, panelId, recipe.topClosure, "top");
    // Bottom closure faces for this panel
    addClosureFace(children, panelId, recipe.bottomClosure, "bottom");

    return children;
  }

  function addClosureFace(children: DielineFaceNode[], panelId: string, closure: ClosureSpec, position: "top" | "bottom") {
    if (closure.tuckPanel === panelId) {
      const faceId = `${position}-tuck`;
      if (faceIdSet.has(faceId)) {
        const creaseId = findCreaseId(panelId, faceId);
        if (creaseId) children.push({ faceId, creaseId, children: [] });
      }
    }
    if (closure.dustPanels?.includes(panelId)) {
      const faceId = `${position}-dust-${panelId}`;
      if (faceIdSet.has(faceId)) {
        const creaseId = findCreaseId(panelId, faceId);
        if (creaseId) children.push({ faceId, creaseId, children: [] });
      }
    }
    if (closure.panelFlaps?.includes(panelId)) {
      const faceId = `${position}-panel`;
      if (faceIdSet.has(faceId)) {
        const creaseId = findCreaseId(panelId, faceId);
        if (creaseId) children.push({ faceId, creaseId, children: [] });
      }
    }
  }

  // Build the tree outward from the root panel
  function buildBranch(startIndex: number, direction: -1 | 1, parentPanelId: string): DielineFaceNode[] {
    const nodes: DielineFaceNode[] = [];
    const currentIndex = startIndex;

    while (currentIndex >= 0 && currentIndex < panelOrder.length) {
      const panelId = panelOrder[currentIndex];
      const creaseId = findCreaseId(parentPanelId, panelId);
      if (!creaseId) break;

      const panelChildren: DielineFaceNode[] = [];

      // Continue the chain in the same direction
      const nextIndex = currentIndex + direction;
      if (nextIndex >= 0 && nextIndex < panelOrder.length) {
        panelChildren.push(...buildBranch(nextIndex, direction, panelId));
      }

      // Glue tab if attached to this panel
      if (recipe.body.glueTabAttachedTo === panelId && faceIdSet.has("glue-tab")) {
        const glueCreaseId = findCreaseId(panelId, "glue-tab");
        if (glueCreaseId) {
          panelChildren.push({ faceId: "glue-tab", creaseId: glueCreaseId, children: [] });
        }
      }

      // Closure faces
      panelChildren.push(...closureChildren(panelId));

      nodes.push({ faceId: panelId, creaseId, children: panelChildren });
      break; // only one panel per branch level; recursion handles the chain
    }

    return nodes;
  }

  // Root node
  const rootChildren: DielineFaceNode[] = [];

  // Branch left from root
  if (rootIndex > 0) {
    rootChildren.push(...buildBranch(rootIndex - 1, -1, rootPanel));
  }
  // Branch right from root
  if (rootIndex < panelOrder.length - 1) {
    rootChildren.push(...buildBranch(rootIndex + 1, 1, rootPanel));
  }

  // Glue tab on root panel
  if (recipe.body.glueTabAttachedTo === rootPanel && faceIdSet.has("glue-tab")) {
    const glueCreaseId = findCreaseId(rootPanel, "glue-tab");
    if (glueCreaseId) {
      rootChildren.push({ faceId: "glue-tab", creaseId: glueCreaseId, children: [] });
    }
  }

  // Closure faces on root panel
  rootChildren.push(...closureChildren(rootPanel));

  return [{ faceId: rootPanel, creaseId: null, children: rootChildren }];
}
