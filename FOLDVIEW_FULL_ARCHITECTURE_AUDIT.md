# FoldView Full Architecture Audit

## Audit Scope

This audit inspected the `omarneyfar/pacdora.tn` repository on branch `realistic-dieline`, focusing on the new/modified FoldView architecture introduced on that branch. The inspected branch is ahead of `develop` by 16 commits and adds the dieline domain, catalog system, generators, renderers, verification scripts, server persistence, and UI routes. Direct repository cloning was unavailable in this runtime, so the audit is based on GitHub branch comparison plus targeted file reads of the key architecture files. Files listed in the branch diff but not deeply opened are marked as **Present but usage not confirmed** where appropriate.

---

## 1. Executive Summary

FoldView is becoming a packaging dieline generator and carton preview system built on Next.js, React, Redux, TypeScript, Three.js, and Supabase/local file persistence. The new branch introduces a serious domain model around `DielineGraph`, a JSON-driven folding-box catalog, TypeScript generators, 2D SVG rendering, a folded 3D preview, dynamic face artwork assignment, and save/load/publish workflows.

The strongest part of the project is that it now has a real shared runtime graph model: `DielineGraph`. This model is used by generators, 2D rendering, 3D folding, persistence, and validation. That is the correct direction.

The biggest architectural risk is that the system currently mixes three layers that should stay separate:

1. **Legacy six-face carton system** in `domain/packaging/index.ts`.
2. **New dynamic graph system** in `domain/dieline/*`.
3. **Large JSON catalog/database** in `domain/dieline/catalog/foldingBoxCatalog.json`.

The second major risk is that the Reverse Tuck End implementation is treated as implemented, but the graph contains internal self-referencing lip creases that conflict with strict graph validation assumptions. This could explain why fixes feel like they go in the wrong direction: the bug may be structural, not only visual or only 3D.

The third major risk is persistence. `utils/projectPayload.ts` still saves `templateId: folding-carton` and only saves a workspace `dieline` graph for `svg-upload` or `library` sources, not normal generated template projects. This means a generated catalog/template graph may not survive save/load in the way the new architecture expects.

The correct next move is not to add more templates or randomly change geometry formulas. The next move is to establish graph verification fixtures, confirm the exact 2D Reverse Tuck End dieline against a trusted reference, then validate 3D folding from the same graph.

---

## 2. Current Project Purpose

FoldView currently targets these product goals:

- **Template catalog**: `domain/dieline/catalog/foldingBoxCatalog.json` stores folding-box template metadata, parameters, manufacturing notes, variants, warnings, runtime status, and verification state.
- **Dieline generator**: TypeScript generators in `domain/dieline/templates/` create real `DielineGraph` objects.
- **2D editor / preview**: `features/dieline-builder/DielineViewport.tsx` renders template graphs, while `features/builder/components/DielineRenderer.tsx` renders artwork-enabled graph faces with upload/crop hotspots.
- **3D mockup**: `domain/dieline/fold3d.ts` folds a graph using `faceTree`; `features/builder/DielineCartonStage.tsx` converts solved faces into Three.js `ShapeGeometry` meshes.
- **Artwork assignment**: `store/artworkSlice.ts` stores artwork sources and `FaceAssets` keyed by dynamic face id.
- **Client sharing / publish**: `server/projects/service.ts`, `utils/projectPayload.ts`, and `features/viewer/ProjectViewer.tsx` support draft/published project state and viewer rendering, but the new template graph persistence path is only partially implemented.
- **Print production support**: Cut, crease, bleed, safe, label, hole, window, and perf layers exist in the data model. Production export exists as UI/actions and API routes, but true production-ready DXF/PDF output needs stronger validation and reference fixtures.

---

## 3. Folder-by-Folder Architecture

### app/

**Purpose**

Next.js App Router entrypoints and API routes.

**Key files**

- `app/dielines/page.tsx`
- `app/dielines/new/page.tsx`
- `app/dielines/[id]/edit/page.tsx`
- `app/dielines/foldingBox/page.tsx`
- `app/dielines/foldingBox/[templateSlug]/page.tsx`
- `app/dielines/foldingBox/reverseTuckEnd/page.tsx`
- `app/api/dielines/route.ts`
- `app/api/dielines/[id]/route.ts`
- `app/api/dielines/[id]/export/route.ts`
- `app/page.tsx`
- `app/globals.css`

**What logic should be here**

Routing, request/response boundaries, page composition, and minimal handoff to feature modules.

**What logic should NOT be here**

Geometry generation, graph validation, catalog mapping, persistence business rules, artwork transformations, or 3D math.

**Current problems**

The page routes appear thin, which is good. The API route files were present but not deeply inspected, so export correctness and validation depth are **Present but usage not confirmed**.

---

### domain/

**Purpose**

Business/domain logic. This is where the application should model packaging, dielines, templates, graph validation, and project types.

**Key files/folders**

- `domain/dieline/`
- `domain/dielines/`
- `domain/packaging/index.ts`
- `domain/projects/index.ts`

**How geometry/dielines/templates are modeled**

The new system models dielines through `DielineGraph` in `domain/dieline/types.ts`. The older system in `domain/packaging/index.ts` still models one legacy six-face folding carton through `CartonDimensions`, `FaceSpec`, `ModelSpec`, and `PackagingTemplate`.

**Current problems**

`domain/packaging/index.ts` still defines legacy constants such as `FACE_KEYS = [front, back, left, right, top, bottom]` and `TEMPLATE_IDS = [folding-carton]`. This creates a split between the new dynamic graph architecture and the old six-face template architecture.

---

### domain/dieline/

**Purpose**

Core dynamic dieline system.

**Key files**

- `types.ts`
- `geometry.ts`
- `canonicalGeometry.ts`
- `fold3d.ts`
- `manualBuilder.ts`
- `reference.ts`
- `structure.ts`
- `svgImporter.ts`
- `templateRegistry.ts`
- `validation.ts`
- `validation/validateDielineGraph.ts`
- `generators/generatorRegistry.ts`
- `catalog/*`
- `templates/*`

**Current DielineGraph model**

`DielineGraph` contains `size`, `faces`, `creases`, `cutPaths`, `faceTree`, optional `geometry`, optional `metadata`, optional `source`, and optional `sourceSvg`. This is the correct central runtime model for both 2D and 3D.

**Current template system**

There are two connected registries:

- `domain/dieline/catalog/*` loads and normalizes JSON catalog templates.
- `domain/dieline/templateRegistry.ts` converts catalog templates to runtime `RegisteredDielineTemplate` objects and calls TypeScript generators through `generatorRegistry.ts`.

**Current validation system**

There are two validation-like layers:

- `domain/dieline/validation.ts`: sanitizes persisted/imported graph data.
- `domain/dieline/validation/validateDielineGraph.ts`: strict graph validator for generator output.

**Current problems**

The strict validator assumes a crease connects two distinct faces and lies on the boundary of both faces. Reverse Tuck End creates internal lip creases where `faceA` and `faceB` are the same face. That is a dangerous mismatch between graph semantics and validation semantics.

---

### domain/dieline/templates/

**Purpose**

TypeScript geometry generators for actual dieline graphs.

**Template files**

- `reverseTuckEnd.ts`
- `straightTuckEnd.ts`
- `foldingCartonGraph.ts`
- `foldingBoxVariants.ts`
- `fullSealEnd.ts`
- `mailerBox.ts`
- `sleeve.ts`
- `stickers.ts`
- `trayWithLid.ts`
- `index.ts`

