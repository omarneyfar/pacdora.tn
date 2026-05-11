---
name: nextjs-react-redux
description: FoldView frontend architecture and coding conventions for Next.js App Router, React components, Redux Toolkit state, hooks, client API helpers, vanilla CSS, builder template-parameter mode, and dieline export UI. Use when editing app routes, builder/dashboard/viewer UI, Redux slices, custom hooks, template controls, export routes, or any frontend state management in this repository.
---

# Next.js React Redux

Use this skill before changing FoldView frontend code. Keep the codebase split by responsibility:

- `app/`: route entrypoints only; no business logic and no `"use client"` page files.
- `features/`: React UI by product feature.
- `hooks/`: async workflows and side effects.
- `store/`: Redux Toolkit slices and typed Redux hooks; reducers stay pure.
- `domain/`: pure TypeScript only; no React, browser, Supabase, or filesystem imports.
- `server/`: Node-only persistence, APIs, DB, and storage orchestration.
- `utils/`: pure helpers.

## Workflow

1. Inspect the relevant feature, hook, slice, and route before editing.
2. Put UI rendering in components, side effects in hooks, and shared state in Redux.
3. Use `useAppDispatch` and `useAppSelector`; do not import raw Redux hooks.
4. Keep async API calls out of components; call typed client helpers or server services.
5. Memoize only components that receive stable props or render expensive UI.
6. Use lucide-react icons and existing vanilla CSS classes.
7. Run `npm run lint` and `npm run build` after frontend changes.

## Builder Template Rules

- Keep template-specific parameter controls driven by `ParameterSpec[]`; do not hardcode one-off controls in the panel.
- Regenerate template graphs from `ParameterValueMap` through domain generators.
- Keep canonical 2D geometry display and export separate from 3D rendering.
- Put SVG/DXF/PDF export actions near dieline selection and builder workflows when they are user-facing.
- Use Redux for selected template graph and values when multiple builder panels need them.

## Redux Rules

- Use Redux for builder/project data shared across panels or toolbars.
- Use local component state only for isolated, temporary UI state.
- Keep reducers pure; put uploads, saves, fetches, timers, and clipboard logic in hooks.
- Reset feature state when entering a new project/session so data does not leak between routes.

## App Router Rules

- Pages stay thin and usually return one feature component.
- Dynamic route params in this project are promises; always `await params`.
- Client-only Three.js components must be dynamically imported with `ssr: false`.

## Reference

Read `references/foldview-nextjs-react-redux.md` when you need the full local conventions, current hook list, CSS rules, or examples.
