# V2 RTE Part Parity Review

Status: hidden V2 template assembly only. No catalog, UI, generator registry, or recipe migration has been done.

Reference compared:
- `scripts/output/component-engine/reverse-tuck-end-v2-120x60x160.debug.svg`
- `scripts/output/v2-library/templates/reverse-tuck-end-v2-template.debug.svg`

## Tuck Flap Changes

- `reverseTuckClosureFlap` now uses the ready RTE proportions in the hidden template assembly: total tuck depth is `W + TFW`, with `TFW` treated as the lip-score offset for this parity pass.
- Leading outer corners are rounded with the documented `TFR` radius and match the ready reference profile for the 120x60x160 default.
- A lip score is emitted as a geometry primitive only. It is not a structural crease.
- Visible lock notch cut guides are disabled for the reverse tuck reference shape because they created a kinked side artifact that does not appear in the ready RTE SVG.
- The full base edge remains exactly equal to the attach anchor.
- The hidden RTE assembly now attaches the top tuck to the front panel and the bottom tuck to the back panel, matching the ready/reference RTE closure placement.

## Dust Flap Changes

- `standardDustFlap` now accepts `sidePosition: "left" | "right"` where the value means the side that tapers toward the main tuck flap.
- The visual left dust flaps pass `sidePosition: "right"` so their right side tapers toward the tuck while the outer left side keeps the stepped shoulder.
- The visual right dust flaps pass `sidePosition: "left"` so their left side tapers toward the tuck while the outer right side keeps the stepped shoulder.
- Top and bottom dust flaps use the same handedness logic, with the anchor normal mirroring the geometry vertically.
- The shoulder/relief is integrated into the cut outline instead of emitted as a floating geometry primitive.
- The outer side now uses a two-step lower shoulder and a slight inward lean, matching the reference close-up more closely than the earlier square notch/vertical wall.
- The inner tapered side now has a small lower return kink before the base, so the dust flap no longer drops from the free edge to the hinge as one plain diagonal.
- The base edge remains exactly equal to the side-panel attach anchor.
- The implementation clamps taper so the leading edge remains positive.

## Glue Tab Changes

- `sideGlueSeamTab` now uses beveled top and bottom reliefs instead of a plain rectangle.
- Glue width remains controlled by `GFW`.
- The hinge/base edge remains exactly equal to the attach anchor.
- The no-print glue zone remains geometry-only metadata.

## Remaining Differences

- The clean V2 hidden template uses a hidden `side-front-side-back` body layout hint so the visual coordinates align with the ready RTE. The default `standardBodyStrip` order remains unchanged for other callers.
- Panel IDs and labels remain V2-native (`sideA`, `front`, `sideB`, `back`) rather than the ready engine's display labels (`left`, `front`, `right`, `back`).
- Lip score lines are represented as `GeometryPrimitive` entries. In the app graph adapter they appear on the existing app crease-style geometry layer for SVG display, but they are not `DielineCrease` entries.
- The ready reference dust depth is wider than the documentation's conservative half-width dust-flap rule, so the hidden V2 graph keeps warning metadata for those four dust flaps instead of pretending the proportion is production-verified.
- The dust flap corner transitions are still straight-segment approximations rather than true CAD arcs; this remains a visual parity approximation until CAD reference geometry is available.
- Lock notch geometry remains reference-sensitive and is intentionally not visible in this RTE parity output.
- `productionReady` remains false.
