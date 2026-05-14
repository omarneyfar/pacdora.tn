# V2 Folding Box Part Library

This is a clean, independent V2 folding-box part library based on `folding-box-documentation.json`.

It is not connected to the current recipe engine, generator registry, catalog, or UI. Existing templates are not migrated here yet.

## Rules

- Contracts describe what each Lego-like part promises to create.
- Implementations create faces, structural creases, geometry primitives, anchors, and warnings.
- Only real face-to-face hinges become structural creases.
- Slots, holes, windows, relief cuts, perforations, score guides, glue zones, safe areas, bleed areas, no-print zones, and film patches are geometry primitives only.
- `productionReady` remains `false` for every part.
- Complex mechanisms stay `spec-only` or `partial-experimental` until CAD/reference/prototype validation exists.

## Families

- Body systems
- Glue systems
- Top closures
- Dust flaps
- Bottom closures
- Lock tabs and slots
- Cutouts
- Hang and display features
- Handles
- Windows
- Tear and perforation
- Internal structures
- Mount structures
- Skillet / tray structures
- Reversible lids
- Gusset structures
- Guide and print helpers

## Implemented Experimental

- `standardBodyStrip`
- `sleeveBody`
- `sideGlueSeamTab`
- `relievedGlueSeamTab`
- `standardTuckClosureFlap`
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
- `internalScoreGuide`
- `noPrintZoneGuide`
- `filmGlueZoneGuide`
- `windowFilmPatchGuide`
- `barcodeSafeZoneGuide`

## Partial Experimental

- `centeredTuckClosureFlap`
- `snapLockMajorFlap`
- `snapLockMinorFlap`
- `snapLockTongue`
- `snapLockReceiverSlot`
- `autoLockMajorFlap`
- `autoLockMinorFlap`
- `autoLockGluePanel`
- `autoLockDiagonalScore`
- `fullFlapBottomPanel`
- `bottomGlueZone`
- `lockTab`
- `lockSlot`
- `lockingTuckFlap`
- `catalogLockFlap`
- `snapLockingLip`
- `lockReliefNotch`
- `foldedHandle`
- `arcHandle`
- `handleBridge`
- `handleCutout`
- `handleReinforcementPanel`
- `tearStrip`
- `perforationStrip`
- `tearPullTab`
- `tearNotch`
- `sealFlap`
- `centeredDivider`
- `integratedPartition`
- `builtInInsert`
- `productMount`
- `internalHolder`
- `compartmentGrid`
- `partitionLockSlot`
- `partitionGlueZone`
- `trayBody`
- `traySideWall`
- `trayCornerTab`
- `skilletBody`
- `skilletLid`
- `separatedSkilletBase`
- `separatedSkilletLid`
- `skilletSideWall`
- `skilletCornerLock`
- `skilletInsertPanel`
- `skilletSnapSlot`
- `reversibleLid`
- `reversibleLidLockTab`
- `reversibleLidReceiverSlot`
- `lidInsertPanel`
- `gussetTrianglePanel`
- `gussetCover`
- `gussetSidePanel`
- `gussetDiagonalScore`

## Spec Only

- `snapLockBottomPanel`
- `autoLockBottomPanel`
- `crashBottomPanel`
- `reversibleLidHinge`
- `gussetRoofPanel`
- `roofRidgeCrease`

These are intentionally delayed because the documentation marks their geometry, hinges, diagonal scores, or registration behavior as requiring reference/prototype validation. They have contracts but no geometry implementation.

## Adding A Part

1. Add or update its contract in `contracts/foldingBoxPartContracts.ts`.
2. Choose `implemented-experimental`, `partial-experimental`, or `spec-only`.
3. Add a V2-only implementation under the matching `parts/` family folder when feasible.
4. Register the implementation in `registry/partRegistry.ts`.
5. Add debug parameters or attach-target handling in `debug/generatePartDebugGraph.ts`.
6. Run `node scripts/verify-v2-part-library.mjs`.

## Debug Verification

Run:

```bash
node scripts/verify-v2-part-library.mjs
```

Outputs:

```text
scripts/output/v2-library/parts/
scripts/output/v2-library/v2-part-library-summary.json
```

The verifier checks contract coverage, `productionReady: false`, spec-only isolation, finite geometry, duplicate IDs, self-intersecting faces, and geometry-only primitives not becoming structural creases.

## Migration Status

No template migration has been done. Existing V1/V2 recipes, generator registry, catalog, and UI are not connected to this library yet.
