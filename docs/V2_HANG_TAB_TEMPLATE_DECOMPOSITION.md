# V2 Hang Tab Template Decomposition

This is an exploratory hidden V2 assembly for the CefBox-style folding carton with hang tab. It is built only from the clean `v2Library` and is not connected to catalog, UI, or `generatorRegistry`.

## Body And Panel Order

- Default reference size: `L=110`, `W=80`, `H=150`.
- Flat body order: `sideA -> front -> sideB -> back`.
- Glue tab is attached to the far-right edge of `back`.
- The main hang/display structure is above `front`, not on a side panel.
- The standard top tuck closure is above `back`.

## Top Structure

- `standardDustFlap` creates the two top side dust flaps.
- `foldedHangTabPanel` creates:
  - lower hang panel attached to `front.top`
  - upper fold-over panel attached to the lower panel inset top fold
  - short top insert cap attached to the upper panel top edge
  - lower rounded slot as a geometry-only hole primitive
  - upper rounded slot as a geometry-only hole primitive
- The lower and upper slots use the same rendered width, height, radius, and centerline so the negative openings stay visually linear/aligned when folded.
- Reference-like defaults:
  - lower hang height: `clamp(L * 0.477, 40, 58)` -> about `52.5mm`
  - upper fold-over panel height: equal to lower hang height so the holes overlay after folding
  - short top cap height: `clamp(L * 0.153, 14, 22)` -> about `16.8mm`
  - slot width: `clamp(L * 0.41, 36, 50)` -> about `45.1mm`
  - matching lower/upper rounded slot height: about `13.5mm`
  - lower slot bottom is about `22.8mm` above the front-panel top crease
  - upper slot center is mirrored around the lower/upper fold line so the holes overlay when the upper panel folds down
- The top tuck closure depth follows the same policy as STE/RTE: `tuckDepth = W + TFW`, where `TFW` is the tuck lip allowance.
- The top dust flap depth remains separate as `DFW`; dust flaps are not used to size the main tuck insert.

## Bottom Structure

- `interlockingBottomFlap` is used for all four bottom pieces so the closure is one coordinated system.
- Minor side flaps attach to `sideA.bottom` and `sideB.bottom`.
- Major flaps attach to `front.bottom` and `back.bottom`.
- Major notches use the same local coordinate: `notchCenter = L / 2`.
- Minor-flap diagonal inset is derived from depth: `clamp(W * 0.5, 34, 42)`.
- Major-flap end relief is small, about `clamp(W * 0.055, 3, 6)`.
- Major depth is derived from depth: `clamp(W * 0.68, 44, 58)`.
- Notch width and notch depth are proportional to `W` / major depth and clamped.
- Major flaps include a geometry-only diagonal score guide. The guide ends at `bottomDustDepth`, matching the height/depth of the minor bottom flaps visible in the ready SVG.

## Structural Rules

- Real panels and flaps are V2 faces.
- Face-to-face hinges are V2 structural creases.
- Slots, notch alignment guides, and internal score/guide details are geometry primitives only.
- No V1 parts are imported.
- `productionReady` remains `false`.

## Known Remaining Risks

- Bottom interlock is an original parametric approximation from the screenshot, not CAD-verified production geometry.
- Exact die radii and slot profile need a CAD overlay.
- Fold sequence, overlap clearance, and board caliper compensation still need prototype testing.