**What each file does**

- `reverseTuckEnd.ts`: exact/primary Reverse Tuck End generator. Creates body panels, glue tab, dust flaps, top tuck, bottom tuck, creases, cut paths, geometry, metadata, and faceTree.
- `straightTuckEnd.ts`: registered generator for Straight Tuck End. Its registry adapter maps catalog values to legacy carton dimensions. Needs deeper inspection before production trust.
- `foldingCartonGraph.ts`: legacy/simple six-face carton graph generator. Useful for baseline cube-like folding but not a full production folding carton dieline.
- `foldingBoxVariants.ts`: generic CEFBox-inspired variant definitions and approximate generator. It delegates Reverse Tuck End to `generateReverseTuckEnd`, but approximates other variants using generic panels/flaps/features.
- `fullSealEnd.ts`, `mailerBox.ts`, `sleeve.ts`, `stickers.ts`, `trayWithLid.ts`: present in branch diff. Usage not deeply confirmed in this audit.
- `index.ts`: barrel export. Present but usage not confirmed.

**Real generators vs generic/experimental**

- Most serious current generator: `reverseTuckEnd.ts`.
- Registered generator: `straightTuckEnd.ts`, but adapter suggests legacy dimension mapping.
- Legacy simple generator: `foldingCartonGraph.ts`.
- Generic/experimental: `foldingBoxVariants.ts` for all non-Reverse-Tuck-End CEFBox variants.
- Catalog-only templates: any catalog template whose `runtime.generatorId` is missing from `DIELINE_GENERATOR_REGISTRY`.

**Relationships between files**

`templateRegistry.ts` maps catalog templates to generator calls. `generatorRegistry.ts` only knows `reverseTuckEnd` and `straightTuckEnd`. `foldingBoxVariants.ts` contains many definitions but is not the same as the catalog registry and should not be treated as production geometry for every template.

---

### domain/dieline/catalog/

**Purpose**

JSON catalog loading, normalization, parameter resolution, formula evaluation, catalog validation, and generator handoff.

**Key files**

- `foldingBoxCatalog.json`
- `catalogTypes.ts`
- `formulaEngine.ts`
- `generateGraphFromCatalogTemplate.ts`
- `loadTemplateCatalog.ts`
- `normalizeTemplateCatalog.ts`
- `parameterAliases.ts`
- `resolveTemplateParameters.ts`
- `validateTemplateCatalog.ts`
- `index.ts`

**JSON catalog usage**

The catalog is loaded once through `loadTemplateCatalog.ts`, normalized, then consumed by `templateRegistry.ts` for UI summaries and parameter panels. `generateGraphFromCatalogTemplate.ts` resolves parameters, finds a TypeScript generator by `template.runtime.generatorId`, validates the produced graph, and attaches catalog metadata.

**Runtime source, UI schema, or metadata only?**

Currently the JSON catalog is mostly a metadata/UI schema plus generator routing layer. It is not yet a reliable full geometry source. The real graph comes from TypeScript generators.

**Current problems**

The catalog contains far more templates than the generator registry supports. This is okay if catalog-only templates are clearly labeled, but risky if UI or users assume all catalog entries are production-ready.

---

### features/

**Purpose**

Client UI modules and workflows.

**Key UI modules**

- `features/dieline-builder/*`: template catalog builder/generator UI.
- `features/builder/*`: existing artwork builder, 2D renderer, 3D stage, panels, crop/upload integration.
- `features/dielines/*`: dieline dashboard/studio/creator/client.
- `features/artwork/artwork.ts`: artwork/crop helpers.
- `features/viewer/ProjectViewer.tsx`: public/project viewer.
- `features/projects/*`: projects dashboard/client.

**Builder flow**

The existing builder uses Redux, dimensions, optional imported/library graph, artwork sources, crops, and 3D preview.

**Dieline UI flow**

The new `features/dieline-builder/DielineBuilderShell.tsx` lets the user open a catalog template, edit parameters, generate a graph, switch between 2D dieline and mockup, and export.

**Artwork UI flow**

Artwork is currently integrated in the existing builder renderer, not fully in the new template builder. In `DielineBuilderShell.tsx`, the “Create Artwork” action is disabled.

**Viewer flow**

`ProjectViewer.tsx` exists and was modified, but not deeply inspected. The persistence model suggests viewer correctness depends on whether the project has a saved graph or only legacy dimensions.

**Current problems**

There are now two builder experiences: the legacy artwork builder and the new dieline template builder. They share some graph/rendering infrastructure but are not fully unified.

---

### store/

**Purpose**

Redux state for builder UI, artwork assets, and UI state.

**Redux slices**

- `store/artworkSlice.ts`: artwork sources and face asset assignments.
- `store/builderSlice.ts`: project identity, status, dimensions, selected dieline graph/source, saving/sharing flags.
- `store/uiSlice.ts`: UI state. Present but not deeply inspected.

**Whether dynamic face IDs are correctly supported**

`artworkSlice.ts` uses `FaceAssets = Record<string, FaceAsset>`, which supports dynamic graph face IDs. `domain/packaging/index.ts` also defines `FaceId = string`, but still keeps the legacy `FACE_KEYS` constant for migration.

**Current problems**

`builderSlice.ts` hydrates `dielineGraph` only when `dieline.source` is `svg-upload` or `library`. A generated template graph from the new catalog flow may not be preserved as the canonical saved graph.

---

### hooks/

**Purpose**

UI orchestration around artwork, dimensions, initial graph setup, and persistence.

**Key files**

- `hooks/useArtworkWorkspace.ts`
- `hooks/useDimensionSync.ts`
- `hooks/useInitialDieline.ts`
- `hooks/useProjectPersistence.ts`

**Current problems**

These hooks likely bridge old builder state with new graph state. `useProjectPersistence.ts` was modified and is high risk because persistence already shows legacy template assumptions in `utils/projectPayload.ts`. Needs deeper inspection before changing save/load behavior.

---

### server/

**Purpose**

Server-side persistence and storage for projects and reusable dielines.

**Key files**

- `server/projects/service.ts`
- `server/dielines/service.ts`
- `server/dielines/seedDielines.ts`

**Project persistence**

`server/projects/service.ts` supports both local file storage and Supabase. It stores project metadata, face images, artwork sources, workspace face assets, and optional workspace dieline graph.

**Supabase/local fallback**

If Supabase is configured, it uses a `projects` table and `project-faces` bucket. Otherwise it uses `storage/projects-db.json` and per-project folders.

**Asset storage**

Face images and source artwork are stored separately. Workspace sources are stored under project assets, while face outputs are also stored per face.

**Current problems**

The server can store a `workspace.dieline`, but the client payload currently only sends that object for uploaded/library dielines, not generated template graphs.

---

### utils/

**Purpose**

Payload building, migration, IDs, patch diffing, and helper logic.

**Key files**

- `utils/projectPayload.ts`
- `utils/migrateProject.ts`

**Current problems**

`createFullProjectPayload` still hardcodes `templateId: FOLDING_CARTON_TEMPLATE_ID`. It does not persist generated catalog template id, slug, generator id, resolved parameters, or generated graph for normal template source projects.

---

### supabase/

**Purpose**

Expected location for database schema and Supabase setup.

**Current state**

