# Folding Box V2 Migration Backlog

Source: `c:\Users\MSI\Downloads\cefbox_folding_box_dieline_database_refactored.json`

This report uses the CefBox JSON as a planning and catalog source only. It does not copy production geometry, create new recipes, expose templates in the UI, or mark any template `productionReady`. Exact dielines still require recipe implementation, generated graph checks, reference SVG/DXF comparison, and prototype/CAD review.

## Current V2 Part Coverage

| Source concept | V2 component status | Notes |
| --- | --- | --- |
| Front/back/side body panels | Available: `body-strip` | Creates the four-panel carton body, body creases, and body anchors. |
| Side seam glue flap | Available: `side-glue-tab` | Supports the current side seam glue tab. |
| Standard tuck closure | Available: `tuck-flap` | Used by RTE/STE recipes. |
| Dust flaps | Available: `dust-flap` | Used by RTE/STE recipes. |
| Internal score/guide line | Available: `score-line` | Geometry primitive only, not a structural crease. |
| Simple rectangular panel flap | Available: `panel-flap` | Kept for variants; not part of standard STE. |
| Auto-lock/crash bottom | Missing | Needs lock bottom panel geometry and folding relationships. |
| Snap-lock bottom | Missing | Needs snap-lock major/minor flap geometry and bottom-lock folding relationships. |
| Partial edge anchor | Available: `partial-edge-anchor` | Creates validated sub-edge anchors for centered tucks, lock tabs, and hang tabs. |
| Locking tab/slot | Available: `lock-tab`, `rounded-slot-cutout` | Experimental locking-tab scaffold exists; snap-lock systems still need their own bottom parts. |
| Slot cutout | Available: `slot-cutout` | Geometry-only `hole` primitive with face/anchor placement validation. |
| Rounded slot cutout | Available: `rounded-slot-cutout` | Geometry-only slot primitive for face/anchor placement; used by reference-pending custom closures. |
| Custom full-width tuck flap | Available: `slotted-tuck-flap` | Reference-pending custom closure scaffold with rounded corners, score line, embedded slot, and optional relief cuts. |
| Custom dust flap | Available: `custom-dust-flap` | Reference-pending anchored dust flap with taper/shoulder/notch controls. |
| Relief/notch cut | Available: `relief-notch` | Geometry-only cut primitive for shoulder, glue-tab, and dust-flap relief details. |
| Hang tab and hang hole | Available: `hang-tab`, `circular-hole-cutout`, `euro-slot-cutout` | Experimental hang-tab scaffolds exist; exact tab ownership still needs reference comparison. |
| Window cutout | Available: `window-cutout` | Geometry-only `window` primitive with placement validation; no recipe promoted yet. |
| Handle structures | Missing | Needs bridge, relief slots, and cutout behavior. |
| Tear strip/perforation | Missing | Needs perf line primitives and opening-strip geometry. |
| Inserts/dividers/partitions/mounts | Missing | Needs internal structures and 3D folding/placement rules. |
| Reversible/skillet/gusset roofs | Missing | Needs template-specific closure families and references. |

## Templates Buildable Now

Only these templates are v2-ready today because they already have implemented JSON recipes and pass the current graph/debug verification path:

- `reverseTuckEnd` - Reverse Tuck End Folding Carton Box
- `straightTuckEnd` - Straight Tuck End Folding Carton Box

Both remain `productionReady: false` with `verificationStatus: geometry-needs-verification`.

## Backlog

