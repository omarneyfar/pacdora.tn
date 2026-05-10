# FoldView

FoldView is a packaging preview MVP for printing houses. It lets a designer prepare carton artwork, preview it in 3D, save projects, and publish view-only links for clients.

The product is inspired by tools like Pacdora, but this codebase is not a clone. The current goal is a focused foundation that can grow into custom dielines, reusable templates, and printer-friendly previews.

## Current Status

The app has two main work areas:

- Project Builder: create or edit a carton project, upload artwork, crop it per face, preview in 3D, save as draft, and publish.
- Dieline Studio: import an SVG dieline or manually assemble a reusable dieline template, then mark it ready and start a project from it.

The original fixed folding-carton flow is the most stable part. The newer graph-based custom dieline and generic 3D folding flow exists, builds, and is usable for experiments, but still has important correctness gaps listed in Known Problems.

## Latest Updates

- Added `/dielines`, `/dielines/new`, and `/dielines/[id]/edit` for reusable dieline management.
- Added `DielineGraph` based templates for folding carton variants, sleeve, tuck end, mailer, tray with lid, and full seal end.
- Added `DielineCreator` for manual panel assembly.
- Added `DielineCartonStage` as an experimental 3D renderer for graph-based dielines.
- Added local seed dielines that populate the dieline library when it is empty.
- Added a prepared-dieline picker in the builder sidebar.
- Removed the Drei `Environment preset="city"` dependency from the 3D stages so the canvas no longer crashes when the remote HDR file cannot load.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 App Router | Pages and API routes |
| UI | React 19 + TypeScript | Builder, dashboards, studio |
| State | Redux Toolkit | Builder, artwork, UI state |
| 3D | Three.js, React Three Fiber, Drei | Interactive carton preview |
| Crop | react-advanced-cropper / advanced-cropper | Crop, rotate, reflect artwork |
| PDF | pdfjs-dist | First-page PDF rasterization |
| Project Storage | Supabase or local filesystem | Project metadata and assets |
| Dieline Storage | Local JSON file | Reusable dieline templates for now |
| Verification | ESLint, Next build, Playwright scripts | Smoke checks |

## Project Structure

```txt
app/                         Next.js pages and API route entrypoints
  api/projects/              Project CRUD
  api/dielines/              Dieline template CRUD
  project/[id]/edit/         Edit project route
  projects/                  Project dashboard
  view/[id]/                  Published view-only route
  dielines/                  Dieline library and editor routes

domain/                      Pure TypeScript domain logic
  packaging/                 Current fixed carton template and project DTOs
  dieline/                   DielineGraph types, SVG import, validation, templates
  dielines/                  Dieline template DTOs and status helpers

features/
  builder/                   Builder shell, panels, 3D stages, crop modal
  artwork/                   Artwork import, crop, render helpers
  projects/                  Project dashboard and client API helpers
  viewer/                    Published view-only viewer
  dielines/                  Dieline dashboard, studio, SVG/manual creator

hooks/                       Builder orchestration hooks
store/                       Redux Toolkit slices and scoped provider
server/                      Server services, storage, and persistence adapters
scripts/                     Verification scripts
supabase/                    Project database schema
storage/                     Local runtime data, ignored by git
```

## Core Data Model

The fixed carton project model still uses six public face keys:

```ts
type FaceKey = "front" | "back" | "left" | "right" | "top" | "bottom";
```

Custom dielines use a more flexible graph:

```ts
type DielineGraph = {
  size: { width: number; height: number };
  faces: DielineFace[];
  creases: DielineCrease[];
  cutPaths: DielineCutPath[];
  faceTree: DielineFaceNode[];
};
```

Projects can store a selected custom/library dieline inside `workspace.dieline`, but artwork assignment is still limited by `FaceKey`. This mismatch is the main architecture problem to fix next.

## Getting Started

```bash
npm install
npm run dev
```

Open:

- Builder: `http://localhost:3000/`
- Projects: `http://localhost:3000/projects`
- Dielines: `http://localhost:3000/dielines`

Local mode works without Supabase. Project data is saved in `storage/projects-db.json`, project assets in `storage/projects/`, and dieline templates in `storage/dielines-db.json`.

## Supabase Setup

Supabase is currently used for projects and project assets.

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env`.
4. Fill:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECTS_BUCKET=project-faces
SUPABASE_PROJECTS_TABLE=projects
```

Dieline templates are not yet stored in Supabase. They currently use local JSON storage.

## How To Use

### Build A Project

1. Open `/`.
2. Choose default folding carton or a prepared dieline from the sidebar.
3. Upload PNG, JPG, or PDF artwork.
4. Crop, rotate, or reflect the artwork.
5. Reuse uploaded artwork from the library on multiple faces.
6. Inspect the live 3D preview.
7. Save the project.
8. Publish when ready and share `/view/:id`.

Draft projects cannot be viewed publicly. Published projects are unlisted but accessible to anyone with the link.

### Create Or Import A Dieline

