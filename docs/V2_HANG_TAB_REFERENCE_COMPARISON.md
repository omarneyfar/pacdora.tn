# V2 Hang Tab Reference Comparison

Reference inspected: `ready-file.svg`.

## Ready SVG Structure

- Body order is `side panel -> front panel -> side panel -> back panel`.
- Physical reference dimensions read from the hidden dimension layer are approximately `W=80`, `L=110`, and `H=150`.
- Glue tab is on the far right of the back panel and is about `16mm` wide.
- The front-panel hang structure has three foldable zones:
  - lower hang panel: about `52.5mm` tall, attached to `front.top`
  - upper fold-over panel: about `52.5mm` tall, attached by an inset centered crease
  - short top insert cap: about `16.8mm` tall
- The lower hang cutout is now modeled as a rounded horizontal slot matching the upper slot, per the latest visual correction.
- The upper fold-over panel contains a matching rounded horizontal slot. Its centerline and usable rounded-slot span line up with the lower opening after folding.
- The back panel top closure is a rounded tuck flap with about `18mm` tuck lip allowance and about `9mm` corner radius.
- Top side dust flaps are `36mm` tall and handed.
- Bottom closure uses two side/minor flaps plus two major interlocking flaps. The major flaps share a local notch center, include an internal diagonal score line, and the cut outline uses a small right-side relief/diagonal rather than the earlier large mirrored diagonal.
- Red SVG lines are real fold/score locations. Blue SVG paths are cut outlines and cutouts.

## V2 Changes Made

- `foldedHangTabPanel` now creates three faces: lower panel, upper fold-over panel, and short top cap.
- The lower/upper panel hinge is an inset real structural crease, with rounded/polygon-sampled cut shoulders matching the reference shoulder behavior.
- Lower and upper rounded slots are still geometry-only primitives.
- The two negative openings now use the same slot size and X centerline so they read as one aligned folded pair.
- Hang-tab default slot formulas now use the ready proportions:
  - lower panel `52.5mm`
  - upper fold-over panel `52.5mm`
  - top cap `16.8mm`
  - slot width `45.2mm`
  - lower and upper rendered slot height about `13.5mm`
- Top tuck default uses `W + 18mm` instead of the previous wider STE/RTE lip default.
- Bottom minor flaps now use the reference large start diagonal.
- Bottom major flaps now use the reference same-handed small right relief with aligned center notches.
- Bottom major flaps now include geometry-only diagonal score guides that end at the same depth as the minor bottom flaps.

## Remaining Differences

- The matching lower/upper rounded slots are original parametric geometry, not exact copied Illustrator paths.
- Rounded shoulder transitions are polygon-sampled approximations rather than exact copied Bezier curves.
- Bottom lock overlap sequence and material clearance remain reference-pending and need CAD/prototype validation.
- The hidden V2 assembly remains disconnected from catalog, UI, and `generatorRegistry`.
