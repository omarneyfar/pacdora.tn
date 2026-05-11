---
name: svg-computational-geometry
description: SVG/DXF dieline import, reference comparison, and computational geometry guidance for FoldView, including layer detection, path parsing, curve flattening, canonical geometry primitives, planar graph construction, face detection, edge classification, and fold-tree generation. Use when implementing or debugging custom SVG/DXF reference ingestion, exact template matching, face detection, or 2D geometry algorithms.
---

# SVG Computational Geometry

Use this skill before implementing custom SVG dieline import or face detection.

## Workflow

1. Parse SVG/DXF structural elements into normalized canonical primitives when possible.
2. Detect cut, crease, perf, window, hole, bleed, safe, and label layers from names, labels, stroke colors, dash styles, then topology.
3. Apply transforms before using coordinates.
4. Flatten curves into segments for graph algorithms, while preserving original paths/primitives for rendering and export.
5. Snap nearby endpoints to a tolerance grid to avoid floating-point gaps.
6. Split intersections so the graph is a proper planar subdivision.
7. Detect polygon faces from directed graph cycles.
8. Classify edges by adjacency: exterior edges are cuts, shared edges are creases.
9. Build a fold tree from adjacent faces connected by creases.
10. Compare generated templates against authorized reference fixtures before calling them exact.

## Guardrails

- Never rely only on layer names; always provide fallbacks.
- Never scrape or clone protected generated files without authorization.
- Do not lose arcs, circles, slots, windows, holes, or rounded corners when storing canonical geometry.
- Deduplicate overlapping edges before face detection.
- Filter tiny degenerate faces.
- Treat SVG coordinates as Y-down and be explicit when converting to Three.js.
- Keep parsing and geometry in pure domain code; keep UI rendering separate.

## Testing

Add tests for simple rectangles, cross dielines, tuck flaps, curved paths, duplicate edges, missing intersections, and user-provided SVGs.

## Reference

Read `references/foldview-svg-computational-geometry.md` for algorithms, types, parsing fallbacks, and polygon utility examples.
