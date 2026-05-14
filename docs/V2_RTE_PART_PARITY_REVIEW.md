# V2 RTE Part Parity Review

Status: hidden V2 template assembly only. No catalog, UI, generator registry, or recipe migration has been done.

Reference compared:
- `scripts/output/component-engine/reverse-tuck-end-v2-120x60x160.debug.svg`
- `scripts/output/v2-library/templates/reverse-tuck-end-v2-template.debug.svg`

## Tuck Flap Changes

- `reverseTuckClosureFlap` now uses the ready RTE proportions in the hidden template assembly: total tuck depth is `W + TFW`, with `TFW` treated as the lip-score offset for this parity pass.
- Leading outer corners are rounded with the documented `TFR` radius and match the ready reference profile for the 120x60x160 default.
- A lip score is emitted as a geometry primitive only. It is not a structural crease.
- Existing lock notch cut guides remain geometry primitives only and are still reference-sensitive.
- The full base edge remains exactly equal to the attach anchor.

## Dust Flap Changes

- `standardDustFlap` is now a tapered trapezoid instead of a rectangle.
- Default taper is proportional to the anchor width, matching the ready RTE shoulder profile at the reference size.
- The base edge remains exactly equal to the side-panel attach anchor.
- The implementation clamps taper so the leading edge remains positive.

## Glue Tab Changes

- `sideGlueSeamTab` now uses beveled top and bottom reliefs instead of a plain rectangle.
- Glue width remains controlled by `GFW`.
- The hinge/base edge remains exactly equal to the attach anchor.
- The no-print glue zone remains geometry-only metadata.

## Remaining Differences

- The clean V2 hidden template still uses the V2 body strip panel naming/order. The overall dimensions and closure part shapes now match the ready RTE reference size, but panel labels and attachment semantics are still V2-native.
- Lip score lines are represented as `GeometryPrimitive` entries. In the app graph adapter they appear on the existing app crease-style geometry layer for SVG display, but they are not `DielineCrease` entries.
- The ready reference dust depth is wider than the documentation's conservative half-width dust-flap rule, so the hidden V2 graph keeps warning metadata for those four dust flaps instead of pretending the proportion is production-verified.
- Lock notch geometry remains an experimental guide from the documentation. Exact notch shape needs reference overlay or prototype validation before any verification status can advance.
- `productionReady` remains false.