Not found in the inspected branch diff. `server/projects/service.ts` references `supabase/schema.sql` in error messages, but the schema file was not present in the inspected changed-file list. Needs deeper full-tree inspection if the base branch contains it.

**Whether it supports dynamic graphs and dynamic face assets**

The server expects a JSON-like `workspace` column, which can support dynamic graphs and dynamic face assets if the schema exists with the required columns. Schema support is **Present but usage not confirmed**.

---

### fixtures/ or tests/

**Purpose**

Verification references and smoke tests.

**Found files**

- `fixtures/dielines/food-sleeve-with-flaps.svg`
- `fixtures/dielines/references/README.md`
- Empty reference folders for `cefbox`, `ecma`, `fefco`, `newprint`, `pacdora`, `packmage`, `templatemaker`
- `scripts/verify-catalog.mjs`
- `scripts/verify-dieline-graph.mjs`
- `scripts/verify-visual.mjs`

**Missing tests**

- No confirmed golden Reverse Tuck End reference fixture.
- No confirmed visual pixel comparison against a trusted dieline reference.
- No confirmed 3D fold snapshot/geometry tests.
- No confirmed DXF/PDF export verification.

---

## 4. File-by-File Analysis

| File | Purpose | Inputs | Outputs | Used By | Risk Level | Notes |
|---|---|---|---|---|---|---|
| `package.json` | Declares Next/React/Three/Redux/Supabase stack and verification scripts | npm scripts/dependencies | Build/runtime commands | Whole app | Medium | Good scripts exist: `verify:catalog`, `verify:dieline`, `verify:visual`. |
| `app/dielines/foldingBox/[templateSlug]/page.tsx` | Route for folding box template page | `templateSlug` route param | `DielineBuilderShell` | Next router | Low | Thin route; correct ownership. |
| `app/dielines/foldingBox/reverseTuckEnd/page.tsx` | Direct RTE route | None/route | likely redirects or shell | Next router | Low | Present but usage not deeply confirmed. |
| `app/api/dielines/route.ts` | Dieline library API | HTTP request | JSON response | Dieline UI | Medium | Present but not deeply inspected. |
| `app/api/dielines/[id]/route.ts` | Single dieline CRUD API | Dieline id/request | JSON response | Dieline UI | Medium | Present but not deeply inspected. |
| `app/api/dielines/[id]/export/route.ts` | Export route | Dieline id/format | exported file | ExportActions | High | Export production correctness not confirmed. |
| `domain/dieline/types.ts` | Core graph/type model | None | TypeScript types | All dieline systems | Low | Strong central model. |
| `domain/dieline/geometry.ts` | Polygon helpers and exterior cut path extraction | Faces/points | bounds, centroid, paths | Generators/renderers | High | Exact edge matching and segmented cut paths are risky for production export. |
| `domain/dieline/canonicalGeometry.ts` | Converts primitives/graph to SVG paths/fallback primitives | Geometry primitives or graph | SVG path primitives | 2D renderers | Medium | Present but not deeply inspected. |
| `domain/dieline/fold3d.ts` | Solves faceTree into folded 3D model | DielineGraph | FoldedModel3D | DielineCartonStage | High | Fold direction inferred, not semantically explicit. |
| `domain/dieline/validation.ts` | Sanitizes persisted/imported graphs | unknown graph | normalized graph/null | server persistence | High | Good safety layer, but can silently drop invalid graph data. |
| `domain/dieline/validation/validateDielineGraph.ts` | Strict generated graph validation | DielineGraph | validation result/errors | catalog generation/scripts | Critical | Conflicts with internal self-creases. |
| `domain/dieline/templateRegistry.ts` | Runtime template registry from catalog | catalog templates | RegisteredDielineTemplate | DielineBuilderShell | High | Correct bridge, but catalog/generator mismatch is large. |
| `domain/dieline/generators/generatorRegistry.ts` | Maps generator ids to TS functions | generatorId/values | DielineGraph | catalog graph generation | High | Only `reverseTuckEnd` and `straightTuckEnd` registered. |
| `domain/dieline/catalog/foldingBoxCatalog.json` | Large folding-box metadata database | JSON | catalog templates | catalog loader/UI | High | Should drive UI/metadata only, not trusted geometry. |
| `domain/dieline/catalog/catalogTypes.ts` | Catalog schema types | None | TS types | catalog utilities | Medium | Broad schema; good separation. |
| `domain/dieline/catalog/formulaEngine.ts` | Safe formula evaluator | formula/context | numeric value/warnings | parameter resolution | Medium | Supports arithmetic/min/max/clamp only. Good safety. |
| `domain/dieline/catalog/generateGraphFromCatalogTemplate.ts` | Catalog-to-generator flow | template id/user values | graph + metadata/warnings | template registry | Critical | Calls strict validation; may fail if graph semantics conflict. |
| `domain/dieline/catalog/loadTemplateCatalog.ts` | Loads normalized catalog singleton | JSON import | catalog accessors | registry/UI | Low | Clear ownership. |
| `domain/dieline/catalog/resolveTemplateParameters.ts` | Resolves catalog params to generator params | template/user/global defaults | specs/values/warnings | registry/generator flow | High | Critical for L/W/H/aliases correctness. |
| `domain/dieline/catalog/validateTemplateCatalog.ts` | Validates catalog references | catalog/template | messages | generation/scripts | Medium | Good layer; needs stronger runtime coverage. |
| `domain/dieline/templates/reverseTuckEnd.ts` | Primary Reverse Tuck End generator | RTE parameters | DielineGraph | generator registry | Critical | Strong attempt, but internal lip creases/self-creases are suspicious. |
| `domain/dieline/templates/straightTuckEnd.ts` | Straight Tuck End generator | dimensions/params | DielineGraph | generator registry | High | Registered but not deeply inspected. |
| `domain/dieline/templates/foldingCartonGraph.ts` | Legacy six-face carton graph | width/height/depth | DielineGraph | packaging domain | Medium | Useful baseline, not production folding carton. |
| `domain/dieline/templates/foldingBoxVariants.ts` | Generic CEFBox variant approximation | variant definition | DielineGraph | maybe library/seeds | Critical | Should not be production geometry for complex templates. |
| `domain/packaging/index.ts` | Legacy packaging/domain/project types | dimensions/template id | specs/model/graph | old builder/project persistence | Critical | Still hardcodes `folding-carton` and six-face assumptions. |
| `features/dieline-builder/DielineBuilderShell.tsx` | New template builder UI | category/template slug, parameter values | 2D/3D UI/export | route pages | High | New builder not integrated with artwork/save workflow. |
| `features/dieline-builder/DielineViewport.tsx` | 2D template viewport | DielineGraph/layers | SVG preview | builder shell | High | RTE measurement overlay uses formula inconsistent with generator. |
| `features/dieline-builder/TemplateParameterPanel.tsx` | Parameter editor | specs/values/unit | user changes | builder shell | Medium | Present but not deeply inspected. |
| `features/dieline-builder/ExportActions.tsx` | Export buttons | graph/formats | downloads/API calls | builder shell | High | Export correctness not confirmed. |
| `features/builder/components/DielineRenderer.tsx` | Existing 2D artwork renderer | graph/faces/uploads | SVG + hotspots | builder | High | Dynamic face ids good; guide offsets are rectangular approximations. |
| `features/builder/DielineCartonStage.tsx` | 3D folded preview | graph + face textures | Three.js model | builder/template mockup | High | UV mapping is bounds-based; crop/rotation semantics limited. |
| `features/builder/components/CropModal.tsx` | Artwork crop UI | source/face/crop | cropped face asset | artwork workflow | Medium | Modified; not deeply inspected. |
| `features/artwork/artwork.ts` | Artwork/crop helpers | images/pdf/crop | normalized crop/rendered data | builder/store | Medium | Modified; not deeply inspected. |
| `store/artworkSlice.ts` | Artwork state | sources/face assets | Redux state/selectors | builder | Medium | Dynamic `Record<string, FaceAsset>` is good. |
| `store/builderSlice.ts` | Project/builder state | actions/project load | Redux state | builder/persistence | Critical | Does not hydrate generated template graph as canonical graph. |
| `utils/projectPayload.ts` | Save/patch payload builder | live Redux state | ProjectSavePayload/Patch | persistence hook/API | Critical | Hardcodes legacy template id and omits template-generated graph. |
| `server/projects/service.ts` | Project persistence | ProjectInput | Project records/assets | API routes | High | Capable of workspace graph storage, but client may not send it. |
| `server/dielines/service.ts` | Dieline library persistence | DielineTemplateInput | local stored templates | API routes | Medium | Local only; normalizes graphs. |
| `utils/migrateProject.ts` | Project migration | old project | new shape | load flow | High | Present but not deeply inspected. Important for legacy data. |
| `scripts/verify-dieline-graph.mjs` | Graph verification script | generated graphs | validation result | npm script | High | Present; should become gate before fixes. |
| `scripts/verify-catalog.mjs` | Catalog verification script | JSON catalog | validation result | npm script | Medium | Good catalog safety. |
| `scripts/verify-visual.mjs` | Visual verification | graph/render output | smoke screenshots/png | npm script | High | Needs trusted golden refs. |
| `features/viewer/ProjectViewer.tsx` | Project/public viewer | Project | rendered project | viewer route | High | Modified but not deeply inspected; depends on persistence correctness. |

