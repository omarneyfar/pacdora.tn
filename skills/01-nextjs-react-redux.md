# Skill: Next.js, React & Redux — FoldView Codebase Conventions

> **Read this before writing any React, Next.js, or state management code in this project.**

---

## Project Identity

- **App name:** FoldView
- **Stack:** Next.js 16 (App Router), React 19, TypeScript 6 (strict mode), Redux Toolkit
- **Package manager:** npm
- **Path alias:** `@/*` maps to project root
- **CSS:** Vanilla CSS only (no Tailwind). Single file: `app/globals.css`
- **Icons:** `lucide-react` exclusively — never import from other icon libraries

---

## Architecture Rules — The 5 Layers

```
app/            → Routes only. Max 10 lines per page file. No logic.
store/          → Redux slices. No React. No side effects. Pure reducers.
hooks/          → Custom hooks. All async logic, all side effects. One hook = one concern.
features/       → UI components grouped by feature (builder, projects, viewer, artwork).
domain/         → Pure TypeScript. Zero React imports. Math, types, geometry.
server/         → Node.js only. API services, DB adapters, storage adapters.
utils/          → Pure helper functions. No React. No side effects.
```

### Critical Violations to Avoid

1. **NEVER put business logic in a component.** Components do layout + dispatch. Logic goes in hooks.
2. **NEVER import React in `domain/`.** The domain layer is framework-free.
3. **NEVER use `useState` for data that multiple components need.** Use Redux.
4. **NEVER call `fetch()` from a component.** All API calls live in `features/*/projectClient.ts` or hooks.
5. **NEVER put `"use client"` on a page file.** Pages are Server Components. Wrap client code in separate components.

---

## Component Conventions

### File Structure

```
features/<feature>/
  <FeatureName>.tsx              → Root component (shell/orchestrator)
  toolbar/<ToolbarName>.tsx      → Top bar components
  panels/<PanelName>.tsx         → Sidebar panel components
  components/<ComponentName>.tsx → Atomic presentational components
```

### Component Template

```tsx
"use client";

import { memo } from "react";  // only if memoizing

type FooProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * One-line JSDoc describing what this component renders.
 * Memoized — only re-renders when props change.
 */
export const Foo = memo(function Foo({ value, onChange }: FooProps) {
  return (
    <div className="foo">
      {/* ... */}
    </div>
  );
});
```

### When to Memoize

| Memoize with `React.memo` | DON'T memoize |
|---|---|
| Receives primitives or stable refs as props | Receives unstable callbacks or new objects every render |
| Parent re-renders frequently but this child doesn't need to | Component is the root shell or renders once |
| Renders expensive SVG, canvas, or list content | Component is trivially cheap to render |

> **Rule:** `React.memo` without `useCallback` on the parent is useless. Always pair them.

### Conditional Rendering

```tsx
// ✅ Correct — ternary with null
{isOpen ? <Panel /> : null}

// ❌ Wrong — short-circuit with &&
{isOpen && <Panel />}
// This can render "0" or "false" as text if the condition is a number/boolean
```

---

## Redux Conventions

### Slice Template

```ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type FooState = { /* ... */ };

const initialState: FooState = { /* ... */ };

export const fooSlice = createSlice({
  name: "foo",
  initialState,
  reducers: {
    setBar(state, action: PayloadAction<string>) {
      state.bar = action.payload;  // immer makes this safe
    },
    resetFoo() {
      return initialState;  // full reset pattern
    },
  },
});

export const { setBar, resetFoo } = fooSlice.actions;
export const fooReducer = fooSlice.reducer;
```

### Rules

1. **Always use typed hooks:** `useAppDispatch()` and `useAppSelector()` from `@/store`, never raw `useDispatch`/`useSelector`.
2. **No thunks yet.** All async logic lives in hooks that call `dispatch()` synchronously. If you need thunks later, use `createAsyncThunk`.
3. **One selector per `useAppSelector` call.** Don't select the entire slice — select the smallest piece you need.
4. **Derived data uses `useMemo` in the component**, not a Redux selector (unless used in 3+ places, then use `selectors` in the slice).

### Current Slices

| Slice | File | Responsibility |
|---|---|---|
| `builder` | `store/builderSlice.ts` | Project identity: id, name, status, dimensions, save state |
| `artwork` | `store/artworkSlice.ts` | Sources, face assignments, busy/recrop state |
| `ui` | `store/uiSlice.ts` | Sections, modals, errors, guides, confirm dialog |

