# FoldView

**A packaging design platform for printing houses.**

FoldView is an interactive web application that lets designers and print professionals create, preview, and share 3D carton mockups — directly in the browser. Upload artwork, assign it to any face of a folding carton, crop and transform it, then share a published 3D preview with your clients through a single link.

Built as a focused, production-grade alternative to SaaS packaging editors like Pacdora or Packlane — designed to run on your own infrastructure.

---

## What It Does

### For Designers
- **Configurable carton dimensions** — set width, depth, and side height in millimeters (20–600 mm range)
- **Six-face artwork assignment** — upload PNG, JPG, or PDF files to any face: front, back, left, right, top, bottom
- **Professional crop tools** — aspect-locked cropping, rotation (90°), horizontal/vertical reflection, zoom
- **Reusable artwork library** — every uploaded image is stored in a session library and can be applied to multiple faces
- **Flat dieline with print guides** — SVG-rendered cut lines, fold lines, bleed areas, safe zones, and dimension labels

### For Client Presentation
- **Real-time 3D preview** — orbit, zoom, reset, and fullscreen an interactive Three.js carton model
- **3D guide overlay** — toggle fold lines and safe-area boundaries directly on the 3D model
- **Draft / Published workflow** — projects stay private until explicitly published
- **Shareable view-only links** — publish a project and send `/view/:id` to clients (no login required)

### For Print Production
- **Dimension-driven geometry** — all dieline layouts and 3D proportions are derived from millimeter inputs, not hardcoded
- **Cut / fold / bleed / safe guide system** — guides use standard prepress color conventions (red cut, blue fold, green bleed, gray safe)
- **Pizza-box optimized** — default 232 × 232 × 70 mm template designed for common pizza carton dimensions
- **PDF import** — first-page rasterization of PDFs at print-ready resolution (up to 1400px long edge)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | **Next.js 16** (App Router) | SSR, routing, API routes |
| UI | **React 19** + TypeScript 6 | Component-driven interface |
| State | **Redux Toolkit** | Global state with typed slices |
| 3D Engine | **Three.js 0.184** via React Three Fiber + Drei | Interactive carton preview |
| Image Editing | `react-advanced-cropper` | Aspect-locked crop, rotate, flip |
| PDF Rendering | `pdfjs-dist` | Client-side PDF rasterization |
| Backend | **Supabase** (Postgres + Storage) | Project persistence and asset storage |
| Fallback | Local filesystem | Zero-config development without Supabase |
| Icons | `lucide-react` | Consistent UI iconography |
| Testing | **Playwright** | Visual smoke checks |

---

## Architecture

```
app/                              Next.js pages and API route entrypoints
  api/                            REST API — CRUD projects, face assets, source images
  project/[id]/edit/              Builder page for existing projects
  projects/                       Dashboard page
  view/[id]/                      Published view-only client page

store/                            Redux Toolkit state management
  builderSlice.ts                 Project identity, dimensions, save state
  artworkSlice.ts                 Artwork sources, face assignments, busy states
  uiSlice.ts                     UI state — modals, sections, errors, guides

hooks/                            Custom React hooks (all business logic)
  useProjectPersistence.ts        Load, save, patch, hydrate projects
  useArtworkWorkspace.ts          Upload, apply, crop, clear artwork
  useDimensionSync.ts             Debounced recrop on dimension changes
  useShareLink.ts                 Publish + clipboard copy

domain/packaging/                 Pure TypeScript geometry engine
  index.ts                       Face specs, dieline layout, 3D model, print guides

features/
  builder/                        Builder feature
    BuilderShell.tsx              Root layout shell (~126 lines)
    CartonStage.tsx               Three.js 3D carton preview
    toolbar/BuilderTopbar.tsx     Top navigation bar
    panels/ParametersPanel.tsx    Dimensions + library sidebar
    panels/DielinePanel.tsx       Dieline + guides sidebar
    components/                   7 memoized presentational components
  artwork/                        Artwork import, crop, and rendering
  projects/                       Dashboard UI + typed API client
  viewer/                         Published view-only viewer

server/
  projects/                       Application service + repository
  db/                             Supabase / local database adapters
  storage/                        Supabase / local asset storage adapters

utils/
  projectPayload.ts               Payload building, patch diffing, helpers

supabase/                         Database schema and migrations
```

### Design Principles

- **`app/` stays thin** — route files are 5–10 lines. No business logic in pages.
- **`domain/` is framework-free** — pure TypeScript geometry engine, fully testable without React.
- **`features/` owns the UI** — each feature has its own components, panels, and hooks.
- **`server/` owns persistence** — adapters for Supabase or local filesystem.
- **State flows through Redux** — no prop drilling. Components read from the store, hooks dispatch actions.
- **Memoization where it matters** — 7 components use `React.memo`, geometry computations use `useMemo`.