---

## 5. Core Data Models

### DielineGraph

`DielineGraph` is the central runtime object.

- `size`: global 2D canvas/viewBox size in millimeters-like units.
- `faces`: all printable/structural polygons.
- `creases`: fold hinges between faces.
- `cutPaths`: cut geometry, usually generated from exterior face edges.
- `geometry`: optional canonical geometry primitives with explicit layers such as cut, crease, perf, window, hole, bleed, safe, label.
- `faceTree`: folding hierarchy used by 3D.
- `metadata`: category, family, parts, parameter specs, resolved values, catalog source data.
- `source`: template or uploaded SVG source.

### DielineFace

- `id`: dynamic stable face identifier, such as `front`, `top-tuck`, `glue-tab`.
- `label`: UI label.
- `vertices`: polygon points in 2D graph coordinates.
- `bounds`: axis-aligned bounds computed from vertices.
- `centroid`: polygon centroid.
- `role`: `panel`, `flap`, `glue`, or `unknown`.
- `artworkEnabled`: whether artwork can be assigned.

### DielineCrease

- `id`: stable crease identifier.
- `faceA` / `faceB`: connected face ids.
- `edgeStart` / `edgeEnd`: hinge line in 2D graph coordinates.
- `foldAngle`: usually `Math.PI / 2`.
- `direction`: `1` or `-1`.

Current limitation: this model does not distinguish structural face-to-face creases from internal crease/score lines on one face. Reverse Tuck End currently uses self-referencing creases for tuck lips.

### DielineFaceNode / faceTree

`faceTree` is an array of root nodes. The strict validator expects exactly one root. Each node contains:

- `faceId`
- `creaseId` connecting it to parent, or `null` for root
- `children`

`fold3d.ts` traverses this tree and rotates child faces around the parent-child crease. This is the source of 3D folding behavior.

### Project

From `domain/packaging/index.ts`:

- `id`, `name`, `status`
- `templateId`
- `dimensions`
- `faces`: rendered face image URLs keyed by dynamic face id
- `workspace`: sources, selected source, faceAssets, optional `dieline`
- timestamps

Current limitation: `TemplateId` is still only `folding-carton`, which conflicts with the catalog template system.

### ArtworkSource / FaceAsset

`ArtworkSource`:

- `id`
- `dataUrl`
- `fileName`
- `mimeType`
- `sourceType`

`FaceAsset`:

- `sourceId`
- `dataUrl`
- `fileName`
- `sourceType`
- `crop`

Face assets are keyed by dynamic face id, which is good for non-six-face cartons.

---

## 6. End-to-End Data Flow

```text
User chooses template
  → app/dielines/foldingBox/[templateSlug]/page.tsx
  → features/dieline-builder/DielineBuilderShell.tsx
  → domain/dieline/templateRegistry.ts:getDielineTemplateByRoute
  → domain/dieline/catalog/loadTemplateCatalog.ts
  → domain/dieline/catalog/resolveTemplateParameters.ts
  → domain/dieline/generators/generatorRegistry.ts
  → domain/dieline/templates/reverseTuckEnd.ts or straightTuckEnd.ts
  → DielineGraph created
  → domain/dieline/validation/validateDielineGraph.ts through generateGraphFromCatalogTemplate
  → features/dieline-builder/DielineViewport.tsx renders 2D
  → features/builder/DielineCartonStage.tsx renders 3D through domain/dieline/fold3d.ts
```

Artwork flow in the existing builder:

```text
User uploads artwork
  → features/builder/components/DielineRenderer.tsx
  → hooks/useArtworkWorkspace.ts / CropModal / features/artwork/artwork.ts
  → store/artworkSlice.ts stores source + FaceAsset by dynamic face id
  → DielineRenderer clips image to 2D face polygon
  → selectPreviewFaces creates Record<faceId, dataUrl>
  → DielineCartonStage applies texture to matching solved 3D face
```

Save/load flow:

```text
Live Redux state
  → utils/projectPayload.ts:createFullProjectPayload
  → hooks/useProjectPersistence.ts
  → app/api/projects routes (not inspected in this branch diff)
  → server/projects/service.ts
  → local file storage or Supabase
  → readProject/updateProject/listProjects
  → hydrateBuilder/hydrateArtwork
  → builder/viewer renders project again
```

Current break in the flow:

```text
Generated catalog template graph
  → NOT reliably saved by createFullProjectPayload when dielineSource is template
  → templateId remains folding-carton
  → viewer/load may lose exact generated graph
```

---

## 7. Template System Analysis

### How templates are registered

`templateRegistry.ts` loads catalog templates and maps each one into a `RegisteredDielineTemplate`. A template is considered implemented only if `hasDielineGenerator(template.runtime.generatorId)` returns true.

### How template IDs/slugs work

Catalog templates have both `id` and `slug`. Route lookup uses category slug plus template slug. `getDielineTemplateById` accepts id or slug.

### How parameter specs work

Catalog editable parameters are converted into runtime `ParameterSpec[]` through `resolveTemplateParameters.ts` and exposed to UI panels.

### How default values work

`createRegisteredTemplate` resolves default generator parameters from catalog defaults, global defaults, and aliases.

### How generators are selected

The catalog template has `runtime.generatorId`. That id is looked up in `DIELINE_GENERATOR_REGISTRY`.

Current registered generators:

