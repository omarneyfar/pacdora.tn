# FoldView MVP

FoldView is a packaging preview MVP for creating, saving, and sharing editable carton projects. It supports configurable dimensions, reusable artwork sources, per-face crop settings, Supabase or local persistence, and a published view-only 3D client link.

## Features

- Interactive 3D carton preview with orbit, zoom, fullscreen, and print guide toggle
- Six editable carton faces: front, back, left, right, top, bottom
- Configurable carton dimensions with a printer-focused dieline preview
- Image and PDF import, reusable artwork library, crop, rotate, and reflect tools
- Draft and published project status
- Dashboard project list with inline rename, status changes, duplicate, and delete
- View-only share pages for published projects only
- Supabase storage/database support with local filesystem fallback

## Architecture

```txt
app/                         Next.js pages and API route entrypoints
components/ui/               Shared visual primitives
domain/packaging/            Pure packaging templates, faces, dielines, model specs
domain/projects/             Project contracts, patches, list options
features/artwork/            Client artwork import, crop, and render logic
features/builder/            Builder shell, dieline editor, crop UI, 3D stage
features/projects/           Dashboard UI and typed client API helpers
features/viewer/             Published view-only client viewer
server/projects/             Project application service and repository contracts
server/db/                   Database adapter entrypoints
server/storage/              Asset storage contracts and adapter entrypoints
supabase/                    Database schema and migration SQL
scripts/                     Verification scripts
```

`app/` should stay thin. Pure geometry and template rules live in `domain/packaging`; React UI lives in `features/`; persistence and storage live in `server/`.

## Data Model

Projects use the `folding-carton` packaging template by default:

```ts
type Project = {
  id: string;
  name: string;
  status: "draft" | "published";
  templateId: "folding-carton";
  dimensions: { width: number; height: number; depth: number };
  faces: Partial<Record<"front" | "back" | "left" | "right" | "top" | "bottom", string>>;
  createdAt: string;
  updatedAt: string;
  workspace?: ProjectWorkspace;
};
```

Supabase projects require a `template_id` column. Run `supabase/schema.sql` in the Supabase SQL editor after pulling schema changes.

## Environment

For local development, Supabase variables can be empty and the app will use `storage/`.

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECTS_BUCKET=project-faces
SUPABASE_PROJECTS_TABLE=projects
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the production bundle |
| `npm run verify:visual` | Run Playwright canvas/layout smoke checks |

## Workflow

1. Open the builder at `/`.
2. Set carton dimensions.
3. Upload artwork sources.
4. Crop artwork onto faces.
5. Save the project as draft or published.
6. Share `/view/:id` only after publishing.

Draft projects are blocked from the public viewer. Published projects are unlisted and view-only.