---

## Data Model

Projects use the `folding-carton` packaging template:

```typescript
type Project = {
  id: string;
  name: string;
  status: "draft" | "published";
  templateId: "folding-carton";
  dimensions: {
    width: number;   // mm
    height: number;  // side height, mm
    depth: number;   // mm
  };
  faces: Partial<Record<"front" | "back" | "left" | "right" | "top" | "bottom", string>>;
  workspace?: {
    sources: ArtworkSource[];        // uploaded images
    selectedSourceId?: string;       // active library selection
    faceAssets: Partial<Record<FaceKey, FaceAsset>>;  // per-face crop settings
  };
  createdAt: string;
  updatedAt: string;
};
```

### Database Schema

Postgres table with JSONB fields for dimensions, faces, and workspace:

```sql
create table public.projects (
  id            text primary key,
  name          text not null default 'Untitled carton',
  status        text not null default 'draft'
                check (status in ('draft', 'published')),
  template_id   text not null default 'folding-carton'
                check (template_id in ('folding-carton')),
  dimensions    jsonb not null,
  faces         jsonb not null default '{}',
  workspace     jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+

### Install

```bash
git clone <repo-url>
cd pacdora.tn
npm install
```

### Local Development (No Supabase)

By default, FoldView runs in local mode — no cloud credentials needed:

```bash
npm run dev
```

Projects are saved to `storage/projects-db.json` and images to `storage/projects/`.

### With Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Copy `.env.example` to `.env` and fill in:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECTS_BUCKET=project-faces
SUPABASE_PROJECTS_TABLE=projects
```

4. Start the dev server:

```bash
npm run dev
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run verify:visual` | Run Playwright canvas/layout smoke checks |

---

## Workflow

1. Open the builder at `/`
2. Set carton dimensions (width × depth × height in mm)
3. Upload artwork — PNG, JPG, or PDF
4. Assign artwork to faces via the flat dieline
5. Crop and transform each face's artwork
6. Toggle print guides (cut, fold, bleed, safe) on the dieline
7. Rotate and inspect the 3D carton preview
8. Save the project as draft
9. When ready, publish and share the `/view/:id` link with your client

Draft projects are blocked from the public viewer. Published projects are unlisted, view-only, and require no login.

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects` | List projects (with search, status filter, limit) |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/:id` | Read a single project |
| `PATCH` | `/api/projects/:id` | Update a project (smart patch — only changed fields) |
| `DELETE` | `/api/projects/:id` | Delete a project and its stored assets |
| `POST` | `/api/projects/:id/duplicate` | Duplicate a project as a new draft |
| `GET` | `/api/project-faces/:id/:face` | Serve a rendered face image |
| `GET` | `/api/project-assets/:id/:asset` | Serve a source artwork asset |

---

## State Management

FoldView uses **Redux Toolkit** with three typed slices:

| Slice | Responsibility | Key State |
|---|---|---|
| `builderSlice` | Project identity and persistence | `projectId`, `projectName`, `dimensions`, `saveStatus` |
| `artworkSlice` | Artwork workspace | `sources[]`, `faces{}`, `busyFace`, `isRecropping` |
| `uiSlice` | UI-only state | `cropModal`, `openSections`, `showDielineGuides`, `error` |

All business logic lives in **custom hooks** that read from and dispatch to the store:

| Hook | Responsibility |
|---|---|
| `useProjectPersistence` | Load, save, patch, hydrate projects from the API |
| `useArtworkWorkspace` | Upload files, apply sources to faces, clear faces |
| `useDimensionSync` | Debounced re-crop when dimensions change (300ms) |
| `useShareLink` | Publish project and copy share URL to clipboard |

---

## Geometry Engine

The `domain/packaging/` module is a **560-line pure TypeScript geometry engine** with no framework dependencies. Given a `{ width, height, depth }` in millimeters, it computes:

| Function | Output |
|---|---|
| `getFaceSpecs()` | Pixel position and size of each face on the flat dieline |
| `getDielinePrintGuides()` | Cut lines, fold lines, bleed rectangles, safe areas, dimension labels |
| `getDielineSpec()` | Complete dieline specification (size + faces + guides) |
| `getModelSpec()` | Normalized 3D positions, rotations, and sizes for Three.js rendering |
| `getBoxGuideEdges()` | 12 edge segments for the 3D wire-frame overlay |

All guide offsets are responsive — they scale down for small faces to prevent visual overlap.

---

## License

Private — all rights reserved.