1. Open `/dielines/new`.
2. Choose Import SVG or Create manually.
3. Save the dieline as Draft while it is being prepared.
4. Change status to Ready when it can be used by projects.
5. Start a project from the saved dieline, or select it from the builder sidebar.

### SVG Import Rules

The SVG importer currently supports simple `polygon`, `polyline`, `rect`, `line`, and `path` elements.

Faces must use one of:

```svg
<rect id="face-front" ... />
<polygon data-face-id="front" ... />
```

Creases must be line elements and include connected faces:

```svg
<line id="crease-front-right" data-face-a="front" data-face-b="right" x1="100" y1="0" x2="100" y2="160" />
```

Cut paths can use `id="cut-..."`, `data-kind="cut"`, or a class containing `cut`.

## API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Read project |
| PATCH | `/api/projects/:id` | Patch changed project fields |
| DELETE | `/api/projects/:id` | Delete project and assets |
| POST | `/api/projects/:id/duplicate` | Duplicate as draft |
| GET | `/api/project-assets/:id/:asset` | Serve source artwork |
| GET | `/api/project-faces/:id/:face` | Serve rendered face image |
| GET | `/api/dielines` | List dieline templates |
| POST | `/api/dielines` | Create dieline template |
| GET | `/api/dielines/:id` | Read dieline template |
| PATCH | `/api/dielines/:id` | Update dieline template |
| DELETE | `/api/dielines/:id` | Delete dieline template |

## Verification

```bash
npm run lint
npm run build
npm run verify:dieline
npm run verify:visual
```

Current verified state after the latest 3D lighting fix:

- `npm run lint` passes.
- `npm run build` passes.
- `npm run verify:dieline` passes for the default carton and SVG fixture.

`verify:visual` needs a running dev or production server at `PLAYWRIGHT_BASE_URL` or `http://127.0.0.1:3000`.

## Known Problems

### High Priority

- Public viewer ignores custom dielines. `features/viewer/ProjectViewer.tsx` still renders the legacy `CartonStage`, so a published custom dieline can show as the default carton.
- Artwork assignment is still six-face based. `DielineRenderer`, crop helpers, payloads, and Redux artwork state are based on `FaceKey`, so custom faces like `base`, `lid`, `wall-top`, `glue-tab`, or custom panel IDs cannot be filled properly.
- Project save payload stores `templateId: "folding-carton"` even when the selected dieline is custom. The real selected graph is stored in `workspace.dieline`, but the top-level template contract is still legacy.

### 3D Problems

- `DielineCartonStage` is experimental. It uses graph creases and a recursive pivot-group fold, but complex trees and creases that are not exactly on the parent edge can fold incorrectly.
- The pure math file `domain/dieline/fold3d.ts` exists, but the 3D component currently has its own folding algorithm. These two paths can diverge.
- Some generated seed templates need geometric validation. For example, a child flap can reference a crease line that is not actually on the parent face edge.
- Generic custom 3D does not yet have strong visual tests. The existing visual verifier mostly protects the default folding-carton flow.
- The old remote HDR environment crash is fixed by removing `<Environment preset="city" />`, but 3D lighting still needs design tuning.

### Dieline Builder Problems

- Manual panel removal has a bug: removing a leaf panel can do nothing because `removePanel` exits before adding the selected face to the removal set.
- Manual top/left panel creation can produce negative coordinates. The SVG preview and graph size calculations do not normalize the graph back to a positive origin.
- Manual panel attachment uses parent bounds, not the actual selected polygon edge. This is fragile for trapezoids and non-rectangular panels.
- Manual panel `width` can differ from the attachment edge length while the crease remains the full parent edge. That can create invalid geometry.
- Some new files contain mojibake in comments or UI strings. Source text should be cleaned to UTF-8 or plain ASCII.

### Persistence And Architecture

- Dieline templates are local-only in `storage/dielines-db.json`; they do not yet use Supabase.
- Seed dielines are injected only when the local dieline DB is empty. Updating seed definitions later will not update existing local libraries automatically.
- Dieline status uses `draft` and `ready`, while projects use `draft` and `published`. This is correct conceptually, but UI labels and docs must keep the distinction clear.
- `tsconfig.tsbuildinfo` is tracked and often changes after build. It should be removed from git tracking and ignored.

### Test Coverage Gaps

- No automated test currently verifies every seed template graph.
- No automated test checks that custom dielines survive save, reload, publish, and public view.
- No automated test checks manual DielineCreator add/remove/negative-coordinate behavior.
- No automated pixel test verifies custom graph folding in `DielineCartonStage`.

## Recommended Next Architecture Step

Move artwork assignment from fixed `FaceKey` to graph `faceId`.

That means updating:

- `artworkSlice`
- crop modal and crop helpers
- `DielineRenderer`
- project payloads
- project storage DTOs
- public viewer
- 3D custom stage texture mapping

Once that is done, custom dielines can become real production data instead of an experimental layer beside the stable six-face carton.

## License

Private - all rights reserved.
