---
name: packaging-domain
description: Print house and packaging domain guidance for FoldView, including exact carton templates, dielines, cut/crease/perf/window/hole/bleed/safe layers, box dimensions, project lifecycle, artwork assignment rules, export rules, and future FEFCO/ECMA packaging workflows. Use when designing packaging behavior, template data, print guides, export rules, or product decisions for printing-house users.
---

# Packaging Domain

Use this skill when a change depends on printing-house workflow, packaging structure, dielines, project lifecycle, or client approval behavior.

## Product Rules

- Treat dimensions as millimeters.
- Keep artwork face assignment separate from original artwork sources.
- Keep cut, crease, perf, window, hole, bleed, safe, and label layers explicit in domain data.
- Preserve the draft/published lifecycle: published projects are viewable; draft projects are blocked from public view.
- Visible carton content edits should demote published projects back to draft and clear share links.
- Metadata-only edits, such as project name changes, should not change the packaging status by themselves.

## Dieline Rules

- Cut lines define physical trim boundaries.
- Fold/crease lines define assembly hinges.
- Perf lines define tear or fold-assist cuts and must not be rendered/exported as normal cut lines.
- Window and hole layers define removed regions and must survive export even before 3D supports cutouts.
- Bleed extends artwork beyond cut lines; safe zones keep important content away from trim.
- Template-generated dielines should be deterministic from dimensions.
- Exact template work must use canonical 2D geometry as the source of truth before 3D rendering.
- Do not call a generated template exact unless an authorized SVG/DXF reference fixture verifies it.

## Template Decisions

- Use packaging terminology consistently: faces, panels, flaps, tabs, locks, creases, bleed, safe area.
- Add new templates through template/domain adapters rather than one-off UI math.
- Prefer common print-house structures and FEFCO/ECMA naming when possible.
- For CefBox-like families, implement one exact template at a time with visible parameters, reference comparison, export snapshot checks, and 3D smoke checks.

## Reference

Read `references/foldview-packaging-domain.md` for printing workflow context, carton anatomy, FEFCO/ECMA examples, and future feature priorities.
Use `$exact-dieline-template-system` for the current exact folding-box implementation workflow.
