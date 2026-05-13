# Folding Box V2 Migration

The v2 component engine is the official generation path for graph-valid folding-box templates that have JSON recipes and reusable parts.

Current v2-backed folding-box templates:

- Reverse Tuck End: `reverseTuckEndV2`
- Straight Tuck End: `straightTuckEndV2`

## Rules

- New folding-box templates must be JSON recipes composed from reusable TypeScript parts.
- Do not create large one-off template-specific generator files for folding boxes.
- JSON recipes declare parts and parameters; TypeScript parts generate geometry.
- Parts connect through anchors.
- The engine outputs `DielineGraph`.
- `DielineCrease` is structural only.
- Internal score lines are `GeometryPrimitive` entries.

## Legacy Fallback

The v1 generators remain registered as legacy/fallback paths:

- `reverseTuckEnd`
- `straightTuckEnd`

They should not be removed until v2 has reference/CAD/prototype verification and migration coverage for saved-project compatibility.

## Verification Status

V2 RTE and STE are graph-valid and dimension-stable, but they are not production-ready.

Keep `productionReady: false` until trusted reference comparison, CAD/DXF review, and physical prototype or packaging engineer approval are complete.
