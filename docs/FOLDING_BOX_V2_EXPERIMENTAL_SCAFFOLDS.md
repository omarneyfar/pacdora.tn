# Folding Box V2 Experimental Scaffolds

Status: development/testing only.

These templates are hidden or dev-only. They are graph-valid scaffolds for visual inspection, not CAD/manufacturing-verified dielines. All remain `productionReady: false` and `verificationStatus: geometry-needs-verification`.

## Templates Attempted

| Template | Recipe | Status |
| --- | --- | --- |
| `tuck-end-folding-carton` | `domain/dieline/recipes/foldingBox/tuckEndFoldingCarton.v2.json` | Reference-pending custom closure scaffold. |
| `centered-tuck-end-carton` | `domain/dieline/recipes/foldingBox/centeredTuckEndCarton.v2.json` | Reference-pending centered tuck scaffold. |
| `folding-carton-box-with-locking-tab-on-top-and-bottom` | `domain/dieline/recipes/foldingBox/lockingTabTopBottom.v2.json` | Reference-pending locking tab scaffold. |
| `folding-carton-box-with-circular-hang-hole` | `domain/dieline/recipes/foldingBox/circularHangHole.v2.json` | Reference-pending hang tab plus circular hole scaffold. |
| `folding-carton-box-with-hang-tab` | `domain/dieline/recipes/foldingBox/hangTab.v2.json` | Reference-pending hang tab plus euro slot scaffold. |

## New Reusable Parts

| Part type | Purpose | Notes |
| --- | --- | --- |
| `partial-edge-anchor` | Creates a validated sub-edge anchor from an existing edge. | Used for centered tuck flaps, lock tabs, and hang tabs. |
| `lock-tab` | Adds a structural lock-tab face from a top/bottom anchor. | Shape is generic shouldered tab; reference comparison required. |
| `hang-tab` | Adds a structural hang-tab face from a top/bottom anchor. | Hole/slot remains geometry-only via cutout parts. |
| `circular-hole-cutout` | Adds a geometry-only circular hole. | Validates against the actual circular samples, not a rectangular proxy. |
| `euro-slot-cutout` | Adds a geometry-only euro-style slot approximation. | Uses slot plus circular crown primitives. |
| `window-cutout` | Adds a geometry-only rounded-rectangle window. | Available for future recipes; not used by the five-template scaffold pass. |

## Existing Parts Reused

- `body-strip`
- `side-glue-tab`
- `tuck-flap`
- `dust-flap`
- `score-line`
- `slotted-tuck-flap`
- `custom-dust-flap`
- `rounded-slot-cutout`
- `relief-notch`

## Visual Defects And Risks

| Template | Likely recipe-structure defects | Likely part-level defects |
| --- | --- | --- |
| `tuck-end-folding-carton` | Body panel ownership and exact top/bottom closure relationships still need fixture overlay. | `slotted-tuck-flap`, `custom-dust-flap`, and `relief-notch` need reference-driven shoulder/notch refinement. |
| `centered-tuck-end-carton` | Centered tuck width and which body panels own top/bottom tucks are inferred. | `partial-edge-anchor` is structurally valid, but centered flap proportions need visual review. |
| `folding-carton-box-with-locking-tab-on-top-and-bottom` | Receiving-slot panel choice and top/bottom lock relationships are inferred. | `lock-tab` tongue shape and `rounded-slot-cutout` placement need reference comparison. |
| `folding-carton-box-with-circular-hang-hole` | Hang tab is attached to `back.top`; exact owner panel is not verified. | `hang-tab` shoulder shape and `circular-hole-cutout` radius/position need reference comparison. |
| `folding-carton-box-with-hang-tab` | Hang tab ownership is inferred and may differ from the source template. | `euro-slot-cutout` is an approximation and likely needs shape tuning. |

## Next Fixes

1. Add trusted reference fixtures for each scaffolded template and size.
2. Overlay each `reference-size` debug SVG against the fixture.
3. Decide whether mismatch belongs to recipe attachment/ownership or reusable part geometry.
4. Refine one part at a time, then regenerate every stress SVG.
5. Keep all five templates hidden/dev-only until visual comparison is complete.
