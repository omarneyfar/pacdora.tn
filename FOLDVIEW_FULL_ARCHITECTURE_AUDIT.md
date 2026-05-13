# FoldView Full Architecture Audit

## Audit Scope

Repository analyzed: `omarneyfar/pacdora.tn`, branch `realistic-dieline`.

Requested output: `FOLDVIEW_FULL_ARCHITECTURE_AUDIT.md`.

This audit is intentionally **read-only**. It does not modify, refactor, or patch any code. The focus is to understand the current real architecture before fixing Reverse Tuck End or any other dieline issue.

Important limitation: I could not clone the repository directly from the execution container, so the audit is based on GitHub repository inspection and targeted file reads of the important architecture files. Some secondary UI/API files should still receive deeper inspection before production changes.

---

# 1. Executive Summary

FoldView is a Next.js / React / TypeScript application for packaging dieline generation, 2D dieline preview, artwork assignment, 3D carton mockup rendering, and project save/load/publish workflows.

The project currently contains **three architectural layers at the same time**:

1. **Legacy packaging/project layer**
   - Still centered around a fixed folding-carton concept and dimensions.
   - Older model still knows classic carton dimensions and project save/load contracts.

2. **Dynamic DielineGraph layer**
   - A more correct architecture for real packaging.
   - Uses dynamic faces, structural creases, cut paths, metadata, geometry primitives, and a face tree.

3. **Catalog + generator layer**
   - A JSON catalog describes templates, UI parameters, warnings, variants, and runtime generator IDs.
   - TypeScript generators or recipe-based generators produce real `DielineGraph` objects.

The strongest direction in the codebase is the move toward `DielineGraph` as the single runtime source for 2D, 3D, persistence, and viewer rendering.

The biggest architectural risks are:

- **Template catalog and real generators are not the same thing.** The JSON catalog can describe many templates, but only registered generators can create usable geometry.
- **Reverse Tuck End is now generated through v2 recipe/component logic, not directly inside `templates/reverseTuckEnd.ts`.** The old file is only a compatibility re-export.
- **3D folding depends on `faceTree`, crease correctness, and inferred fold direction.** A correct 2D dieline can still fold incorrectly if parent-child relationships or crease direction are wrong.
- **Persistence can store dynamic graph data, but only if the client payload sends it.** The save path is improved compared to older six-face assumptions, but generated template projects still need verification end-to-end.
- **Validation is strict for structural creases.** Internal score lines must remain `geometry` primitives, not `creases`.

The next correct action is **not** adding more templates. The next correct action is to make one exact template, Reverse Tuck End, fully verifiable from generator → 2D → 3D → save/load → published viewer.

---

# 2. Current Project Purpose

FoldView is trying to become a lightweight Pacdora-like packaging system, focused on:

- Template catalog
- Parametric dieline generation
- Folding box templates
- 2D SVG/Canvas-style dieline rendering
- Cut / crease / bleed / safe / glue / guide layer rendering
- Artwork assignment to dynamic faces
- Crop and texture mapping
- 3D carton mockup preview
- Project save / load
- Project publish / public viewer
- Future print production support

Current maturity:

| Area | Status |
|---|---|
| Legacy project builder | Most stable |
| Dynamic `DielineGraph` model | Good direction |
| Template catalog | Present, metadata-heavy |
| Reverse Tuck End | Implemented through v2 recipe, needs geometry verification |
| Generic folding box system | Useful, but not production-trusted yet |
| 2D rendering | Functional |
| 3D rendering | Functional but fold correctness depends on graph quality |
| Artwork assignment | Dynamic face IDs are supported in Redux |
| Save/load/publish | Present, but needs generated-template verification |
| Production export | Not ready without golden fixtures |

---

# 3. Folder-by-Folder Architecture

## app/

### Purpose

Next.js App Router entrypoints and API route boundaries.

### Key responsibilities

- Page routing
- API route composition
- Passing route params into feature components
- Keeping server/client boundaries clean

### What logic should be here

- Route-level page composition
- API request/response handling
- Minimal glue code

### What logic should NOT be here

- Geometry formulas
- Dieline graph construction
- Fold math
- Artwork crop math
- Persistence normalization logic
- Catalog normalization logic

### Current problems

The routes appear mostly thin, which is good. The deeper risk is not in `app/`, but in whether the page flows connect to the correct generator, renderer, save, and viewer pipelines.

Important routes include:

- `app/dielines/foldingBox/[templateSlug]/page.tsx`
- `app/dielines/foldingBox/reverseTuckEnd/page.tsx`
- `app/api/dielines/*`
- `app/api/projects/*`
- `app/view/[id]/*`
- `app/project/[id]/edit/*`

---

## domain/

### Purpose

Pure domain logic.

### Important subfolders

- `domain/dieline/`
- `domain/dielines/`
- `domain/packaging/`
- `domain/projects/`

