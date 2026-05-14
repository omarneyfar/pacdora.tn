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
- The lower hang cutout is a euro/keyhole-style hole. Its lower edge is about `22.8mm` above the body top crease.
- The upper fold-over panel contains a rounded horizontal slot. Its center is mirrored across the lower/upper panel fold so the holes overlay after folding.
- The back panel top closure is a rounded tuck flap with about `18mm` tuck lip allowance and about `9mm` corner radius.
- Top side dust flaps are `36mm` tall and handed.
- Bottom closure uses two side/minor flaps plus two major interlocking flaps. The major flaps share a local notch center, and the cut outline uses a small right-side relief/diagonal rather than the earlier large mirrored diagonal.
- Red SVG lines are real fold/score locations. Blue SVG paths are cut outlines and cutouts.

## V2 Changes Made

- `foldedHangTabPanel` now creates three faces: lower panel, upper fold-over panel, and short top cap.
- The lower/upper panel hinge is an inset real structural crease, matching the reference shoulder behavior.
- Lower keyhole and upper rounded slot are still geometry-only primitives.
- Hang-tab default slot formulas now use the ready proportions:
  - lower panel `52.5mm`
  - upper fold-over panel `52.5mm`
  - top cap `16.8mm`
  - slot width `45.2mm`
  - lower slot height about `15.5mm`
  - upper slot height about `13.5mm`
- Top tuck default uses `W + 18mm` instead of the previous wider STE/RTE lip default.
- Bottom minor flaps now use the reference large start diagonal.
- Bottom major flaps now use the reference same-handed small right relief with aligned center notches.

## Remaining Differences

- The lower euro/keyhole cutout is an original polygon approximation, not an exact Illustrator path copy.
- Rounded shoulder transitions are polygonal approximations rather than true Bezier curves.
- Bottom lock overlap sequence and material clearance remain reference-pending and need CAD/prototype validation.
- The hidden V2 assembly remains disconnected from catalog, UI, and `generatorRegistry`.
