# V2 RTE Visual Parity Review

Status: V2 Reverse Tuck End visual parity stage is locked for the hidden template assembly. This does not expose the V2 library in catalog, UI, generatorRegistry, or current recipe flows.

## V2 Parts Used

- `standardBodyStrip`
- `sideGlueSeamTab`
- `reverseTuckClosureFlap` for the top closure
- `reverseTuckClosureFlap` for the bottom closure
- `standardDustFlap` for top side A and side B dust flaps
- `standardDustFlap` for bottom side A and side B dust flaps

## Dust Flap Handedness Fix

- `standardDustFlap` supports `sidePosition: "left" | "right"`, where the value describes the side that tapers toward the main tuck flap.
- The visible left dust flaps use `sidePosition: "right"` so the outer left side keeps the shoulder profile and the inner right side tapers toward the tuck.
- The visible right dust flaps use `sidePosition: "left"` so the outer right side keeps the shoulder profile and the inner left side tapers toward the tuck.
- The top and bottom dust flaps share the same handedness logic and mirror through the anchor normal.
- The shoulder and relief details are part of the cut outline. They are not `DielineCrease` records.

## Tuck Closure Fix

- `reverseTuckClosureFlap` uses the ready RTE visual proportions in the hidden template assembly.
- The flap base edge exactly matches the body-panel attach anchor.
- The outer leading corners use rounded sampled arcs.
- The lip score is emitted as geometry-only score data and remains out of the structural crease graph.
- Visible lock-notch guide geometry is disabled for this RTE parity target because it caused artifacts not present in the ready reference.

## Glue Tab Status

- `sideGlueSeamTab` remains V2-native and uses beveled relief at the top and bottom.
- Glue width remains controlled by `GFW`.
- The glue seam hinge exactly matches the attach anchor.
- Glue/no-print metadata remains geometry-only.

## Current Visual Status

- The hidden V2 RTE assembly is visually acceptable for the current parity stage.
- The dust flaps are handed and no longer use the old generic symmetric trapezoid behavior.
- The tuck closure and side glue tab are close enough to proceed to the next controlled hidden template.

## Remaining Risks

- Dust flap shoulder transitions are straight-segment approximations, not CAD-authored arcs.
- V2 graph output still requires CAD/prototype review before any production verification claim.
- Lock-notch details remain reference-sensitive and are intentionally not included in the RTE parity output.
- Packaging production tolerances, board grade effects, and machine setup are not verified.

## Stage Constraints

- `productionReady` remains `false`.
- Verification status remains experimental/reference pending.
- No catalog migration was done.
- No UI migration was done.
- `generatorRegistry` was not modified.
- Existing recipes and old V1/experimental parts were not migrated.