### Current problem

There is still a split between:

- old packaging/project assumptions
- new dynamic dieline graph assumptions

This is not automatically wrong, but it must be clearly separated. The legacy packaging layer should gradually become a compatibility layer, not the source of truth for dynamic dielines.

---

## domain/dieline/

### Purpose

Core dynamic dieline architecture.

### Key files / areas

- `types.ts`
- `geometry.ts`
- `fold3d.ts`
- `validation.ts`
- `validation/validateDielineGraph.ts`
- `templateRegistry.ts`
- `catalog/*`
- `generators/*`
- `componentEngine/*`
- `parts/*`
- `recipes/*`
- `templates/*`

### Current DielineGraph model

`DielineGraph` contains:

- `size`
- `faces`
- `creases`
- `cutPaths`
- `faceTree`
- optional `geometry`
- optional `metadata`
- optional `source`
- optional `sourceSvg`

This is the correct central data model.

### Current problems

The folder currently contains both older exact/generic generator files and newer component-engine recipe files. That can be acceptable, but the system needs stronger naming and status boundaries:

- `legacy`
- `v2 recipe`
- `experimental`
- `production-ready`
- `catalog-only`

---

## domain/dieline/templates/

### Purpose

Compatibility layer and older template generators.

### Important files

- `reverseTuckEnd.ts`
- `straightTuckEnd.ts`
- `foldingCartonGraph.ts`
- `foldingBoxVariants.ts`
- other box-specific template files

### Current Reverse Tuck End situation

`domain/dieline/templates/reverseTuckEnd.ts` is no longer the real implementation. It re-exports from:

`domain/dieline/generators/foldingCarton/recipes/reverseTuckEnd`

So changes made only in `templates/reverseTuckEnd.ts` will not fix the real geometry unless they affect the underlying reusable engine or recipe.

### Real vs generic vs experimental

| File / System | Role | Production confidence |
|---|---|---|
| `templates/reverseTuckEnd.ts` | Compatibility export | Low ownership |
| `generators/foldingCarton/recipes/reverseTuckEnd.ts` | Legacy reusable engine RTE recipe | Medium, still approximate |
| `recipes/foldingBox/reverseTuckEnd.v2.json` | v2 recipe used by registry alias | Important, needs verification |
| `componentEngine/*` | v2 recipe execution engine | High architectural importance |
| `foldingBoxVariants.ts` | generic approximation | Experimental |
| catalog JSON | metadata/UI/routing | Not geometry truth |

---

## domain/dieline/generators/foldingCarton/

### Purpose

Reusable folding-carton engine.

### Key files

- `generateFoldingCarton.ts`
- `bodyStrip.ts`
- `closures/tuckEnd.ts`
- `closures/dustFlaps.ts`
- `faceTree.ts`
- `parameters.ts`
- `assembleGeometry.ts`
- `validation.ts`
- `types.ts`

### What it does

This engine receives a `FoldingCartonRecipe`, normalizes dimensions, builds a horizontal body strip, creates top/bottom closures, creates structural creases, assembles geometry/cut paths, builds a `faceTree`, adds metadata, validates the graph, then returns a `DielineGraph`.

### Current strengths

- Clear separation of body strip, closure faces, geometry assembly, face tree, and validation.
- Good step-by-step architecture.
- Internal score lines are now represented as `geometry` primitives, which is better than self-referencing structural creases.

### Current risks

- The comments repeatedly say closure geometry is approximate and needs verification.
- Tuck flap lip/slit/arc proportions are not verified against production references.
- Dust flap taper and glue tab bevel proportions are approximate.
- `crease.direction` is hardcoded to `1`.
- Fold direction still relies heavily on inference in `fold3d.ts`.

---

## domain/dieline/componentEngine/

### Purpose

Newer v2 recipe-driven generator engine.

### Key files

- `generateFromRecipe.ts`
- `graphAssembler.ts`
- `partRegistry.ts`
- `formulaResolver.ts`
- `validateRecipe.ts`
- `types.ts`

### What it does

The v2 engine reads JSON recipes, resolves parameters and constraints, runs reusable part generators, collects faces/creases/geometry/anchors/parts/faceTree hints, assembles a `DielineGraph`, and validates it.

### Important flow

