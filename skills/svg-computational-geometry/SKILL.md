---
name: svg-computational-geometry
description: SVG dieline import and computational geometry guidance for FoldView, including SVG path parsing, layer detection, curve flattening, planar graph construction, face detection, edge classification, and fold-tree generation. Use when implementing or debugging custom SVG dieline import, face detection, or 2D geometry algorithms.
---

# SVG Computational Geometry

Use this skill before implementing custom SVG dieline import or face detection.

## Workflow

1. Parse SVG structural elements into normalized segments.
2. Detect cut and crease layers from group names, labels, stroke colors, dash styles, then topology.
3. Apply transforms before using coordinates.
4. Flatten curves into segments for graph algorithms, while preserving original paths for rendering.
5. Snap nearby endpoints to a tolerance grid to avoid floating-point gaps.
6. Split intersections so the graph is a proper planar subdivision.
7. Detect polygon faces from directed graph cycles.
8. Classify edges by adjacency: exterior edges are cuts, shared edges are creases.
9. Build a fold tree from adjacent faces connected by creases.

## Guardrails

- Never rely only on SVG layer names; always provide fallbacks.
- Deduplicate overlapping edges before face detection.
- Filter tiny degenerate faces.
- Treat SVG coordinates as Y-down and be explicit when converting to Three.js.
- Keep parsing and geometry in pure domain code; keep UI rendering separate.

## Testing

Add tests for simple rectangles, cross dielines, tuck flaps, curved paths, duplicate edges, missing intersections, and user-provided SVGs.

## Reference

Read `references/foldview-svg-computational-geometry.md` for algorithms, types, parsing fallbacks, and polygon utility examples.
