---
name: exact-dieline-template-system
description: Exact parametric carton dieline workflow for this project. Use when implementing or changing folding-box templates, CefBox-like template families, dieline parameters, canonical 2D geometry, SVG/DXF/PDF export, reference comparisons, builder template controls, or 3D folding/motion driven by dieline graphs.
---

# Exact Dieline Template System

Use this skill to keep carton-template work grounded in the project direction: exact 2D dieline first, export second, 3D and motion after the geometry is trustworthy.

## Core Direction

- Treat `domain/dieline/canonicalGeometry.ts` and `GeometryPrimitive[]` as the print/export source of truth.
- Treat `faces`, `creases`, and `faceTree` as the derived structural model for artwork placement and 3D folding.
- Do not compensate for bad 2D geometry in the renderer. Fix the template generator or importer.
- Do not claim a template is identical to CefBox or another source unless an authorized SVG/DXF fixture is present and the verifier compares against it.
- Keep dimensions in millimeters.
- Preserve special geometry: arcs, rounded corners, slots, windows, holes, perf, bleed, safe, labels, and construction guides when available.

## Implementation Order

1. Define the template contract:
   - `ParameterSpec[]`
   - normalized `ParameterValueMap`
   - default values
   - min/max/step rules
   - derived dimension behavior such as inner/outer size rules.
2. Generate canonical 2D geometry:
   - create layer-typed primitives for cut, crease, perf, window, hole, bleed, safe, and label.
   - preserve exact paths/arcs where a reference proves them.
3. Generate structural graph data:
   - create finite nonzero faces.
   - create creases that lie on connected face edges.
   - create a complete `faceTree` with each face exactly once.
4. Wire builder parameter mode:
   - show template-specific parameters grouped by purpose.
   - regenerate the graph live from parameter values.
   - show layer toggles and export actions from canonical geometry.
5. Validate export:
   - SVG/DXF/PDF must come from canonical geometry.
   - preserve stable layer names.
6. Upgrade 3D:
   - fold from `faces`, `creases`, and `faceTree`.
   - render cutouts/windows only after they exist in canonical geometry.
   - add thickness and animation after closed/static folding is correct.

## Reference Workflow

- Put authorized reference files under `fixtures/dielines/references/`.
- Use names like `reverse-tuck-end.svg` or `reverse-tuck-end.dxf`.
- Run `npm run verify:dieline` after adding a fixture.
- If the comparison fails, tune the generator formulas; do not relax tolerances to hide real geometry errors.
- If no fixture exists, call the implementation a scaffold or professional approximation, not exact.

## Files To Inspect First

- `domain/dieline/types.ts`
- `domain/dieline/canonicalGeometry.ts`
- `domain/dieline/validation.ts`
- `domain/dieline/reference.ts`
- `domain/dieline/templates/reverseTuckEnd.ts`
- `features/builder/panels/ParametersPanel.tsx`
- `features/builder/components/DielineRenderer.tsx`
- `features/builder/DielineCartonStage.tsx`
- `scripts/verify-dieline-graph.mjs`

## Validation

Run these after meaningful dieline changes:

```bash
npm run verify:dieline
npm run lint
npm run build
```

Run visual verification after builder, renderer, or 3D changes:

```bash
npm run verify:visual
```