- `reverseTuckEnd`
- `straightTuckEnd`

### How CEFBox definitions are used

There are two CEFBox-related systems:

1. `foldingBoxCatalog.json`: large catalog/database.
2. `foldingBoxVariants.ts`: hardcoded CEFBox variant definitions and a generic graph generator.

They are not the same source of truth. This duplication is risky.

### Exact template generator vs generic generator

- Exact generator: `reverseTuckEnd.ts` creates a specific graph with named parts and custom flap shapes.
- Generic generator: `generateCefBoxFoldingBoxGraph` approximates many templates from high-level top/bottom closure types and feature flags.

### Safe templates

- Reverse Tuck End is the most complete, but still needs verification.
- Straight Tuck End is registered but needs deeper inspection.

### Experimental templates

All non-registered catalog entries and most outputs from `foldingBoxVariants.ts` should be treated as experimental/catalog-only until verified with fixtures.

### Catalog-only templates

Any catalog template whose `runtime.generatorId` is not registered is catalog-only in the current runtime.

---

## 8. Reverse Tuck End Deep Analysis

### Which file generates it

`domain/dieline/templates/reverseTuckEnd.ts`.

### Parameters used

- `L`: length
- `W`: width/depth
- `H`: height
- `TFW`: tuck flap lip
- `TFR`: tuck flap radius
- `GFW`: glue tab width
- `DFW`: dust flap depth
- `closureMode`: auto/manual
- `outputSizeMode`: inner/outer
- `materialThickness`
- `material`
- `bleeds`
- `pdfExport`
- `dxfExport`
- aliases: `width`, `height`, `depth`

### Faces created

1. `left`
2. `front`
3. `right`
4. `back`
5. `glue-tab`
6. `top-dust-left`
7. `top-dust-right`
8. `top-tuck`
9. `bottom-dust-left`
10. `bottom-dust-right`
11. `bottom-tuck`

### Creases created

Body creases:

- `cr-left-front`
- `cr-front-right`
- `cr-right-back`
- `cr-back-glue`

Top closure creases:

- `cr-left-topdust`
- `cr-front-toptuck`
- `cr-right-topdust`

Bottom closure creases:

- `cr-left-bottomdust`
- `cr-right-bottomdust`
- `cr-back-bottomtuck`

Internal lip creases:

- `cr-toptuck-lip`
- `cr-bottomtuck-lip`

### Cut paths created

`createExteriorCutPaths(faces)` computes exterior edges by grouping identical edges and returning edges that appear only once.

Risk: cut paths are emitted as individual segments, not joined continuous contours.

### faceTree created

Root is `front`.

- `front`
  - `left`
    - `top-dust-left`
    - `bottom-dust-left`
  - `right`
    - `back`
      - `glue-tab`
      - `bottom-tuck`
    - `top-dust-right`
    - `bottom-dust-right`
  - `top-tuck`

All faces are included. Internal lip creases are not in the tree.

### Top closure modeled

Top dust flaps attach to left and right panels. Top tuck flap attaches to the front panel. This matches the “reverse” relationship if the bottom tuck attaches to the opposite panel.

### Bottom closure modeled

Bottom dust flaps attach to left and right panels. Bottom tuck attaches to back panel.

### Dust flaps modeled

Dust flaps use tapered six-point polygons.

Suspicious area: top and bottom `dustFlap` branches currently return the same vertex sequence shape. This may still be geometrically mirrored because `topY`, `lidY`, and `shoulderY` change by direction, but it needs visual verification.

### Tuck flaps modeled

Tuck flaps use polygon approximations with sampled quarter arcs for curved lip/slit details. Top and bottom use different arc angle ranges.

Suspicious area: bottom tuck arc sampling uses descending angle ranges; verify no self-intersection or reversed curve artifacts.

### Glue tab modeled

Glue tab is a beveled four-point polygon attached to the back panel.

### Whether 2D graph is structurally correct

Partially implemented. The body panel order and main closure placement are coherent. However, the internal lip creases are represented as creases connecting a face to itself, which violates the current strict crease semantics.

### Whether 3D graph is likely correct

Partially implemented. Main body and closure hierarchy are foldable because all structural faces exist in `faceTree`. But all crease directions are `1`, and actual fold sign is inferred from child centroid side. This can produce wrong fold direction even if the 2D layout looks correct.

### Suspicious areas

1. Self-referencing internal lip creases.
2. Strict validation expecting creases on boundaries of both connected faces.
3. `DielineViewport` measurement overlay uses `bodyTop = TFW + DFW`, while generator uses `bodyTop = max(W + TFW, DFW)`.
4. Fold direction is inferred instead of explicit mountain/valley.
5. Exterior cut paths are line segments, not joined die-cut contours.
6. No trusted reference fixture found for Reverse Tuck End.

### Evidence needed to confirm the real bug

- A trusted CEFBox or packaging-engineer reference SVG/PDF/DXF for the same dimensions.
- A generated JSON snapshot of `generateReverseTuckEnd(defaults)`.
- A visual overlay comparison of graph cut/crease paths against the reference.
- A graph validation result from `assertValidDielineGraph` for RTE.
- A 3D fold snapshot with named face positions.

### Reverse Tuck End Verification Checklist

- Required faces:
  - `front`, `back`, `left`, `right`, `glue-tab`
  - `top-tuck`, `top-dust-left`, `top-dust-right`
  - `bottom-tuck`, `bottom-dust-left`, `bottom-dust-right`
- Required creases:
  - vertical body creases between each body panel
  - glue crease on back/glue edge
  - top dust/tuck hinge lines
  - bottom dust/tuck hinge lines
  - internal tuck lip score lines represented separately from face-to-face creases
- Expected parent-child relationships:
  - root body panel should be stable, usually `front` or `back`
  - side panels fold from root
  - back folds from side panel
  - closures fold from their owning body panels
- Expected fold directions:
  - body panels fold into rectangular prism
  - dust flaps fold inward
  - tuck flaps fold inward opposite each other
  - glue tab folds inward to join side seam
- Expected 2D visual structure:
  - panel strip order should match RTE manufacturing layout
  - top tuck and bottom tuck should be on opposite major panels
  - dust flaps should align with side panels
  - glue tab should be outside last major panel
- Expected 3D folded result:
  - four side panels form a box tube
  - top and bottom closures fold toward openings
  - glue tab is on side seam
  - no closure folds outside the box in the wrong direction

---

## 9. Generic Folding Box Generator Analysis

`domain/dieline/templates/foldingBoxVariants.ts` tries to create many CEFBox-like folding carton variants from a compact definition object.

### What it tries to do

It defines high-level template properties:

- `top` closure type
- `bottom` closure type
- dimensions
- parameter names
- feature flags such as handle, hang-hole, window, divider, insert, tear-strip

Then it generates a generic body strip and attaches generic flaps/features.

### Templates it supports

It contains definitions for many folding-box variants including Reverse Tuck End, Straight Tuck End, Auto Lock Bottom, Snap Lock Bottom, handle boxes, hang-hole boxes, hang-tab boxes, divider/window cartons, crash-bottom cartons, skillet boxes, tear-strip variants, and more.

### What is generic approximation

Everything except the Reverse Tuck End delegation should be treated as approximation. The generator uses generic rectangles, trapezoids, arc-top faces, and feature cut paths. It does not encode every true locking, crash-bottom, gusset, insert, or partition mechanical structure.

