# Tuck End Folding Carton V2 Reference Decomposition

Status: reference-pending custom-closure scaffold.

This document analyzes the supplied reference images for `tuck-end-folding-carton`. It is not production geometry, not a recipe contract, and not a claim that the current hidden `tuckEndFoldingCarton.v2.json` is correct. The current scaffold remains `productionReady: false`, hidden from catalog/product UI, and reference-pending.

## Source Observations

The black debug/reference image and the white labeled reference agree on the broad structure, but the white reference makes the component relationships clearer. This template is not simply RTE or STE plus a slot. It has a reference-specific tuck closure family with long rounded slots, side reliefs, and custom dust flap contours.

Measured values visible in the black reference include:

- Body height around `280.0`.
- Glue/seam tab width around `22.0`.
- Main panel width around `180.5`.
- Side panel depth around `98.0`.
- Top slot length around `125.8`.
- Top slot/slot band height around `36.6`.
- Small top lip/offset around `25.5`.

These values are used only as visual clues. Exact parametric geometry still needs a trusted SVG/DXF fixture and formula verification.

## Body Panel Order

Observed left-to-right order appears to be:

1. Narrow side glue tab on the far left.
2. Main body panel A, roughly the `L` panel.
3. Side body panel A, roughly the `W` panel.
4. Main body panel B, roughly the second `L` panel.
5. Side body panel B, roughly the second `W` panel.

The reference labels appear to use face names such as left/front/right/back, but the visible geometry should drive final naming. The v2 recipe should preserve stable face IDs after the mapping is confirmed, likely with root face on one main panel and the body chain continuing across side/main/side panels.

Existing reusable part fit:

- `body-strip` can probably be reused because it supports configurable panel order and sizes.
- The final recipe must not assume the current RTE/STE face order is correct without mapping it against the reference.

## Glue Tab Position

The glue tab is on the far-left side of the body strip, attached to the first body panel's left edge. It is narrow, full height, and has angled/relieved top and bottom transitions where it meets the closure bands.

Existing reusable part fit:

- `side-glue-tab` may be reusable for the vertical seam if its bevel/relief matches the reference.
- If the reference-specific top and bottom cuts are part of the glue tab outline, a `relieved-side-glue-tab` variant or a `relief-notch` cut primitive is needed.

## Top Closure Components

The top closure is not the current generic `tuck-flap`.

Observed top closure:

- Full-width tuck flap attached to one main panel.
- Tall flap field with rounded outer top corners.
- A horizontal internal score/guide line across the flap.
- A long rounded slot inside the flap, centered horizontally.
- Narrow neck/shoulder transitions near the left and right edges.
- Side relief cuts/notches where the top flap meets neighboring dust flaps/body edges.

Existing reusable part fit:

- `slot-cutout` can represent the long rounded slot after the target flap face is correct.
- `score-line` can represent the internal flap score/guide.
- Current `tuck-flap` is too simple and should not be reused as the final top closure for this template.

Required new part:

- `custom-full-width-tuck-flap` or `slotted-tuck-flap`: creates the reference-specific flap face, rounded outer corners, neck shoulders, internal score, slot anchor/placement area, and relief anchor points.

## Bottom Closure Components

The bottom closure mirrors the same special family, but it is attached to a different main panel than the top closure.

Observed bottom closure:

- Full-width bottom tuck flap.
- Rounded outer corners.
- Long rounded internal slot.
- Internal dashed score/guide line.
- Side relief transitions at body intersections.
- Adjacent dust flaps are not the current simple tapered dust flaps.

Existing reusable part fit:

- `slot-cutout` and `score-line` can be reused after a correct flap face exists.
- Current RTE/STE bottom-tuck attachment logic is not enough because the reference closure relationships differ from both standard RTE and standard STE.

Required new part:

- Same `custom-full-width-tuck-flap`/`slotted-tuck-flap` family must support top and bottom orientation and reference-specific attachment rules.

## Dust Flap Components

The reference dust flaps are custom. They are not just the current stable tapered dust flap.

Observed top dust flaps:

- Attached to side panels along the top edge.
- Mostly rectangular vertical flaps.
- Include rounded or relieved shoulder transitions near body creases.
- Their top height and side relief appear coordinated with the slotted tuck flap height.

Observed bottom dust flaps:

- Attached to side panels along the bottom edge.
- Some have diagonal/angled cut edges.
- Some include rectangular notch-like reliefs.
- Geometry differs depending on whether the dust flap is next to the glue tab, a side panel, or a main slotted flap.

Existing reusable part fit:

- Current `dust-flap` is not sufficient for this reference.

Required new part:

- `custom-dust-flap` or `notched-dust-flap`: supports rectangular, angled, and notched dust flap variants, with attach-to-edge base preserved exactly.

## Slot/Cutout Components

The reference includes long rounded slots inside the top and bottom full-width tuck flaps.

Existing reusable part fit:

- `slot-cutout` should remain available and reusable.
- It is only a primitive. It validates placement and renders a `hole` geometry primitive, but it does not define the closure family.

Required behavior before final recipe:

- Slot must attach to the correct slotted flap face or a validated flap-local area anchor.
- Slot must stay inside the flap face.
- Slot must remain clear of the flap score line and structural crease.
- Slot length/height/inset must be derived from reference formulas, not copied from the temporary scaffold.

## Relief/Notch Components

The reference has several small non-rectangular cut details:

- Shoulder reliefs beside top and bottom slotted tuck flaps.
- Small side cuts at flap/body intersections.
- Glue-tab top/bottom bevel or relief cuts.
- Bottom dust flap notches.
- Possible small curved corner transitions near panel creases.

Existing reusable part fit:

- No dedicated relief/notch part currently exists.

Required new parts:

- `relief-notch`: geometry-only cut primitive for small rectangular, angled, or curved relief cuts.
- `shoulder-relief`: either separate or part of the custom slotted tuck flap generator.

## Structural Crease Relationships

Expected structural creases:

- Vertical body creases between all body panels.
- Glue tab crease between glue tab and first body panel.
- Top slotted tuck flap crease on a main panel top edge.
- Bottom slotted tuck flap crease on a different main panel bottom edge.
- Top dust flap creases on side panel top edges.
- Bottom dust flap creases on side panel bottom edges.

The long rounded slots and relief cuts are not structural creases. They belong in `graph.geometry` as `hole` or `cut` primitives, depending on final export semantics.

## Internal Score/Cut Geometry

Expected internal geometry:

- Internal score/guide lines inside top and bottom slotted tuck flaps.
- Long rounded slots on the `hole` layer.
- Relief/notch cuts on the `cut` or `hole` layer after export semantics are confirmed.
- Labels/debug anchors for reference comparison only.

Internal score lines must remain `GeometryPrimitive` entries, not `DielineCrease`.

## Face Tree Expectation

Expected face tree shape:

- Root face should be a main printable body panel after face naming is confirmed.
- Body panels form a linear chain through vertical structural creases.
- Glue tab is a leaf attached to the first body panel.
- Top slotted tuck flap is a leaf attached to its main panel.
- Bottom slotted tuck flap is a leaf attached to its main panel.
- Dust flaps are leaves attached to their side panels.
- Slot cutouts and relief/notch cuts are not faces and must not appear in `faceTree`.

## Existing Parts That Can Be Reused

Likely reusable:

- `body-strip` for the body chain, after confirming panel order.
- `side-glue-tab` only if its reference-specific relief geometry matches or can be paired with relief cuts.
- `score-line` for internal score/guide lines.
- `slot-cutout` for long rounded slots, after correct target flap faces exist.

Not sufficient as final geometry:

- `tuck-flap`: current shape does not include the reference neck/shoulder, full-width slot layout, or relief behavior.
- `dust-flap`: current generic taper does not match the reference custom dust flap shapes.

## New Parts Required

The first reference-pending custom closure pass now implements these parts or equivalent names:

1. `slotted-tuck-flap`
   - Full-width flap with rounded outer corners.
   - Clean full-width flap body with optional relief cuts for the reference shoulder/neck details.
   - Optional internal score line.
   - Built-in rounded slot placement.
   - Supports top and bottom orientation.

