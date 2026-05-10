# Skill: 3D Modeling, Three.js & Geometry Mathematics

> **Read this before writing any Three.js code, geometry calculations, or dieline math in this project.**

---

## Three.js Stack in This Project

| Package | Version | Purpose |
|---|---|---|
| `three` | 0.184 | Core 3D engine |
| `@react-three/fiber` | — | React renderer for Three.js |
| `@react-three/drei` | — | Helper components (OrbitControls, Environment, ContactShadows, etc.) |

### Import Rules

```tsx
// ✅ Import Three.js types and classes from "three"
import { DoubleSide, SRGBColorSpace, Vector3, type Texture } from "three";

// ✅ Import R3F hooks from @react-three/fiber
import { Canvas, useThree, useFrame } from "@react-three/fiber";

// ✅ Import helper components from @react-three/drei
import { OrbitControls, Environment, ContactShadows, Line, Edges, useTexture } from "@react-three/drei";

// ❌ NEVER import from three/examples or three/addons directly
// ❌ NEVER use raw document.createElement("canvas") for Three.js — use R3F's <Canvas>
```

---

## Coordinate Systems

### Three.js (3D World)

```
        +Y (up)
         │
         │
         │
         └────── +X (right)
        /
       /
      +Z (toward camera)
```

- **Y is up.** The box sits on the XZ plane.
- **Units are normalized.** A 232mm box becomes ~3.35 Three.js units. The `unit` conversion factor is: `3.35 / max(width, height, depth)`.
- **Center is origin.** The box is centered at (0, 0, 0).

### SVG / Dieline (2D Flat)

```
    (0,0) ────── +X (right)
      │
      │
      +Y (down)
```

- **Y is down** (standard SVG). When converting dieline coordinates to Three.js, flip Y.
- **Units are millimeters.** Everything in `domain/packaging/` uses real mm values.

### Conversion: MM → Three.js Units

```typescript
const unit = 3.35 / Math.max(width, height, depth);
const threeWidth = mmWidth * unit;
```

---

## The Geometry Engine — `domain/packaging/index.ts`

This is a **pure TypeScript module with zero React dependencies.** It computes all spatial data from `{ width, depth, height }` in millimeters.

### Key Functions

| Function | Input | Output | Used By |
|---|---|---|---|
| `getFaceSpecs(dims)` | CartonDimensions | Position/size of each face on the flat dieline (mm) | DielineUploader |
| `getDielinePrintGuides(dims)` | CartonDimensions | Cut/fold segments, bleed/safe rectangles, labels | DielineGuideOverlay |
| `getDielineSpec(dims)` | CartonDimensions | Combined: size + faces + guides | Panel components |
| `getModelSpec(dims)` | CartonDimensions | 3D positions, rotations, sizes for all 6 faces | CartonStage |
| `getBoxGuideEdges(w,h,d)` | Three.js units | 12 edges of the box wireframe | CartonGuideOverlay |

### The Dieline Layout

The flat dieline arranges 6 faces in a **cross pattern**:

```
Dieline coordinate system (mm):

         (H,0)
         ┌──────────┐
         │   Back    │ (W × H)
(0,H)    │           │
┌────────┼──────────┼────────┬──────────┐
│  Left  │   Top    │  Right │  Bottom  │ (all H high = depth D)
│(H × D) │  (W × D) │(H × D) │ (W × D)  │
└────────┼──────────┼────────┴──────────┘
(0,H+D)  │  Front   │
         │  (W × H) │
         └──────────┘
         (H,H+D+H)

Total size: (2W + 2H) × (D + 2H)
```

### The 3D Model

Each face is a `<mesh>` with a `<planeGeometry>`:

```
Face positions (Three.js units, center = origin):

front:  [0, 0, +depth/2]     rotation: [0, 0, 0]
back:   [0, 0, -depth/2]     rotation: [0, π, 0]
left:   [-width/2, 0, 0]     rotation: [0, -π/2, 0]
right:  [+width/2, 0, 0]     rotation: [0, +π/2, 0]
top:    [0, +height/2, 0]    rotation: [-π/2, 0, 0]
bottom: [0, -height/2, 0]    rotation: [+π/2, 0, 0]
```

The `lift` offset (0.004 units) prevents Z-fighting between face planes and the wireframe box.

---

## CartonStage.tsx — Component Architecture

```
<Canvas>
  <ambientLight>
  <directionalLight> × 2
  <Suspense>
    <CartonModel>                    ← group with all faces + guides
      <FacePlane> × 6               ← mesh + planeGeometry + material
      <mesh> (wireframe box)        ← boxGeometry + Edges
      <CartonGuideOverlay>          ← optional, toggled by user
        <BoxFoldGuides>             ← blue edge lines
        <GuideFace> × 6             ← cut rect + safe rect per face
    <Environment preset="city">
  <ContactShadows>
  <CameraControls>                   ← OrbitControls + zoom sync
</Canvas>
```