```text
recipe JSON
  → validateRecipe
  → resolveRecipeParameters
  → evaluateRecipeConstraints
  → partRegistry generators
  → assembleGraphFromContext
  → assertValidDielineGraph
  → DielineGraph
Current strengths
Better long-term architecture than one-off template generators.
Reusable part system makes templates composable.
Validation is called immediately after graph assembly.
Current risks
Component recipes can look correct in JSON while generating invalid geometry if part anchors are wrong.
Face-tree assembly derives from hints/creases; if hints are missing or ambiguous, 3D can fold incorrectly.
Recipe-based geometry must be checked against golden fixtures before being trusted.
domain/dieline/parts/
Purpose

Reusable generator parts for the component engine.

Known part families
body strip
glue tab
tuck flap
slotted tuck flap
dust flap
custom dust flap
panel flap
lock tab
cutouts
hang tab
guide/score-line parts
Current problems

Reusable parts are the correct long-term direction, but every part needs a reference fixture and strict geometric tests. Otherwise one broken generic part can break many templates.

domain/dieline/recipes/
Purpose

JSON recipes used by the v2 component engine.

Important recipes
reverseTuckEnd.v2.json
straightTuckEnd.v2.json
tuckEndFoldingCarton.v2.json
centeredTuckEndCarton.v2.json
lockingTabTopBottom.v2.json
circularHangHole.v2.json
hangTab.v2.json
Current Reverse Tuck End v2 recipe

The v2 recipe defines:

body strip
glue tab attached to back.right
top tuck attached to front.top
top dust flaps attached to left.top and right.top
bottom tuck attached to back.bottom
bottom dust flaps attached to left.bottom and right.bottom
folding root face: front

This is structurally reasonable for Reverse Tuck End.

Current risks

The recipe says productionReady: false and verificationStatus: geometry-needs-verification. This should be respected. It should not be marketed or treated as a real production-ready dieline yet.

domain/dieline/catalog/
Purpose

Catalog metadata, UI parameters, template discovery, generator selection, and runtime status.

Important files
foldingBoxCatalog.json
catalogTypes.ts
loadTemplateCatalog.ts
normalizeTemplateCatalog.ts
resolveTemplateParameters.ts
generateGraphFromCatalogTemplate.ts
validateTemplateCatalog.ts
formulaEngine.ts
parameterAliases.ts
Correct usage

The JSON catalog should be used for:

template list
labels
descriptions
UI parameter definitions
variants
warnings
production status
generator ID routing
metadata
What it should NOT be used for

The JSON catalog should not be treated as full real geometry unless it contains exact part-level geometry definitions and has fixtures. Real production geometry should come from:

TypeScript generator or component-engine recipe
Current problem

There are more catalog entries than truly verified generator outputs. UI must clearly distinguish:

implemented
experimental
catalog-only
production-ready
needs manual verification
features/
Purpose

User-facing workflows.

Important modules
features/dieline-builder/
features/builder/
features/artwork/
features/dielines/
features/projects/
features/viewer/
features/dieline-builder/
Purpose

Template-specific dieline generator UI.

Key files
DielineBuilderShell.tsx
DielineViewport.tsx
TemplateParameterPanel.tsx
LayerControls.tsx
ExportActions.tsx
Current flow
route category + slug
  → get template from registry
  → merge parameter values
  → template.generate(...)
  → graph
  → 2D viewport or 3D mockup
  → export actions
Current problems
The “Create Artwork” button is disabled.
This new builder is not fully unified with the main artwork/project builder.
It can generate and preview a dieline, but it is not clearly connected to save/load/publish as a project workflow.
features/builder/
Purpose

Main project builder: artwork, crop, 2D preview, 3D stage, save/share.

Important files
DielineCartonStage.tsx
components/DielineRenderer.tsx
components/CropModal.tsx
builder panels and shells
Current 3D flow

DielineCartonStage.tsx receives:

graph
faces: Record<string, string>

Then:

graph
  → buildFoldedModel(graph)
  → solved 3D faces
  → THREE.ShapeGeometry
  → UVs from local bounds
  → optional texture per faceId
Current 3D risks
UV mapping is simple bounds-based mapping.
Texture rotation/crop may not match all arbitrary polygons.
Fold direction is inferred from geometry.
If faceTree is wrong, 3D is wrong even if 2D looks correct.
If crease endpoints are not exactly on both connected face boundaries, folding can still render but may be structurally wrong.
store/
Purpose

Redux state for project builder and artwork.

Key files
builderSlice.ts
artworkSlice.ts
uiSlice.ts
Dynamic face support

artworkSlice.ts uses:

type FaceAssets = Record<string, FaceAsset>

This is correct because dynamic graph face IDs are supported.

Current risks
builderSlice.ts supports setTemplateDieline, setImportedDieline, and setLibraryDieline, which is good.
The real risk is whether every UI flow actually dispatches setTemplateDieline before saving.
If a generated template graph is only previewed in DielineBuilderShell and never placed into builder state, it will not be saved as a project.
hooks/
Purpose

Builder orchestration.

Important hooks
useArtworkWorkspace.ts
useDimensionSync.ts
useInitialDieline.ts
useProjectPersistence.ts
Current risk

Hooks are likely where old builder state and new graph state meet. This area should be inspected before changing persistence or artwork assignment.

server/
Purpose

Project and dieline persistence.

Important files
server/projects/service.ts
server/dielines/service.ts
server/dielines/seedDielines.ts
Project persistence

server/projects/service.ts supports:

local file storage
Supabase storage
project metadata
face images
source artwork
dynamic workspace
optional workspace dieline graph
Current strengths

The server can store a dynamic workspace.dieline.

Current risk

The server only persists what the client sends. If the client does not send generated-template graph data, persistence cannot recover it.

utils/
Purpose

Project payloads, migration, helper logic.

Important files
projectPayload.ts
migrateProject.ts
Current state

projectPayload.ts is much better than a purely legacy version because it can include:

dielineSource
dielineTemplateId
templateSlug
generatorId
userParameters
resolvedParameters
graph
Current risk

The payload still falls back to FOLDING_CARTON_TEMPLATE_ID when no dielineTemplateId is present. Therefore every generated template workflow must ensure the builder state includes the correct template graph and template ID before save.

supabase/
Purpose

Database schema and Supabase setup.

Current risk

Supabase can support dynamic graphs if workspace is stored as JSON. But schema verification is required. A real test should save and reload:

project status
template ID
dimensions
workspace.dieline.graph
workspace.faceAssets
source artwork
published viewer output
fixtures/ and scripts/
Purpose

Verification.

Important scripts
verify:catalog
verify:dieline
verify:visual
Current missing tests
Reverse Tuck End golden SVG fixture
Reverse Tuck End expected face/crease/tree JSON fixture
3D folded bounding snapshot
save/load/publish roundtrip test
generated template viewer test
dynamic face artwork persistence test
production export comparison
4. File-by-File Analysis
File	Purpose	Inputs	Outputs	Used By	Risk	Notes
domain/dieline/types.ts	Core model	none	TypeScript types	all graph systems	Low	Strong central model.
domain/dieline/templates/reverseTuckEnd.ts	Compatibility export	none	re-export	legacy imports	Medium	Not real implementation now.
domain/dieline/generators/foldingCarton/recipes/reverseTuckEnd.ts	Legacy reusable RTE recipe	dimensions	graph via engine	legacy registry fallback	High	Marked geometry-needs-verification.
domain/dieline/generators/foldingCarton/generateFoldingCarton.ts	Folding carton engine	input + recipe	DielineGraph	legacy generator	High	Good architecture; formulas need proof.
domain/dieline/generators/foldingCarton/bodyStrip.ts	Body panels + glue tab	normalized params	body faces/columns	folding engine	High	Panel order assumes alternating W/L/W/L.
domain/dieline/generators/foldingCarton/closures/tuckEnd.ts	Tuck flap geometry	closure params	flap face + score line	folding engine	Critical	Approximate tuck/lip/arc geometry.
domain/dieline/generators/foldingCarton/closures/dustFlaps.ts	Dust/panel flaps	closure params	flap faces	folding engine	High	Approximate taper.
domain/dieline/generators/foldingCarton/faceTree.ts	Legacy engine face tree	recipe + creases	faceTree	folding engine	Critical	3D depends on this.
domain/dieline/generators/foldingCarton/validation.ts	Legacy engine validator	graph	throws/errors	folding engine	Critical	Requires structural crease correctness.
domain/dieline/generators/generatorRegistry.ts	Generator map	generator ID	graph generator	catalog/template registry	Critical	Public aliases now point to v2 recipes.
domain/dieline/recipes/foldingBox/reverseTuckEnd.v2.json	v2 RTE recipe	parameter values	recipe config	component engine	Critical	Current main RTE path.
domain/dieline/componentEngine/generateFromRecipe.ts	v2 recipe runner	JSON recipe + values	DielineGraph	generator registry	Critical	Correct future direction.
domain/dieline/componentEngine/graphAssembler.ts	Creates final graph	faces/creases/hints	graph + tree	v2 engine	Critical	Tree correctness depends on hints/creases.
domain/dieline/componentEngine/partRegistry.ts	Part registry	part type	part generator	v2 engine	High	Broad reusable system.
domain/dieline/validation/validateDielineGraph.ts	Strict graph validator	graph	result / throws	v2 engine/scripts	Critical	Internal scores must not be creases.
domain/dieline/fold3d.ts	3D fold solver	graph	solved 3D model	DielineCartonStage	Critical	Fold direction is inferred.
features/dieline-builder/DielineBuilderShell.tsx	Template builder UI	route slug + params	2D/3D/export UI	template pages	High	Not integrated with project save/artwork.
features/builder/DielineCartonStage.tsx	3D renderer	graph + face textures	Three.js scene	builder/viewer	High	UV mapping is bounds-based.
store/artworkSlice.ts	Artwork state	sources/assets	Redux state	builder	Medium	Dynamic face IDs supported.
store/builderSlice.ts	Builder/project state	actions/project	Redux state	builder/persistence	High	Good graph fields; must be used consistently.
utils/projectPayload.ts	Save/patch payload	builder state	API payload	persistence hook	High	Can save graph if state has it.
server/projects/service.ts	Project persistence	project input	stored project	API routes	High	Supports workspace graph; client must send it.
features/viewer/ProjectViewer.tsx	Public viewer	project ID	readonly 3D preview	/view/:id	High	Renders dynamic graph if project contains one.
5. Core Data Models
DielineGraph

The central runtime object.

Expected fields:

size
faces
creases
cutPaths
geometry
faceTree
metadata
source
sourceSvg

Ownership:

Generators create it.
Validators verify it.
2D renderers draw it.
3D solver folds it.
Persistence stores it.
Viewer should render it read-only.
DielineFace

Represents a printable or structural polygon.

Important fields:

id
label
vertices
bounds
centroid
role
artworkEnabled

Critical rule:

id must be stable because artwork assignment is keyed by face ID.

DielineCrease

Represents only structural hinges between two faces.

Important fields:

id
faceA
faceB
edgeStart
edgeEnd
foldAngle
direction
optional foldSemantic

Critical rule:

Internal score lines should be stored in geometry, not creases.

DielineFaceNode / faceTree

Defines 3D parent-child folding hierarchy.

Important fields:

faceId
creaseId
children

Critical rule:

A graph can look good in 2D and still fold badly if faceTree is wrong.

Project

Current project model includes:

identity
status
template ID
dimensions
faces
workspace
optional dynamic workspace.dieline

Critical risk:

The project is correct only if the dynamic graph is saved in workspace.dieline.graph.

ArtworkSource / FaceAsset

Artwork flow supports:

source uploaded artwork
crop settings
rendered face image
assignment by dynamic face ID

This is a strong part of the architecture.

6. End-to-End Data Flow
Template generation flow
User opens template page
  → app/dielines/foldingBox/[templateSlug]/page.tsx
  → DielineBuilderShell
  → getDielineTemplateByRoute
  → catalog/template registry
  → generatorRegistry
  → v2 recipe generator OR legacy generator
  → DielineGraph
  → validateDielineGraph
  → DielineViewport / DielineCartonStage
v2 recipe flow
recipe JSON
  → validateRecipe
  → resolveRecipeParameters
  → evaluateRecipeConstraints
  → partRegistry
  → reusable part generators
  → graphAssembler
  → assertValidDielineGraph
  → DielineGraph
2D preview flow
DielineGraph
  → graph.geometry if available
  → cut primitives
  → crease primitives
  → labels/guides
  → SVG viewport
3D mockup flow
DielineGraph
  → buildFoldedModel
  → traverse faceTree
  → rotate children around crease line
  → FoldedFace3D[]
  → ShapeGeometry per face
  → UV from local bounds
  → texture from faces[faceId]
Artwork flow
User uploads artwork
  → ArtworkSource
  → crop modal
  → rendered face asset
  → artworkSlice.faces[faceId]
  → selectPreviewFaces
  → DielineCartonStage textures
Save/load/publish flow
Redux builder + artwork state
  → createFullProjectPayload
  → API route
  → server/projects/service.ts
  → local JSON or Supabase
  → read project
  → migrate project
  → hydrate builder/artwork
  → viewer renders workspace.dieline.graph
7. Template System Analysis
How templates are registered

generatorRegistry.ts maps generator IDs to actual generator functions.

Current important generator IDs include:

reverseTuckEnd
straightTuckEnd
reverseTuckEndV2
straightTuckEndV2
tuckEndFoldingCartonV2
centeredTuckEndCartonV2
lockingTabTopBottomV2
circularHangHoleV2
hangTabV2
legacy fallback aliases

Important observation:

The public aliases reverseTuckEnd and straightTuckEnd now call v2 recipe generators, not the older TypeScript folding-carton recipe directly.

How template IDs/slugs work

The catalog gives the user-facing identity and route identity. The generator registry gives the runtime geometry identity.

These must remain connected but not confused.

Parameter specs

Parameters can come from:

catalog JSON
v2 recipe JSON
legacy TypeScript specs

This is flexible, but can create mismatches. Parameter resolution should be tested per template.

CEFBox definitions

CEFBox-style information should be treated as reference/metadata unless converted into verified generator parts.

Exact generator vs generic generator

Exact / intended production path:

catalog entry
  → generatorId
  → v2 recipe or exact TypeScript generator
  → validated DielineGraph

Risky path:

catalog entry
  → generic approximation
  → visually plausible but not verified
Safe templates

No template should be called production-safe until it has:

golden 2D fixture
graph fixture
3D fold verification
save/load test
export test

Current RTE is implemented but still explicitly marked not production-ready.

8. Reverse Tuck End Deep Analysis
Current implementation path

Main public generator path:

generatorRegistry.reverseTuckEnd
  → generateReverseTuckEndV2
  → reverseTuckEnd.v2.json
  → componentEngine.generateFromRecipe
  → graphAssembler
  → assertValidDielineGraph

Compatibility path:

templates/reverseTuckEnd.ts
  → generators/foldingCarton/recipes/reverseTuckEnd.ts
  → generateFoldingCarton

This means there are at least two RTE-capable systems:

v2 recipe system
legacy reusable folding-carton engine

The registry currently favors the v2 recipe system.

RTE v2 parts

The v2 recipe creates:

body strip
left
front
right
back
glue tab
attached to back.right
top tuck
attached to front.top
top dust left
attached to left.top
top dust right
attached to right.top
bottom tuck
attached to back.bottom
bottom dust left
attached to left.bottom
bottom dust right
attached to right.bottom
Top closure

Top closure is modeled as:

front top tuck flap
left top dust flap
right top dust flap
Bottom closure

Bottom closure is modeled as:

back bottom tuck flap
left bottom dust flap
right bottom dust flap

That matches the basic idea of a Reverse Tuck End box: top and bottom tuck flaps are on opposite main panels.

Glue tab

Glue tab is attached to the right edge of the back panel.

2D structural correctness

Likely structurally close, but not proven.

Reasons:

recipe structure is good
validation is called
geometry is marked geometry-needs-verification
closure proportions are formula-based and approximate
3D correctness

Not guaranteed.

Reasons:

fold direction is inferred
crease.direction may not carry enough semantic intent
tuck and dust flap order in 3D is not necessarily physically staged
a mockup can look acceptable while still being geometrically inaccurate
Suspicious areas
Tuck flap geometry proportions
Dust flap taper
Glue tab bevel
Generated cut path exterior union
Fold direction for top vs bottom closure
UV mapping on non-rectangular faces
Export paths from sampled arcs
Whether v2 and legacy RTE produce different structures
Reverse Tuck End Verification Checklist
Required faces
left
front
right
back
glue-tab
top-tuck
top-dust-left
top-dust-right
bottom-tuck
bottom-dust-left
bottom-dust-right
Required structural creases
left/front
front/right
right/back
back/glue-tab
front/top-tuck
left/top-dust-left
right/top-dust-right
back/bottom-tuck
left/bottom-dust-left
right/bottom-dust-right
Required internal geometry
tuck lip score line on top tuck
tuck lip score line on bottom tuck
optional notches/reliefs if recipe includes them
Expected parent-child relationships

Root should be front.

Expected tree:

front
  left
    top-dust-left
    bottom-dust-left
  right
    back
      glue-tab
      bottom-tuck
    top-dust-right
    bottom-dust-right
  top-tuck

Exact nesting may vary, but every face must appear once and every child must be connected by a valid crease.

Expected 2D visual structure
Four body panels in strip order: left, front, right, back
Glue tab after back
Top tuck above front
Bottom tuck below back
Dust flaps above/below side panels
No accidental duplicate face overlap
Cut path follows exterior perimeter only
Creases lie on shared boundaries
Expected 3D folded result
Front is the root/visible main panel
Side panels fold 90°
Back panel closes the tube
Glue tab folds inward/outward consistently
Dust flaps fold inward
Top tuck and bottom tuck fold into opposite ends
No panel floats away from hinge
No panel folds through the box body
9. Generic Folding Box Generator Analysis

The generic generator approach is useful for exploring catalog variants, but it should not be trusted for production dielines.

What it tries to do
Create reusable patterns for folding box variants
Avoid writing a fully custom generator for every template
Approximate panels and closures from high-level metadata
What is risky
Real packaging templates often have small structural differences.
Tuck flaps, locks, dust flaps, reliefs, shoulders, notches, and glue panels are not interchangeable.
A visually plausible 2D outline can still fail in manufacturing.
A generic faceTree can be valid but physically wrong.
Recommendation

Generic generator output should be labeled:

experimental / preview only / requires manual verification

Use it for UI and prototyping, not production export.

10. JSON Catalog / Database Analysis
What it contains

The catalog likely contains:

template IDs
slugs
labels
descriptions
categories
parameter definitions
variant info
source info
runtime generator ID
production status
warnings
manufacturing notes
What it should be used for
UI catalog
template discovery
parameter panel
routing
warnings
metadata
generator lookup
What it should NOT be used for
production geometry unless it contains verified parametric part geometry
automatic manufacturing claims
exact clone claims
replacing TypeScript/component generators
Missing or risky fields

Each production template should eventually include:

productionReady
verificationStatus
generatorId
generatorVersion
goldenFixtureId
expectedFaceIds
expectedCreaseIds
expectedPartIds
referenceSource
knownLimitations
lastVerifiedAt
Suggested normalized schema
TemplateCatalogEntry {
  id
  slug
  category
  label
  description
  parameters
  runtime: {
    generatorId
    generatorVersion
    status
  }
  productionStatus: {
    productionReady
    verificationStatus
    riskLevel
    warning
  }
  references: {
    goldenSvg?
    goldenGraph?
    sourceNotes?
  }
}
11. 2D Rendering Pipeline
Inputs
DielineGraph
visible layer settings
optional face artwork
Drawn layers
cut
crease
perf
window
hole
bleed
safe
label
Current strengths
geometry primitives allow more explicit layer rendering.
Cut paths can come from exterior path extraction.
Labels are generated from face centroids.
Layer controls exist in the template builder.
Current issues
Cut path correctness depends on robust exterior-edge extraction.
Sampled arcs become polyline geometry unless export supports curves.
Bleed/safe/glue zones are data-supported but not necessarily complete for every template.
Visual rendering is not the same as production export.
12. 3D Rendering Pipeline
Flow
DielineGraph
  → fold3d.buildFoldedModel
  → FoldedFace3D[]
  → DielineCartonStage
  → THREE.ShapeGeometry
  → mesh material or texture
How folding works
Start from faceTree root.
For each child face, find the crease.
Convert crease endpoints to 3D.
Infer fold sign from child face position.
Rotate child subtree around crease line.
Generate local face geometry and world matrix.
Current issues
Fold direction is mostly inferred.
foldSemantic exists in type but is not central enough.
UV mapping is rectangular-bounds-based.
Physical folding order is not modeled.
3D can be wrong even when 2D is correct.
13. Artwork Assignment Flow
Current flow
User uploads image/PDF.
Source is stored as ArtworkSource.
Crop modal creates rendered face asset.
Asset is stored in artworkSlice.faces[faceId].
Preview faces are derived as Record<faceId, dataUrl>.
3D stage applies texture by faces[face.faceId].
Strength

Dynamic face IDs are supported in Redux state.

Risks
UI must always use actual graph face IDs.
Crop/UV mapping is basic for non-rectangular faces.
Legacy six-face UI assumptions may still exist in some panels.
Face ID changes will break saved artwork assignments.
14. Persistence / Save / Load / Publish Flow
Current capabilities

The save payload can include:

project name
status
template ID
dimensions
artwork sources
selected source ID
dynamic face assets
workspace dieline with graph
template slug
generator ID
user/resolved parameters
Server capabilities

server/projects/service.ts can store:

local JSON project
Supabase row
source artwork assets
rendered face images
dynamic workspace
Viewer

ProjectViewer.tsx now renders DielineCartonStage only if:

project.workspace?.dieline?.graph

That is the correct direction.

Main risk

If generated template flows do not save the graph into workspace.dieline.graph, the public viewer has nothing dynamic to render.

15. Validation System
Existing layers
Parameter validation
recipe parameters
catalog parameters
constraints/warnings
formula resolver
Catalog validation
validates catalog structure and runtime references
Graph validation
checks size
faces
duplicate IDs
self-intersections
structural creases
faceTree
cut paths
geometry layers
3D diagnostics

fold3d.ts produces diagnostics for:

missing tree
missing faces
duplicate faces
missing crease
crease mismatch
crease not on both face edges
non-finite bounds
Missing validation
template-specific expected face list
expected crease list
expected part list
physical fold direction verification
golden SVG comparison
public viewer roundtrip
production export validation
geometry equivalence between v2 and legacy RTE
16. Current Technical Debt
Critical
1. RTE has two generation paths

Problem: v2 recipe path and legacy TypeScript recipe path can diverge.

Files:

generatorRegistry.ts
templates/reverseTuckEnd.ts
recipes/foldingBox/reverseTuckEnd.v2.json
generators/foldingCarton/recipes/reverseTuckEnd.ts

Risk: fixing the wrong file changes nothing or introduces mismatch.

Next action: declare one active RTE source of truth.

2. No golden reference for Reverse Tuck End

Problem: geometry is marked needs verification.

Risk: random fixes can make visual output worse.

Next action: create golden RTE fixture with expected faces, creases, cut paths, and 3D result.

3. 3D fold direction is inferred

Problem: fold correctness depends on geometry side and crease direction.

Risk: top/bottom flaps can fold wrong direction.

Next action: make fold semantics explicit in generator output.

4. Catalog entries can imply support before generators are verified

Problem: catalog may contain more templates than real verified generators.

Risk: users assume production support.

Next action: strict status badges and disabled production export for unverified templates.

High
5. Template builder not unified with project builder

Problem: user can generate preview/export but not create artwork/project cleanly.

Next action: add a controlled “Start project from this graph” flow.

6. Bounds-based UV mapping

Problem: non-rectangular faces can distort or misalign textures.

Next action: add face-local coordinate mapping tests.

7. Generic generator risk

Problem: approximate templates may look correct but be physically wrong.

Next action: keep them experimental.

Medium
8. Cut path generation needs production-grade testing

Problem: exterior edge extraction is sensitive.

Next action: visual and geometric fixtures.

9. Supabase schema needs roundtrip verification

Problem: dynamic workspace support depends on actual schema.

Next action: save/load/publish integration test.

Low
10. Cleanup old docs and duplicate architecture notes

Problem: repo already has an audit file that may describe an older branch state.

Next action: update docs after source-of-truth decisions.

17. Current Bug Risk Map
Area	Risk	Symptoms	Likely files	How to verify
Reverse Tuck End geometry	High	wrong flap shape / bad cut	v2 recipe, tuck/dust parts	golden SVG comparison
RTE source-of-truth	Critical	fixes do nothing	generatorRegistry, templates/RTE	trace active generator ID
Generic generator	High	plausible but incorrect boxes	foldingBoxVariants / recipes	fixture per template
faceTree correctness	Critical	panels rotate wrong	graphAssembler, faceTree	tree snapshot
fold direction	Critical	flaps fold inside/outside wrong	fold3d, crease direction	3D snapshot
cut paths	High	duplicated/missing cuts	geometry, graphAssembler	exterior-edge test
dynamic face assets	Medium	artwork missing after save	artworkSlice, payload	save/load test
catalog mismatch	High	UI says supported but generator missing	catalog/registry	catalog verification
UV mapping	Medium	artwork stretched	DielineCartonStage	textured polygon test
public viewer	High	blank or default preview	ProjectViewer, payload	publish roundtrip
18. What Should Be Fixed First
Priority 1 — Architecture / validation / observability
Decide active source of truth for Reverse Tuck End: v2 recipe or legacy engine.
Add generator debug output for faces, creases, faceTree, geometry primitives.
Add template-specific validation fixture for RTE.
Priority 2 — Reverse Tuck End exact verification
Generate RTE with default dimensions.
Export graph JSON.
Compare to trusted reference.
Verify all face IDs and crease IDs.
Verify top/bottom tuck panel placement.
Verify cut path perimeter.
Priority 3 — Template catalog integration
Ensure catalog runtime.generatorId maps to the intended generator.
Mark non-verified entries as experimental.
Disable production export for unverified templates.
Priority 4 — 3D folding corrections
Add explicit fold semantics.
Verify fold direction per crease.
Add 3D snapshot diagnostics.
Priority 5 — More templates

Only after RTE is stable.

19. What Should NOT Be Done Yet

Do not:

add more templates
copy more website data
randomly change RTE geometry formulas
patch only the 3D renderer before verifying 2D graph
patch only the JSON catalog before verifying generator path
change face IDs again
claim production-ready
build DXF/PDF production export before golden fixtures
refactor persistence before confirming generated graph save/load
merge generic approximations into production flow
20. Recommended Future Architecture

Use this principle:

JSON catalog = template metadata + UI schema
TypeScript/component recipes = real geometry
DielineGraph = runtime source for 2D/3D/save/viewer
fixtures = verification references
validation = safety layer
viewer = readonly rendering

Recommended folders:

domain/dieline/
  catalog/
  recipes/
  componentEngine/
  parts/
  generators/
  validation/
  fixtures/
  renderModel/

features/
  dielines/
  dieline-builder/
  builder/
  viewer/

server/
  projects/
  dielines/

tests/
  dieline/
    reverse-tuck-end/
      expected-graph.json
      expected-svg.svg
      expected-fold-snapshot.json
21. Concrete Next Tasks
Task 1 — Confirm active RTE generator

Goal: prove exactly which code path generates /dielines/foldingBox/reverseTuckEnd.

Output:

generator ID
recipe file
graph output path
old files that are only compatibility wrappers
Task 2 — Export RTE graph snapshot

Goal: generate default RTE graph and save:

faces
creases
cut paths
geometry
faceTree
metadata
Task 3 — Create RTE expected-structure validator

Goal: assert required face IDs, crease IDs, and parent-child relationships.

Task 4 — Add 2D golden visual fixture

Goal: compare generated 2D output against a trusted RTE reference.

Task 5 — Add 3D fold diagnostic test

Goal: ensure no face is missing, duplicated, detached, or folded through the body.

Task 6 — Verify save/load/publish

Goal: create a generated RTE project, save it, reload it, publish it, and confirm the public viewer uses the same graph.

Task 7 — Freeze catalog-only templates

Goal: prevent unverified catalog entries from being treated as production generators.

22. Final Assessment

The project is moving in the correct direction architecturally. The most important improvement is the dynamic DielineGraph model and the newer component-engine recipe system.

But the project is still in a dangerous transition phase:

old template architecture still exists
v2 recipe architecture exists
generic approximations exist
catalog metadata exists
production verification does not yet exist

For Reverse Tuck End, the correct next move is not a random geometry patch. The correct next move is to freeze the source of truth, generate a graph snapshot, validate the exact structure, compare against a reference, and only then adjust geometry formulas.

Until that happens, every fix risks moving the system in the wrong direction.