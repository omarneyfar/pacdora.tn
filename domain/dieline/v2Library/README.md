# V2 Folding Box Part Library

This library is a clean V2 foundation for reusable folding-box parts. It is based on `folding-box-documentation.json` and is intentionally not connected to the current recipe engine, catalog, generator registry, or UI.

The parts are designed as Lego-like pieces:

- contracts describe what a part promises to create
- implementations create faces, structural creases, geometry primitives, anchors, and warnings
- anchors are the attachment surface between parts
- only real face-to-face hinges become structural creases
- slots, holes, windows, relief cuts, score guides, glue zones, safe areas, and bleed are geometry primitives only

## Implemented Experimental Parts

- `standardBodyStrip`
- `sleeveBody`
- `sideGlueSeamTab`
- `relievedGlueSeamTab`
- `reverseTuckClosureFlap`
- `straightTuckClosureFlap`
- `fullWidthTuckClosureFlap`
- `lockingLipClosureFlap`
- `standardDustFlap`
- `trapezoidDustFlap`
- `angledBottomDustFlap`
- `bottomLockFlap`
- `circularCutout`
- `roundedSlotCutout`
- `euroSlotCutout`
- `windowCutout`
- `reliefNotch`
- `hangPanel`
- `hangTab`
- `scoreGuide`
- `glueZoneGuide`
- `safeAreaGuide`
- `bleedGuide`

## Spec-Only Contracts

- `snapLockBottomPanel`
- `autoLockBottomPanel`

These remain spec-only because the documentation flags their interlocks, diagonal scores, glue panels, and production behavior as requiring reference or prototype validation.

## Debugging

Run:

```bash
node scripts/verify-v2-part-library.mjs
```

Debug SVGs are written to:

```text
scripts/output/v2-library/parts/
```

## Migration Status

No template migration has been done. Existing V1/V2 recipes and generator paths continue to use the existing engine until a later migration step explicitly connects this library.