### Key Implementation Details

1. **CartonStage is dynamically imported** with `ssr: false` because Three.js needs the browser's WebGL context.

2. **Textures use SRGBColorSpace** and `toneMapped={false}` to display artwork colors accurately:
   ```tsx
   const preparedTexture = texture.clone();
   preparedTexture.colorSpace = SRGBColorSpace;
   preparedTexture.anisotropy = 8;
   ```

3. **Camera controls** use OrbitControls with:
   - Pan disabled (`enablePan={false}`)
   - Max polar angle capped at 0.82π (can't look from directly below)
   - Zoom synced to a percentage readout via distance calculation

4. **Zoom math:**
   ```typescript
   // Zoom percentage ↔ camera distance
   distance = DEFAULT_DISTANCE * (100 / zoomPercent)
   zoomPercent = (DEFAULT_DISTANCE / distance) * 100
   ```

---

## Memoization Rules for 3D Code

### ALWAYS memoize geometry computations

```tsx
// ✅ Correct — getDielineSpec is expensive, only recompute when dimensions change
const dielineSpec = useMemo(
  () => getPackagingTemplate().getDielineSpec(dimensions),
  [dimensions],
);

// ✅ Correct — modelSpec is expensive
const modelSpec = useMemo(
  () => getPackagingTemplate().getModelSpec(safeDimensions),
  [safeDimensions],
);
```

### ALWAYS dispose textures on unmount

```tsx
useEffect(() => {
  return () => preparedTexture.dispose();
}, [preparedTexture]);
```

### NEVER create Three.js objects inside render

```tsx
// ❌ Wrong — creates a new Vector3 every render
<OrbitControls target={new Vector3(0, 0, 0)} />

// ✅ Correct — hoist to module scope
const CAMERA_TARGET = new Vector3(0, 0.03, 0);
```

---

## Print Guide System

The print guide system uses 4 visual layers:

| Guide | Color | Style | Purpose |
|---|---|---|---|
| **Cut** | Red (`#d94f30`) | Solid, 1.4px | Where to physically cut the sheet |
| **Fold** | Blue (`#1677ff`) | Dashed `8 5`, 1.45px | Where to fold/crease |
| **Bleed** | Green (`#2f8a53`) | Dotted `2 4`, 1.1px | Artwork must extend this far beyond the cut |
| **Safe** | Gray (`#7c8790`) | Solid, 0.95px | Keep critical content inside this boundary |

### Edge Classification Logic

The engine determines cut vs fold by counting how many faces share an edge:
- **1 face** → exterior edge → **cut line**
- **2 faces** → shared edge → **fold line**

```typescript
// This is the core algorithm in getDielinePrintGuides()
for (const edge of getSpecEdges(spec)) {
  const key = getSegmentKey(edge);
  const existing = edgeMap.get(key);
  if (existing) {
    existing.kind = "fold";  // shared edge = fold
  } else {
    edgeMap.set(key, { ...edge, count: 1 });  // new edge = cut (initially)
  }
}
```

### Responsive Guide Offsets

Bleed and safe margins scale down for small faces to prevent visual overlap:

```typescript
function getResponsiveGuideOffset(offset: number, width: number, height: number): number {
  return Math.min(offset, Math.max(1, Math.floor(Math.min(width, height) / 5)));
}
```

---

## Future: DielineGraph → 3D Folding

When the SVG import system is built, the folding algorithm uses a **face tree** (parent-child hierarchy):

```
Root face (bottom)
├── front   → folds +90° along shared crease
│   └── topTuck → folds ~100° along front's top edge
├── back    → folds -90° along shared crease
├── left    → folds +90° along shared crease
└── right   → folds -90° along shared crease
    └── glueTab → folds +90°
```

Each child is placed in a `<group>` whose origin sits on the crease edge (the pivot point). Rotating the group folds the face along that crease. This is recursive — children of children fold relative to their parent.

### Custom BufferGeometry for Non-Rectangular Faces

For curved tuck flaps or hexagonal faces, use `ShapeGeometry`:

```typescript
const shape = new THREE.Shape();
face.vertices.forEach((v, i) => {
  if (i === 0) shape.moveTo(v.x, v.y);
  else shape.lineTo(v.x, v.y);
});
// For curves: shape.quadraticCurveTo(cpx, cpy, x, y);
const geometry = new THREE.ShapeGeometry(shape);
```

For triangulation of complex polygons, use the `earcut` library.

---

## Dimension Limits

```typescript
export const DIMENSION_LIMITS = { min: 20, max: 600 };  // mm
```

All dimension inputs are clamped to this range. Never allow 0, negative, or NaN dimensions — the geometry engine will produce degenerate faces.
