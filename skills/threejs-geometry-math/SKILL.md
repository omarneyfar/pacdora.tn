---
name: threejs-geometry-math
description: FoldView 3D rendering, Three.js, React Three Fiber, carton model geometry, print guide overlays, camera controls, texture color handling, and dieline/model math. Use when editing CartonStage, domain packaging model specs, 3D guide rendering, zoom/orbit behavior, or geometry calculations.
---

# Three.js Geometry Math

Use this skill before changing FoldView 3D or geometry code.

## Core Rules

- Keep geometry generation in `domain/packaging`; React components should consume specs.
- Use millimeters in domain/dieline code and normalized Three.js units in 3D rendering.
- Do not import React or Three.js into pure domain modules unless the module is explicitly rendering.
- Dynamically import browser-only 3D UI with `ssr: false`.
- Use React Three Fiber `<Canvas>`; do not manually create WebGL canvases.
- Hoist stable Three.js objects such as `Vector3` targets to module scope.
- Dispose cloned textures on unmount.

## Rendering Checklist

- Use `SRGBColorSpace` and `toneMapped={false}` for artwork textures so colors do not wash out.
- Memoize expensive `getModelSpec` and `getDielineSpec` results by dimensions.
- Keep guide overlays generated from model specs, not hardcoded component math.
- Preserve zoom limits and keep the zoom readout synchronized with OrbitControls distance.
- Verify canvas output after changes with desktop and mobile browser smoke.

## Geometry Checklist

- Clamp dimensions before computing geometry.
- Avoid zero-area faces and invalid camera distances.
- Keep face keys and face orientation consistent between dieline, crop, storage, and 3D mapping.
- Treat SVG/dieline coordinates as Y-down and Three.js coordinates as Y-up.

## Reference

Read `references/foldview-threejs-geometry-math.md` for detailed coordinate systems, guide colors, fold guide math, and future folding guidance.