2. `custom-dust-flap`
   - Base edge exactly matches the side panel anchor.
   - Supports a reference-like tapered/shouldered outline plus optional notch cut geometry.
   - Supports top/bottom orientation and side-specific variants.

3. `relief-notch`
   - Geometry-only cut/hole primitive.
   - Can attach to face or edge anchors.
   - Validates distance from structural creases and cut boundaries.

4. `rounded-slot-cutout`
   - Geometry-only long rounded slot primitive.
   - Reusable outside the embedded `slotted-tuck-flap` slot when a future recipe needs an explicit separate cutout part.

5. Optional `relieved-side-glue-tab`
   - Only needed if the existing `side-glue-tab` plus relief notches cannot reproduce the reference glue tab outline.

## Current Custom Part Implementation

Implemented in the component engine:

- `domain/dieline/parts/cutouts/reliefNotch.ts`
- `domain/dieline/parts/cutouts/roundedSlotCutout.ts`
- `domain/dieline/parts/closures/slottedTuckFlap.ts`
- `domain/dieline/parts/closures/customDustFlap.ts`

The hidden recipe now uses:

- `body-strip` with far-left glue tab positioning and a reference-like body order.
- `side-glue-tab` for the seam tab, with relief cuts handled separately.
- `slotted-tuck-flap` for top and bottom main closures.
- Embedded rounded slot geometry inside each slotted tuck flap.
- Embedded score-line geometry inside each slotted tuck flap.
- `custom-dust-flap` for side-panel top/bottom dust flaps.
- `relief-notch` on selected slotted tuck flap side edges.

## Assumptions Made

- The far-left seam tab is modeled with the existing `side-glue-tab` attached to `front.left`; a dedicated `relieved-side-glue-tab` was not added yet because the current visible behavior can be represented by glue-tab plus relief cuts.
- Top main closure is attached to `front.top`; bottom main closure is attached to `back.bottom`, matching the visual clue that the closures live on different body panels.
- Slots are embedded as geometry inside the slotted tuck flaps so they cannot become structural creases or face tree children.
- Relief/notch cuts remain geometry-only and do not create faces.
- The current recipe uses reference-like proportions, not CAD-certified measurements.

## Reference Differences Remaining

- The exact side shoulder/neck profile around the slotted tuck flaps still needs overlay comparison against a trusted fixture.
- The dust flap notches and angled lower dust flap behavior are simplified and may need per-side variants after reference comparison.
- The glue tab top/bottom relief shape is still represented by generic relief cuts rather than a dedicated glue-tab outline.
- Slot length, slot offset, lip score position, and relief notch dimensions are formula estimates.
- Face naming is stable for the engine, but still needs manual comparison against the labeled reference before this template is considered verified.

## Next Visual Verification Checklist

- Overlay the generated `180x98x280` debug SVG against the trusted reference.
- Confirm the top and bottom slotted tuck flaps attach to the correct body panels.
- Confirm slot position, length, and radius match the reference family closely enough for the intended use.
- Confirm relief cuts do not collide with structural creases or glue zones.
- Confirm custom dust flap outlines match the reference on both side panels.
- Confirm 2D renderer, 3D folding, artwork assignment, save/load, and viewer behavior before any catalog exposure.
- Keep `productionReady: false` until CAD/prototype/reference verification is complete.

## Implementation Recommendation

Do not tune `tuckEndFoldingCarton.v2.json` as an RTE/STE variant. The next correct step is:

1. Add a trusted reference fixture for this exact template and size.
2. Confirm face naming and panel order from the reference.
3. Compare the hidden custom-closure scaffold against the trusted fixture.
4. Refine `slotted-tuck-flap`, `custom-dust-flap`, and `relief-notch` from observed overlay differences.
5. Add `relieved-side-glue-tab` only if the glue tab outline cannot be represented safely by `side-glue-tab` plus relief cuts.
6. Generate debug SVGs for every stress size and compare the reference size against the fixture.
