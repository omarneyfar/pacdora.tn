# RTE V2 Visual Review

Date: 2026-05-13

## Scope

This review covers the hidden Reverse Tuck End v2 component-engine output only. It does not expose v2 in the UI, replace v1, or mark the template production-ready.

Generated debug SVGs reviewed:

- `scripts/output/component-engine/reverse-tuck-end-v2-120x40x160.debug.svg`
- `scripts/output/component-engine/reverse-tuck-end-v2-120x60x160.debug.svg`
- `scripts/output/component-engine/reverse-tuck-end-v2-120x90x160.debug.svg`
- `scripts/output/component-engine/reverse-tuck-end-v2-80x40x120.debug.svg`
- `scripts/output/component-engine/reverse-tuck-end-v2-200x80x250.debug.svg`

Primary reference target:

- `fixtures/references/reverse-tuck-end/120x60x160/`

## Visual Review

| Area | Review | Status |
| --- | --- | --- |
| Tuck flap shape | V2 uses a cleaner full-width base with continuous side edges and rounded outer corners. The previous side kinks/notches are removed. | Pass visual sanity |
| Rounded corners | Rounded corners are applied only to the outer tuck-flap corners and remain dimension-stable across W=40, W=60, and W=90 stress cases. | Pass visual sanity |
| Dust flap proportions | Dust flaps are simple four-point tapered flaps. The base edge equals the side-panel anchor and taper is conservative. | Pass visual sanity |
| Glue tab placement | RTE glue tab attaches to `back.right` and remains on the right seam side. | Pass invariant |
| Score line placement | Tuck score lines remain `GeometryPrimitive` crease-layer lines and are not structural `DielineCrease` records. | Pass invariant |
| Cut outline continuity | Exterior cut geometry is still exported as segmented cut paths from face boundaries, not a single ordered production contour. | Needs production-outline validation |
| Anchor correctness | `top-tuck` matches `front.top`, `bottom-tuck` matches `back.bottom`, dust flaps attach to side top/bottom anchors, and glue tab matches the seam anchor. | Pass invariant |

## Reference Comparison Status

No trusted reference file has been placed yet in `fixtures/references/reverse-tuck-end/120x60x160/`.

Current status remains:

```json
{
  "verificationStatus": "geometry-needs-verification",
  "productionReady": false
}
```

Do not promote to `visual-compared` until a trusted reference is added and the comparison report passes.

## Comparison Workflow

1. Place a trusted reference file in `fixtures/references/reverse-tuck-end/120x60x160/`.
2. Prefer `reference.svg` with `cut` and `crease` layer hints when possible.
3. Fill out `manifest.json` using `manifest.example.json`.
4. Run:

```bash
npm run compare:rte-v2
```

5. Review `fixtures/references/reverse-tuck-end/120x60x160/comparison-report.md`.
6. If the visual/reference comparison passes, update only:

```json
"verificationStatus": "visual-compared"
```

Keep:

```json
"productionReady": false
```

## Remaining Risks

- No CAD/reference fixture has been compared yet.
- Cut paths are still segmented; a continuous production cut-outline validator is still needed.
- Tuck/dust/glue geometry is production-like but not printer/prototype verified.
