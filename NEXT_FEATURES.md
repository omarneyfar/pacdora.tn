# Next Features Roadmap

This file tracks the next product steps for FoldView after the current MVP: save/edit projects, Supabase storage, draft/published status, dashboard management, and view-only share links.

## Priority Features

1. Project thumbnails
   - Generate or capture a small preview for each project.
   - Show the thumbnail in the dashboard instead of the generic box icon.
   - Use the thumbnail to make saved projects easier to recognize.

2. Share page polish
   - Show the project name and dimensions on `/view/:id`.
   - Keep the page view-only for clients.
   - Add a copy-link button and simple client-facing presentation polish.

3. Publish confirmation
   - When changing from Draft to Published, confirm that anyone with the link can view the project.
   - Apply this in both the builder and dashboard.

4. Auto-save draft
   - After a project exists, auto-save changes after a short delay.
   - Keep manual Save as a clear control.
   - Avoid auto-publishing; changes should return the project to Draft until published again.

5. Artwork library cleanup
   - Let users delete unused source images.
   - Warn if a source image is currently used by one or more faces.
   - Keep one original image and crop parameters instead of saving many cropped copies.

6. Duplicate as template
   - Make duplicate behavior clearer in the dashboard as "Use as template".
   - Duplicates should always become Draft projects.

7. Export preview PNG
   - Add a button to download the current 3D preview as a PNG.
   - Useful for WhatsApp, email, and quick client approvals.

## Printer-Focused Dieline Enhancement

The next major design feature should make the dieline useful for printing houses, not only a visual upload map.

Goals:
- Make the flat dieline look closer to a real print/prepress dieline.
- Show dimensions in millimeters directly on the dieline.
- Add visual guide types:
  - Cut lines
  - Fold/crease lines
  - Bleed area
  - Safe area
  - Artwork zones
  - Face labels
- Improve pizza-box style layouts such as `232 x 232 x 70 mm`.
- Keep each face configurable from `width`, `depth`, and `height`.
- Add a 3D overlay mode that shows the dieline guides on the folded carton.
- Let the user see where each flat dieline area lands on the 3D model.

Suggested UI:
- Add a `Dieline guides` toggle in the flat dieline panel.
- Add a `Show guides in 3D` toggle in the 3D stage toolbox.
- Use restrained print-friendly colors:
  - Cut: solid warm red
  - Fold: dashed blue
  - Bleed: dotted green
  - Safe area: light gray
- Keep the current artwork upload/crop workflow working.

Potential technical direction:
- Extend `lib/carton.ts` with a richer dieline model, for example `DielineGuide`, `DielineSegment`, and guide metadata per face.
- Keep `FaceSpec` for face rectangles, but add print guide geometry around it.
- Update `components/Builder.tsx` dieline rendering to draw guides as an SVG overlay instead of relying only on absolutely positioned rectangles.
- Update `components/CartonStage.tsx` to optionally render edge/fold/placement guides on the 3D carton.
- Keep project storage compatible; guide overlays should be derived from dimensions, not saved as images.

## Ready Prompt For The Next Implementation Pass

Use this prompt when starting the next coding session:

```text
We are building FoldView, a Pacdora-inspired MVP for printing houses. The current app already supports configurable carton dimensions, six face artwork upload/crop, source artwork reuse, Supabase project saving, draft/published status, a dashboard, and view-only share links.

Now implement a printer-focused dieline enhancement.

Important context:
- Main builder: components/Builder.tsx
- 3D carton: components/CartonStage.tsx
- Carton geometry/types: lib/carton.ts
- Artwork crop/render helpers: lib/client/artwork.ts
- Global styles: app/globals.css

Goal:
Make the dieline more useful for imprimeries / printing houses. It should look closer to a real prepress dieline, and the 3D preview should also be able to show the same dieline/placement guides on the folded carton.

Requirements:
1. Keep the current upload, crop, reuse, save, publish, and share flows working.
2. Keep the current configurable box dimensions: width, depth, height.
3. Improve the flat dieline with print guides:
   - Solid cut lines
   - Dashed fold/crease lines
   - Bleed area
   - Safe area
   - Face labels
   - Dimension labels in mm
4. Make the dieline especially clear for pizza-box dimensions like 232 x 232 x 70 mm.
5. Add a toggle in the builder to show/hide print guides on the flat dieline.
6. Add a toggle in the 3D stage toolbox to show/hide dieline guides on the folded carton.
7. In 3D, show guide lines and face/placement boundaries so the user understands where each flat dieline side appears after folding.
8. Use derived geometry from lib/carton.ts, not hardcoded CSS-only magic.
9. Keep the design professional and compact. This is an operational print/prepress tool, not a marketing page.
10. Run lint, build, and browser smoke checks on desktop and mobile.

Suggested implementation:
- Extend lib/carton.ts with guide geometry types and helper functions.
- Render the flat dieline as a layered SVG/HTML composition in Builder.
- Render optional guide overlays in CartonStage with Three.js line geometry or thin mesh lines.
- Keep artwork textures and crop behavior unchanged.

Acceptance tests:
- A 232 x 232 x 70 mm project shows clear square top/bottom and 70 mm side panels.
- Cut/fold/bleed/safe guides are visually distinct.
- Dimension labels do not overlap badly on desktop or mobile.
- 3D guide toggle shows fold/face boundaries on the carton.
- Draft/published project save behavior still works.
- Published share view still opens; draft share view remains blocked.
```