### What is risky

- Complex bottoms are simplified.
- Locking tabs and crash bottoms need exact geometry but are approximated.
- Feature cutouts may not match source templates.
- faceTree may be structurally valid but mechanically wrong.
- 3D folding can look plausible while being production-invalid.

### Whether it should be used for production templates

No. It should be used for placeholder previews, catalog exploration, or smoke testing only.

### How it differs from `reverseTuckEnd.ts`

`reverseTuckEnd.ts` is a specific named generator with exact-ish flap construction, metadata, and local validation. `foldingBoxVariants.ts` is a broad approximation engine.

### Whether it can create correct 3D or only placeholder structures

It can create foldable placeholder structures if the faceTree and creases are valid. That does not mean the generated dieline is production-correct.

---

## 10. JSON Catalog / Database Analysis

### What it contains

`foldingBoxCatalog.json` is a large catalog containing database info, units, line type legend, global defaults, manufacturing rules, global validation rules, schema version, and many templates. Each template can contain dimensions, derived dimensions, editable parameters, components, geometry formulas, paths, folding logic, mockup3D info, variants, manufacturing rules, validation rules, formulas, warnings, runtime status, and verification status.

### What it should be used for

- Template listing UI
- Parameter panel schema
- Manufacturing notes
- Warnings and verification status
- Runtime generator routing
- Catalog-only documentation

### What it should NOT be used for

- As the source of production geometry unless each formula/path is verified.
- As a replacement for TypeScript generators.
- As proof that a template is production-ready.

### Whether it should drive UI only

Mostly yes. For now: JSON catalog = metadata and UI schema. TypeScript generator = real geometry.

### Whether it should call TypeScript generators

Yes, through `runtime.generatorId` and `generatorRegistry.ts`, exactly as the current architecture attempts.

### How it should connect to template registry

The current route is correct:

```text
foldingBoxCatalog.json
  → loadTemplateCatalog
  → normalizeTemplateCatalog
  → templateRegistry
  → generatorRegistry
  → TypeScript generator
```

### Whether it contains enough data for real geometry

Not safely. It contains geometry/formula-like fields, but real geometry correctness requires fixtures, reference overlays, and packaging-engineer verification.

### Missing fields

- Stable mapping from catalog components to graph face ids.
- Explicit semantic distinction between cut, crease, internal score, glue zone, safe zone, bleed zone.
- Golden reference fixture ids.
- Expected faceTree for production 3D.
- Expected fold direction/mountain-valley semantics.
- Verified export contour requirements.

### Duplications

- Catalog template list duplicates concepts from `foldingBoxVariants.ts`.
- Parameter aliases duplicate legacy `width/height/depth` and catalog `L/W/H` concepts.
- Template status exists in both catalog runtime and verification fields.

### Risky fields

- `productionReady`
- `supports3D`
- `mappingConfidence`
- geometry formula fields marked as if usable before verification

### Suggested normalized schema

```text
TemplateCatalogEntry
  id
  slug
  name
  category
  source
  uiParameters[]
  manufacturingNotes
  runtime
    generatorId
    geometrySource: typescript-generator | catalog-only | fixture
    status
  verification
    referenceFixtureId
    graphValidated
    visualCompared
    exportCompared
    prototypeTested
  componentMap
    catalogComponentId -> graphFaceId | graphGeometryId
```

---

## 11. 2D Rendering Pipeline

### Which component renders the flat dieline

Two components render 2D:

- `features/dieline-builder/DielineViewport.tsx`: template builder preview.
- `features/builder/components/DielineRenderer.tsx`: artwork builder/editor preview.

### How faces are drawn

Faces are SVG `<polygon>` elements generated from `face.vertices`.

### How cut paths are drawn

If `graph.geometry` exists, `primitiveToSvgPath` draws geometry primitives. Otherwise renderers fall back to `graph.cutPaths`.

### How crease/fold lines are drawn

Creases are either geometry primitives with layer `crease`, or fallback `<line>` elements from `graph.creases`.

### How labels are drawn

Labels come from geometry primitives of type `label`, or fallback to face centroids and labels.

### How coordinates are interpreted

Graph coordinates are used directly in the SVG viewBox. Units are effectively millimeters.

### SVG coordinate system

`viewBox="0 0 width height"`, x right, y down. This matters for fold sign inference later.

### Whether bleed/safe/glue zones are implemented

Partially implemented:

- Bleed/safe are rendered as rectangular guide offsets per face bounds in `DielineRenderer.tsx`.
- Glue exists as face role and metadata part.
- True offset bleed/safe polygons for non-rectangular flaps are not implemented.

### Current issues

- RTE measurements in `DielineViewport.tsx` use a different body top formula than the generator.
- Bleed/safe guides are rectangular bounds-based, not true face offsets.
- Cut paths are not joined loops.
- Internal score lines are modeled as creases, which confuses validation.

---

## 12. 3D Rendering Pipeline

### Which component renders 3D

`features/builder/DielineCartonStage.tsx`.

### How faces become THREE.ShapeGeometry

`DielineCartonStage.tsx` receives solved folded faces from `buildFoldedModel`, creates a `THREE.Shape`, adds each local vertex, closes the shape, and creates `ShapeGeometry`.

### How UV mapping works

UVs are computed from local geometry position:

```text
u = x / localBounds.width
v = 1 - y / localBounds.height
```

This is simple and works for rectangular-ish face textures, but may not handle rotation, non-rectangular mapping expectations, or per-face crop transforms precisely.

### How textures/artwork are applied

A texture URL is looked up by `faces[face.faceId]`. If found, a `TextureLoader` loads it and applies it to `meshStandardMaterial`. Otherwise a role-based material color is used.

### How faceTree drives folding

`fold3d.ts` traverses `faceTree`. Root remains flat. Child faces are rotated around the connecting crease line.

### How crease pivots are calculated

Crease endpoints are converted from flat graph coordinates to 3D coordinates, transformed through the parent matrix, then used as the axis for `rotationAroundLine`.

### How fold direction is handled

Angle is:

```text
crease.foldAngle * crease.direction * inferredSign
```

`inferredSign` is based on which side of the crease the child centroid is on. This is convenient but risky because it substitutes geometry inference for explicit fold semantics.

### How coordinate conversion works

2D x maps to 3D x, 2D y maps to 3D z, and vertical 3D y is introduced by rotations.

### Current issues

- Fold direction may be wrong even if the 2D graph is correct.
- There is no material thickness.
- Internal self-creases are not represented as foldable child faces.
- Texture UVs are bounds-based.
- No 3D golden snapshot test found.

### Whether wrong 3D can happen even if 2D is correct

Yes. A correct flat dieline can fold incorrectly if `faceTree`, crease direction, parent-child relationship, or inferred fold sign is wrong.

---

## 13. Artwork Assignment Flow

### How artwork sources are uploaded

The builder uploads images/PDFs through `DielineRenderer.tsx` and related artwork hooks/helpers.

### How artwork is stored

`artworkSlice.ts` stores source files as `ArtworkSource[]` and assigned/cropped faces as `FaceAssets`.

### How a source is assigned to a face

`setFace({ face, asset })` stores an asset at `state.faces[face]` where `face` is a dynamic face id.

### How crop data is stored

Each `FaceAsset` contains `crop: CropSettings`.

### How faceAssets are keyed

By dynamic face id string.

### Whether dynamic face IDs are correctly used

