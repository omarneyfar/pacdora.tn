# Folding-Carton Generator Engine — Architecture

## Why templates should not each have a huge generator file

Each folding carton (RTE, STE, Full Seal End, etc.) shares ~80% of its logic:
body panel strip, glue tab, dust flaps, crease wiring, faceTree assembly,
geometry primitives, and validation. Duplicating this across files means
every bug fix or geometry improvement must be applied N times.

The engine extracts all shared logic into reusable modules. Templates become
small **recipes** — TypeScript objects that describe structural differences
(which panel gets the tuck flap, where the glue tab goes, etc.).

## Why JSON catalog is not geometry

The JSON catalog (`foldingBoxCatalog.json`) stores **metadata**: labels,
parameter specs, default values, warnings, manufacturing notes, and
verification status. It drives the UI (template picker, parameter editor).

**Real geometry** — face vertices, crease endpoints, polygon math, arc
sampling — lives in TypeScript generators. JSON cannot express conditional
geometry, trigonometric calculations, or parametric relationships.

The catalog tells the UI *what* a template is. The generator tells the
engine *how to draw it*.

## Why recipes are TypeScript, not JSON-only

Recipes are TypeScript objects because:
- They reference closure types as typed enums, not arbitrary strings
- They are validated at compile time
- They can import shared constants
- Future recipes may need computed fields (e.g., conditional closures)
- They compose naturally with the generator function signature

## Why DielineCrease is structural only

`DielineCrease` represents a physical hinge between two faces that folds
in 3D. If a crease has `faceA === faceB`, it is not a hinge — it is an
internal score line (e.g., tuck lip bend mark).

Internal score/guide/prepress lines belong in `GeometryPrimitive` with
`layer: "crease"`. They are rendered visually but do NOT participate in
`faceTree` traversal or 3D folding math.

## Why internal score lines live in GeometryPrimitive

The `geometry` array holds all visual/manufacturing primitives organized
by layer: cut, crease, perf, window, hole, bleed, safe, label.

A score line with `layer: "crease"` renders identically to a structural
crease line in 2D, but:
- It does NOT appear in `graph.creases`
- It does NOT connect two faces
- It does NOT participate in faceTree or 3D folding
- It is purely a manufacturing/visual annotation

## How to add a future folding-carton recipe safely

1. Create `recipes/myNewTemplate.ts`
2. Define a `FoldingCartonRecipe` with the new template's structural layout
3. Export a `generateMyNewTemplate()` wrapper
4. Register it in `generatorRegistry.ts`
5. Add JSON catalog metadata in `foldingBoxCatalog.json`
6. Set `verificationStatus: "geometry-needs-verification"` and
   `productionReady: false` until verified

If the template needs a new closure type (e.g., snap-lock):
1. Add the type to `ClosureType` in `types.ts`
2. Create `closures/snapLock.ts` with the face generation logic
3. Add handling in `generateFoldingCarton.ts`

## Why current templates remain productionReady: false

No template should be marked production-ready until it has:
- Trusted CAD reference comparison
- Visual SVG overlay verification
- Strict graph validation (passing)
- 3D fold animation verification
- Physical prototype or packaging expert sign-off

Current geometry (tuck flap arcs, dust flap tapers, glue tab bevels)
uses approximate proportions that have not been verified against
industry-standard dieline specifications.

## File structure

```
generators/foldingCarton/
├── types.ts                    # Recipe, input, result types
├── parameters.ts               # Parameter normalization + auto-closure
├── bodyStrip.ts                # Body panel strip + glue tab
├── closures/
│   ├── tuckEnd.ts              # Tuck flap face + score lines
│   └── dustFlaps.ts            # Dust flap + panel flap faces
├── faceTree.ts                 # Generic faceTree builder
├── assembleGeometry.ts         # Geometry primitive assembly
├── validation.ts               # Graph validation
├── generateFoldingCarton.ts    # Main entry: recipe → DielineGraph
├── recipes/
│   ├── reverseTuckEnd.ts       # RTE recipe (~100 lines)
│   └── straightTuckEnd.ts      # STE recipe (~90 lines)
└── ARCHITECTURE.md             # This file
```