| Priority | Classification | Slug | Label | Missing parts / blockers |
| --- | --- | --- | --- | --- |
| P0 | v2-ready | `reverseTuckEnd` | Reverse Tuck End Folding Carton Box | None; continue reference/CAD verification. |
| P0 | v2-ready | `straightTuckEnd` | Straight Tuck End Folding Carton Box | None; continue reference/CAD verification. |
| P1 | needs-simple-feature | `centered-tuck-end-carton` | Fully Customizable Tuck End Folding Carton Dieline, Template | Hidden graph-valid scaffold exists with partial centered tuck anchors; needs reference comparison. |
| P1 | needs-custom-closure | `tuck-end-folding-carton` | Cusomizable tuck end folding carton dieline, design template | Custom closure parts now exist as a hidden reference-pending scaffold; still needs trusted fixture comparison and formula refinement. |
| P1 | needs-simple-feature | `folding-carton-box-with-locking-tab-on-top-and-bottom` | Folding carton box with locking tab on top and bottom | Hidden graph-valid scaffold exists; lock tab reach and receiving-slot ownership need reference comparison. |
| P2 | needs-simple-feature | `with-circular-hang-hole` | Folding carton box with a circular hang hole | Hidden graph-valid scaffold exists; hang-tab ownership and hole position need reference comparison. |
| P2 | needs-simple-feature | `with-hang-tab` | Folding carton box with a hang tab | Hidden graph-valid scaffold exists; euro-slot shape and tab shoulder rules need reference comparison. |
| P2 | needs-simple-feature | `with-circular-hang-hole-and-window` | With hang hole and window | Hang tab and window primitives exist, but this combined recipe has not been decomposed yet. |
| P3 | needs-complex-closure | `snapLockBottom` | Snap Lock Bottom Folding Carton Box | Snap-lock bottom panel and lock tab system. |
| P3 | needs-complex-closure | `autoLockBottom` | Auto Lock Bottom Folding Carton Box | Auto-lock/crash-bottom panel system. |
| P3 | needs-complex-closure | `snap-lock-bottom-carton-with-tab-closure` | Customizable Snap Lock Bottom Folding Carton with Tab Closure Design Template, Dieline | Snap-lock bottom panel, lock tab, slot/relief support. |
| P3 | needs-complex-closure | `auto-lock-bottom-carton-with-tab-closure` | Customizable Auto-lock Bottom Folding Carton with Tab Closure Design Tempplate, Dieline | Auto-lock bottom panel, lock tab/slot support. |
| P3 | needs-complex-closure | `autoLockBottomWithFullFlap` | Auto Lock Bottom Folding Box with Full-Flap Bottom Panel | Auto-lock bottom panel plus full-flap bottom behavior. |
| P4 | needs-complex-closure | `with-handle` | Carton Gift Box with a folded Handle | Folded handle bridge, handle cutout, relief slots. |
| P4 | needs-complex-closure | `snap-lock-carton-with-arc-handler` | Customizable Snap-lock Carton with Arc Handler Dieline, Design Template | Arc handle closure, handle cutout, relief slots. |
| P4 | needs-complex-closure | `with-handle-and-window` | Folding Box with handle and window | Handle bridge/cutout plus window cutout. |
| P4 | needs-internal-structure | `with-built-in-inserts` | Folding Box with built-in inserts | Built-in insert parts and internal folding/placement rules. |
| P4 | needs-internal-structure | `carton-with-integrated-partitions` | Customizable Folding Carton with Integrated Partitions Design Template, Dieline | Integrated partition set. |
| P4 | needs-internal-structure | `carton-with-centered-divider` | Customizable Folding Cartion with Built-in Divider Design Template, Dieline | Center divider/internal partition. |
| P4 | needs-internal-structure | `snap-lock-bottom-carton-with-divider` | Customizable Snap-lock Bottom Folding Carton with Divider Design Template, Dieline | Snap-lock bottom plus center divider. |
| P4 | needs-internal-structure | `snap-lock-bottom-carton-with-divider-and-windows` | Customizable Snap Lock Bottom Folding Carton with Divider & Windows Deisgn Template, Dieline | Snap-lock bottom, center divider, window cutouts. |
| P4 | needs-internal-structure | `snap-lock-bottom-carton-with-mount` | Customizable snap-lock folding carton with mount dieline, template | Mount/insert structure plus snap-lock bottom. |
| P5 | needs-complex-closure | `gusset-roof-carton-with-tear-strip` | Customizable gusset roof folding carton with tear strip dielines, template | Gusset roof panels and tear-strip/perforation support. |
| P5 | needs-complex-closure | `reversible-lid-folding-carton` | Customizable crash bottom folding carton with reversible top cover dieline, design template | Auto-lock bottom, reversible lid, skillet lid tuck. |
| P5 | needs-complex-closure | `gusset-cover-crash-bottom-carton` | Customizable folding carton with gusset cover and crash bottom dieline, design template | Auto-lock bottom plus gusset cover. |
| P5 | needs-complex-closure | `crash-bottom-carton-with-tear-strip` | Auto Lock Bottom Box with Tearable Strip Seal | Auto-lock bottom and tear-strip/perforation support. |
| P5 | needs-complex-closure | `snap-lock-bottom-with-tear-strip` | Snap Lock Bottom Folding Box with Tearable Strip Seal | Snap-lock bottom and tear-strip/perforation support. |
| P6 | metadata-only | `reversible-lid-skillet-carton` | Customizable skillet box with reversible lid dieline, design template | Reversible/skillet family needs reference-driven decomposition before parts. |
| P6 | metadata-only | `separated-skillet-box` | Separated skillet box | Two-piece skillet architecture needs reference-driven decomposition before parts. |

## Recommended Implementation Order

1. Finish reference/CAD comparison for RTE and STE and keep them as the only v2-ready templates until verified.
2. For `tuck-end-folding-carton`, keep the hidden custom-closure recipe reference-pending until a trusted fixture comparison confirms flap shapes, relief cuts, and formulas.
3. Refine `slotted-tuck-flap`, `custom-dust-flap`, and `relief-notch` only from reference overlay differences, not from unsupported catalog assumptions.
4. Use the hidden centered-tuck, locking-tab, circular-hole, and hang-tab debug SVGs to compare against trusted references before any catalog exposure.
5. Implement one bottom-lock family at a time, starting with snap-lock or auto-lock, and verify against reference fixtures before variants.
6. Add internal structure support after the base lock-bottom families are stable, because dividers/inserts/mounts affect 2D graph topology and 3D folding.
7. Defer reversible lids, skillet structures, gusset roofs, and tear-strip families until the engine has cutout/perforation primitives and trusted references.