Mostly yes in `artworkSlice.ts` and `DielineRenderer.tsx`.

### Whether any legacy six-face assumptions remain

Yes. `domain/packaging/index.ts` still defines `FACE_KEYS` and `TEMPLATE_IDS = [folding-carton]`, and `projectPayload.ts` still saves the legacy template id.

---

## 14. Persistence / Save / Load / Publish Flow

### API routes

Dieline API routes are present. Project API routes likely existed before this branch but were not part of the inspected diff. Dieline route behavior is **Present but usage not confirmed**.

### Project payload

`utils/projectPayload.ts` creates full and patch payloads from live builder state.

### Database schema

Supabase schema file was not found in the inspected branch diff. Server error messages reference `supabase/schema.sql`.

### Local fallback

`server/projects/service.ts` writes `storage/projects-db.json` and per-project folders.

### Supabase flow

If configured, `server/projects/service.ts` uses a `projects` table and `project-faces` bucket.

### Asset storage

- Rendered face images are stored by face id.
- Source artwork images are stored by asset id.
- Workspace `faceAssets` store source/crop metadata.

### Draft vs published

`ProjectStatus` is `draft` or `published`.

### Public viewer

`features/viewer/ProjectViewer.tsx` exists and was modified. It depends on project data correctness.

### Migration of old projects

`utils/migrateProject.ts` exists but was not deeply inspected.

### Whether DielineGraph is saved

Only partially. `ProjectDieline` can include `graph`, and the server can store it in `workspace`. But `createFullProjectPayload` only includes `workspace.dieline` when source is `svg-upload` or `library`, not for normal generated template projects.

### Whether graph can be reproduced later

Partially. If the exact graph is saved, yes. If only dimensions and legacy `templateId` are saved, the exact catalog-generated graph may not be reproducible.

---

## 15. Validation System

### Parameter validation

Catalog parameter resolution and generator normalization clamp values. Reverse Tuck End has local parameter constraints.

### Catalog validation

`validateTemplateCatalog.ts` validates catalog references before generation.

### DielineGraph validation

`validateDielineGraph.ts` strictly validates generator output.

### Face/crease validation

Faces are checked for duplicate ids, finite points, self-intersections, tiny edges. Creases are checked for duplicate ids, face references, finite endpoints, nonzero length, and boundary alignment.

### faceTree validation

Strict validator expects exactly one root, no cycles, no duplicate faces, all faces covered, and each child crease connecting parent to child.

### SVG/path validation

`validation.ts` sanitizes cut path `d` length and point data. `svgImporter.ts` is present but not deeply inspected.

### Visual smoke tests

`verify-visual.mjs` exists and was modified. Golden reference use is not confirmed.

### Missing validation

- Semantic validation for internal score lines vs structural creases.
- Mountain/valley fold validation.
- Joined cut contour validation.
- Template-specific required part validation.
- RTE reference overlay validation.
- 3D expected bounds/orientation validation.
- Export file validation.

---

## 16. Current Technical Debt

### Critical

**Problem:** Internal tuck lip creases are modeled as self-referencing `DielineCrease` objects.  
**Files involved:** `reverseTuckEnd.ts`, `validateDielineGraph.ts`, `fold3d.ts`.  
**Risk:** Graph validation and fold semantics are confused.  
**Recommended next action:** Add semantic distinction between structural creases and internal score/guide lines before changing RTE geometry.

**Problem:** Generated template graph is not reliably persisted.  
**Files involved:** `projectPayload.ts`, `builderSlice.ts`, `domain/packaging/index.ts`, `server/projects/service.ts`.  
**Risk:** Save/load/viewer can lose exact template geometry.  
**Recommended next action:** Define canonical project dieline persistence for generated templates.

**Problem:** Legacy six-face template id remains central.  
**Files involved:** `domain/packaging/index.ts`, `utils/projectPayload.ts`.  
**Risk:** Dynamic catalog templates are forced into `folding-carton`.  
**Recommended next action:** Introduce a catalog-aware project template identity model.

**Problem:** Generic generator can appear production-ready.  
**Files involved:** `foldingBoxVariants.ts`, `foldingBoxCatalog.json`, `templateRegistry.ts`.  
**Risk:** Incorrect dielines for real printing/manufacturing.  
**Recommended next action:** Mark generic outputs as placeholder unless fixture-verified.

### High

**Problem:** Fold direction is inferred rather than explicit.  
**Files involved:** `fold3d.ts`, template generators.  
**Risk:** 3D can fold wrong while 2D is correct.  
**Recommended next action:** Add explicit fold semantic metadata.

**Problem:** RTE measurement overlay uses inconsistent formula.  
**Files involved:** `DielineViewport.tsx`, `reverseTuckEnd.ts`.  
**Risk:** UI dimension guides do not match real generated graph.  
**Recommended next action:** Derive measurements from graph geometry or metadata positions.

**Problem:** No confirmed golden fixtures.  
**Files involved:** `fixtures/dielines/references/*`, `scripts/verify-visual.mjs`.  
**Risk:** Visual fixes cannot be trusted.  
**Recommended next action:** Add one verified RTE reference before fixing geometry.

### Medium

**Problem:** Cut paths are segmented exterior edges.  
**Files involved:** `geometry.ts`, export routes.  
**Risk:** DXF/PDF export may not be production-friendly.  
**Recommended next action:** Add contour joining and export validation later.

**Problem:** Bleed/safe guides are rectangular bounds-based.  
**Files involved:** `DielineRenderer.tsx`.  
**Risk:** Non-rectangular flaps get inaccurate guides.  
**Recommended next action:** Add polygon offset strategy later.

**Problem:** Two builder experiences are not unified.  
**Files involved:** `features/builder/*`, `features/dieline-builder/*`.  
**Risk:** Features work in one flow but not another.  
**Recommended next action:** Define one graph-first builder flow.

### Low

**Problem:** Some present files are not confirmed in runtime flow.  
**Files involved:** `fullSealEnd.ts`, `mailerBox.ts`, `sleeve.ts`, `stickers.ts`, `trayWithLid.ts`.  
**Risk:** Confusion during maintenance.  
**Recommended next action:** Add registry/usage documentation.

---

## 17. Current Bug Risk Map

| Area | Risk | Symptoms | Likely Files | How to Verify |
|---|---|---|---|---|
| Reverse Tuck End geometry | Critical | Flaps/creases appear in wrong places or validation fails | `reverseTuckEnd.ts` | Compare generated SVG to trusted RTE reference |
| Generic generator accuracy | Critical | Many templates look plausible but print wrong | `foldingBoxVariants.ts` | Mark generic outputs and compare each with references |
| faceTree correctness | High | 3D folds from wrong parent or detached faces | `reverseTuckEnd.ts`, `fold3d.ts` | Print faceTree and inspect parent-child crease connections |
| Fold direction | High | 3D folds outward/inward incorrectly | `fold3d.ts`, generator crease directions | Snapshot folded face normals/positions |
| Cut path generation | High | Export has broken/unjoined cut contours | `geometry.ts`, export route | Join contours and inspect DXF/PDF in CAD |
| Dynamic face assets | Medium | Artwork lost or applied to wrong face | `artworkSlice.ts`, `DielineRenderer.tsx`, `projectPayload.ts` | Save/load project with non-six-face template |
| JSON catalog mismatch | High | Template shown as available but generator missing/wrong | `foldingBoxCatalog.json`, `templateRegistry.ts`, `generatorRegistry.ts` | List catalog entries vs registered generator ids |
| Template registry mismatch | High | Wrong generator called for slug/id | `templateRegistry.ts`, `parameterAliases.ts` | Unit test id/slug/generator mapping |
| 3D pivot folding | High | 2D correct but mockup wrong | `fold3d.ts`, `DielineCartonStage.tsx` | Validate crease axis and world vertices per face |
| Save/load graph persistence | Critical | Published/viewer project renders old carton instead of generated graph | `projectPayload.ts`, `builderSlice.ts`, `server/projects/service.ts` | Save generated RTE project, reload, compare graph JSON |