### Adding a New Slice

1. Create `store/fooSlice.ts`
2. Add the reducer to `store/index.ts` → `configureStore({ reducer: { ..., foo: fooReducer } })`
3. The `RootState` type updates automatically

---

## Hook Conventions

### Hook Template

```ts
"use client";

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";

/**
 * Manages <specific concern>.
 * All <concern> side effects and async logic live here.
 */
export function useFoo() {
  const dispatch = useAppDispatch();
  const bar = useAppSelector((s) => s.foo.bar);

  const doSomething = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const result = await apiCall();
      dispatch(setResult(result));
    } catch (error) {
      dispatch(setError(getErrorMessage(error)));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return { doSomething, bar };
}
```

### Rules

1. **One hook = one concern.** `useProjectPersistence` handles load/save. `useArtworkWorkspace` handles upload/crop.
2. **No hook calls another hook** (except `useAppDispatch`/`useAppSelector`). Composition happens in the shell component.
3. **Every async path dispatches an error action.** No silent failures.
4. **Return stable references** — wrap every returned function in `useCallback`.

### Current Hooks

| Hook | File | What It Does |
|---|---|---|
| `useProjectPersistence` | `hooks/useProjectPersistence.ts` | Load, save, patch, hydrate projects |
| `useArtworkWorkspace` | `hooks/useArtworkWorkspace.ts` | Upload, apply, clear artwork |
| `useDimensionSync` | `hooks/useDimensionSync.ts` | Debounced recrop on dimension change |
| `useShareLink` | `hooks/useShareLink.ts` | Publish + copy share URL |

---

## Next.js App Router Rules

### Page Files

```tsx
// app/page.tsx — ALWAYS this simple
import { BuilderShell } from "@/features/builder/BuilderShell";

export default function Home() {
  return <BuilderShell />;
}
```

### Dynamic Route Pages

```tsx
// app/project/[id]/edit/page.tsx
type PageProps = { params: Promise<{ id: string }> };

export default async function EditPage({ params }: PageProps) {
  const { id } = await params;
  return <BuilderShell projectId={id} />;
}
```

> **Critical:** In Next.js 16, `params` is a `Promise` — you must `await` it.

### API Routes

```tsx
// app/api/foo/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";  // ALWAYS specify for API routes

export async function GET(request: Request) {
  try {
    const result = await someService();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed." },
      { status: 400 },
    );
  }
}
```

### Dynamic Imports for Three.js

```tsx
// Three.js components MUST be dynamically imported with ssr: false
const CartonStage = dynamic(
  () => import("@/features/builder/CartonStage").then((mod) => mod.CartonStage),
  { ssr: false, loading: () => <div className="stage-loading">Loading</div> },
);
```

---

## CSS Conventions

- **No CSS Modules, no Tailwind, no CSS-in-JS.** Vanilla CSS in `app/globals.css`.
- **BEM-ish naming:** `.component-name`, `.component-name-element`, `.is-state`
- **Design tokens** are CSS custom properties on `:root`:

```css
:root {
  --paper: #f4f0e6;      /* page background */
  --surface: #fffdf7;    /* card/panel background */
  --ink: #1f2a24;         /* primary text */
  --muted: #6f7785;       /* secondary text */
  --accent: #2f7d6b;      /* brand green */
  --warm: #d94f30;         /* cut lines / danger */
  --line: #ded6c3;         /* borders */
}
```

- **State classes** use `is-` prefix: `.is-active`, `.is-collapsed`, `.is-filled`, `.is-selected`
- **Never use inline styles** except for dynamic positioning (dieline face layout uses `style={{ left, top, width, height }}`).

---

## Error Handling Pattern

```ts
// In utils/projectPayload.ts — always available
export function getErrorMessage(error: unknown, fallback = "An unknown error occurred."): string {
  return error instanceof Error ? error.message : fallback;
}

// In hooks — always dispatch errors to Redux
catch (error) {
  dispatch(setError(getErrorMessage(error, "Could not do X.")));
}
```

---

## Testing

- **Playwright** for visual smoke checks: `npm run verify:visual`
- **TypeScript compiler** for type safety: `npx tsc --noEmit`
- **ESLint** for code quality: `npm run lint`
- **Production build** as the ultimate check: `npm run build`

Always run `npm run lint` and `npm run build` after any change to verify correctness.