---

## 18. What Should Be Fixed First

### Priority 1

Architecture / validation / observability before fixes:

1. Add a generated graph debug export for RTE.
2. Run strict validation on RTE and record actual errors.
3. Separate structural creases from internal score/guide lines.
4. Add graph snapshot fixtures for default RTE.

### Priority 2

Reverse Tuck End exact verification:

1. Add trusted reference SVG/PDF/DXF.
2. Overlay generated RTE against reference.
3. Verify face ids, crease ids, cut paths, and closure positions.

### Priority 3

Template catalog integration:

1. Confirm catalog `reverse-tuck-end` maps to `reverseTuckEnd` generator.
2. Mark all missing generators as catalog-only.
3. Remove or clearly label generic placeholders.

### Priority 4

3D folding corrections:

1. Add explicit fold direction/mountain-valley metadata.
2. Validate folded body panel positions.
3. Only fix 3D after 2D graph is confirmed.

### Priority 5

More templates:

Only after RTE is verified end-to-end and persistence is graph-first.

---

## 19. What Should NOT Be Done Yet

- Do not add more templates.
- Do not modify random geometry formulas.
- Do not copy more website data into JSON.
- Do not claim production-ready output.
- Do not build production DXF/PDF export before graph correctness.
- Do not fix 3D before confirming 2D.
- Do not change face IDs again without a migration plan.
- Do not use the generic folding box generator as production geometry.
- Do not refactor the whole builder until save/load graph ownership is decided.

---

## 20. Recommended Future Architecture

Principle:

```text
JSON catalog = template metadata and UI schema
TypeScript generators = real geometry
DielineGraph = runtime source for 2D/3D
fixtures = verification references
validation = safety layer
viewer = readonly rendering
```

Recommended folder structure:

```text
domain/dieline/
  catalog/
    foldingBoxCatalog.json
    schema.ts
    normalize.ts
    resolveParameters.ts
    validateCatalog.ts
  generators/
    registry.ts
    reverseTuckEnd.generator.ts
    straightTuckEnd.generator.ts
  templates/
    metadata-only exports or generator wrappers
  validation/
    validateGraph.ts
    validateTemplateSemantics.ts
    validateExportContours.ts
  fixtures/
    reverse-tuck-end/
      reference.svg
      expected.graph.json
      expected.preview.png
  geometry/
    polygon.ts
    contours.ts
    offsets.ts
  folding/
    fold3d.ts
    foldSemantics.ts

features/dielines/
  catalog pages
  library dashboard

features/builder/
  graph-first artwork builder
  2d renderer
  3d renderer
  save/load integration

features/viewer/
  readonly graph renderer
  published project renderer
```

Key architecture change:

`ProjectWorkspace.dieline.graph` should become the canonical saved graph for every non-legacy generated template project, including catalog templates.

---

## 21. Concrete Next Tasks

### Task 1: Export RTE graph snapshot

- **Goal:** See exact generated faces, creases, geometry, metadata.
- **Files to inspect:** `reverseTuckEnd.ts`, `scripts/verify-dieline-graph.mjs`.
- **Files to modify later:** verification script only.
- **Expected output:** `fixtures/dielines/references/cefbox/reverse-tuck-end.generated.graph.json`.
- **Risk:** Low.

### Task 2: Run strict validation on RTE

- **Goal:** Confirm whether self lip creases fail validation.
- **Files to inspect:** `validateDielineGraph.ts`, `generateGraphFromCatalogTemplate.ts`.
- **Files to modify later:** none at first.
- **Expected output:** exact validation error list.
- **Risk:** Low.

### Task 3: Define crease semantics

- **Goal:** Separate structural face hinges from internal score/guide lines.
- **Files to inspect:** `types.ts`, `reverseTuckEnd.ts`, `DielineViewport.tsx`, `fold3d.ts`.
- **Files to modify later:** `types.ts`, generators, validators, renderers.
- **Expected output:** model proposal for `DielineCrease` vs `GeometryPrimitive layer=crease/perf`.
- **Risk:** Medium.

### Task 4: Add trusted RTE reference fixture

- **Goal:** Stop guessing about geometry.
- **Files to inspect:** `fixtures/dielines/references/README.md`, `verify-visual.mjs`.
- **Files to modify later:** fixtures and visual script.
- **Expected output:** reference SVG and overlay comparison.
- **Risk:** Medium.

### Task 5: Fix save/load graph persistence design

- **Goal:** Make generated template projects reload the same graph.
- **Files to inspect:** `projectPayload.ts`, `builderSlice.ts`, `server/projects/service.ts`, `ProjectViewer.tsx`.
- **Files to modify later:** payload builder, builder hydration, project types, viewer.
- **Expected output:** project stores `templateId`, `templateSlug`, `generatorId`, user parameters, resolved parameters, and graph snapshot.
- **Risk:** High.

### Task 6: Catalog/generator status audit

- **Goal:** Prevent users from trusting missing/generic templates.
- **Files to inspect:** `foldingBoxCatalog.json`, `generatorRegistry.ts`, `templateRegistry.ts`, `foldingBoxVariants.ts`.
- **Files to modify later:** catalog runtime status and UI badges.
- **Expected output:** table of catalog-only, implemented, generic-placeholder, verified.
- **Risk:** Medium.

### Task 7: 3D fold verification

- **Goal:** Confirm 3D only after 2D is correct.
- **Files to inspect:** `fold3d.ts`, `DielineCartonStage.tsx`.
- **Files to modify later:** fold semantics and 3D renderer.
- **Expected output:** folded face position checks for RTE.
- **Risk:** High.

---

## 22. Final Conclusion

FoldView has moved in the right direction by introducing a graph-first architecture. `DielineGraph`, catalog normalization, generator registry, 2D rendering, 3D folding, and dynamic face assets are all strong foundations.

The weak part is that the old six-face carton system still controls important save/load and project identity behavior. At the same time, the JSON catalog is much larger than the implemented generator set, and the generic folding box generator can create plausible but not production-safe structures.

The Reverse Tuck End issue should not be treated as only a generator bug, only a 3D bug, or only a JSON bug. The current evidence points to a deeper modeling issue: internal crease/score lines are represented using the same `DielineCrease` structure as face-to-face hinges, while validators and 3D folding expect creases to connect two faces along boundaries.

Fixes are going wrong because the system lacks a verified reference and because multiple layers are still competing as sources of truth: legacy packaging, JSON catalog, TypeScript generator, and saved project payload.

The correct next move is to pause new templates and random formula edits, generate/validate the Reverse Tuck End graph, compare it with a trusted reference, then update the architecture so the graph model clearly separates structural hinges from print/score guide lines and is saved as the canonical project artifact.
