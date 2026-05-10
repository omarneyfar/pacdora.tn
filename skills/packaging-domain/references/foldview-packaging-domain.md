# Skill: Packaging & Print House Domain Knowledge

> **Read this before making any decisions about box types, dieline structures, print workflows, or packaging business logic.**

---

## What Is a Dieline?

A **dieline** (also called a "die template", "cutting template", or "flat layout") is the 2D blueprint of a 3D packaging structure. It shows:

1. **Where to cut** — solid lines (red by convention) defining the outer boundary and any windows/holes
2. **Where to fold** — dashed/dotted lines (blue by convention) defining crease points
3. **Where artwork extends** — bleed zones (3mm beyond the cut line)
4. **Where text is safe** — safe zones (5mm inside the cut line)
5. **The structural elements** — flaps, tabs, locks, tuck closures that hold the box together

When a printing house receives a dieline, they:
- Print artwork on a flat sheet (cardboard, corrugated, paperboard)
- Die-cut the sheet using a metal die shaped to the cut lines
- Score (crease) the fold lines
- Fold and glue the structure into the final 3D box

---

## Anatomy of a Folding Carton

### The 6 Main Panels

| Panel | Also Called | Typical Use |
|---|---|---|
| **Front** | Display panel | Main branding, product name, hero image |
| **Back** | Information panel | Ingredients, barcodes, regulatory info |
| **Left side** | Side panel | Nutrition facts, secondary branding |
| **Right side** | Side panel | Usage instructions, certifications |
| **Top** | Lid / Opening panel | Often the first thing the customer sees |
| **Bottom** | Base panel | Batch codes, recycling symbols, weight |

### Structural Flaps (Not Artwork Panels)

| Flap | Purpose | Typical Size |
|---|---|---|
| **Tuck flap (top)** | Inserts into the box to close the top opening | ~75–80% of box depth |
| **Tuck flap (bottom)** | Same, for the bottom | ~75–80% of box depth |
| **Dust flaps** | Small side tabs that fold in before the tuck flap closes | ~75% of side height |
| **Glue tab** | Narrow strip glued to the opposite side panel during assembly | 12–20mm wide |

### Industry Standard Proportions

These ratios are not arbitrary — they come from decades of manufacturing practice:

```
Tuck flap depth   = box_depth × 0.75 to 0.80
Dust flap width   = side_height × 0.70 to 0.80
Dust flap height  = tuck_depth × 0.80 to 0.90
Glue tab width    = min(side_height × 0.55, 20mm)
Tuck curve radius = min(box_width × 0.12, 25mm)
```

---

## Common Box Types (Template Library)

### Folding Cartons (Most Common — 80% of Retail Packaging)

| Type | FEFCO Code | Key Feature | Common Use |
|---|---|---|---|
| **Straight Tuck End (STE)** | 0211 | Both tuck flaps on the same side | Cereal, tea, pharmaceuticals |
| **Reverse Tuck End (RTE)** | 0210 | Top tuck on front, bottom tuck on back | Cosmetics, electronics |
| **Auto-Lock Bottom** | ECMA A20.20 | Bottom panel self-locks when folded | Premium retail, requires no glue for bottom |
| **Seal End** | 0215 | Both ends glued shut (no tuck flaps) | Food, pre-packed products |
| **Snap Lock Bottom** | — | Tab-and-slot bottom closure | Heavy products |

### Pizza / Food Service Boxes

| Type | FEFCO Code | Key Feature | Common Use |
|---|---|---|---|
| **Pizza Box** | 0426/0427 | Single-piece with hinged lid, front lock tab | Pizza, pastry |
| **Four Corner Tray** | 0471 | Open-top tray with folded corners | Baked goods, deli |
| **Gable Top** | — | Peaked top with carry handle | Milk, juice |

### E-Commerce / Mailer Boxes

| Type | Key Feature | Common Use |
|---|---|---|
| **Mailer Box** | Self-locking with full-flap lid | Subscription boxes, DTC brands |
| **Corrugated Shipper** | Double-wall, no print | Shipping protection |
| **Drawer Box** | Inner tray slides into outer sleeve | Premium unboxing (Apple-style) |

### Specialty Shapes

| Type | Key Feature | Common Use |
|---|---|---|
| **Pillow Box** | Curved top and bottom closures | Gift packaging, small items |
| **Hexagonal Box** | Six-sided cross section | Candles, premium gifts |
| **Window Box** | Die-cut window with acetate film | Product visibility |
| **Display Box** | Open-front counter display | POS retail |

---

## The FEFCO/ECMA Standard

**FEFCO** (European Federation of Corrugated Board Manufacturers) and **ECMA** (European Carton Makers Association) maintain standardized codes for packaging structures:

- **FEFCO 0200 series** — Slotted-type boxes (folding cartons)
- **FEFCO 0400 series** — Folder-type boxes (pizza, wrap-around)
- **FEFCO 0700 series** — Ready-glued cases
- **ECMA A-series** — Folding carton designs

These codes are the **universal language** of the packaging industry. When a printing house says "I need a 0211", they mean a Straight Tuck End box. FoldView should eventually support selecting by FEFCO/ECMA code.

---

## Print Production Terminology

| Term | Meaning | FoldView Context |
|---|---|---|
| **Bleed** | Artwork extending 3mm beyond the cut line to avoid white edges after trimming | `PRINT_GUIDE_OFFSETS.bleed = 3` |
| **Safe area / Safety margin** | Content kept 5mm inside the cut line to avoid trimming into text | `PRINT_GUIDE_OFFSETS.safe = 5` |
| **Die** | A custom-shaped metal blade used to cut the cardboard | The cut path IS the die shape |
| **Score / Crease** | A pressed line in the cardboard that enables clean folding | Fold lines in the dieline |
| **Caliper** | Thickness of the paperboard (e.g., 0.3mm, 0.5mm) | Affects 3D model — panels don't perfectly meet |
| **GSM** | Grams per square meter — paper weight | Higher GSM = stiffer folds |
| **Substrate** | The material being printed on (cardboard, kraft, coated) | Affects 3D material appearance |
| **Gang run** | Printing multiple dielines on one large sheet for efficiency | Future feature: nesting optimizer |
| **Registration marks** | Cross-hair marks for aligning print plates | Needed in SVG export |
| **Spot color** | A specific ink (Pantone) vs. CMYK process color | Relevant for export accuracy |
| **Varnish / Coating** | Matte, gloss, or spot UV finish applied after printing | Future 3D material simulation |

---

## The Printing House Workflow (Manual → FoldView)

### Current Manual Process

```
1. Client provides rough dimensions and artwork files (PDF/AI)
2. Structural designer creates dieline in ArtiosCAD / CAPE / Illustrator
3. Graphic designer places artwork onto the dieline in Illustrator
4. Structural proof is printed and manually folded for client approval
5. Client requests dimension changes → steps 2-4 repeat
6. Final files are sent to pre-press for plate making
7. Die is manufactured from the dieline
8. Production run: print → die-cut → fold → glue → ship
```

**Pain points:**
- Steps 2-4 take 2-5 days per iteration
- Client can't visualize the 3D result until a physical proof is folded
- Every dimension change requires the structural designer to rebuild the dieline
- Communication errors between client ↔ designer ↔ printer cause reprints

### FoldView's Goal: One-Click Workflow

```
1. Client opens FoldView
2. Selects a box type (or uploads their own dieline SVG)
3. Enters dimensions → dieline auto-generates
4. Uploads artwork → sees it mapped onto the 3D box instantly
5. Adjusts crop, rotation, position per face
6. Publishes a share link → client approves remotely
7. Exports production-ready dieline SVG/PDF with guides
```

**Value proposition:**
- Steps 2-5 happen in **minutes**, not days
- The client sees the **3D result immediately** — no physical proof needed
- Dimension changes regenerate everything **instantly**
- The exported dieline is **production-ready** with proper cut/fold/bleed layers

---

## Business Rules for FoldView

### Dimension Constraints

```
All dimensions are in millimeters.
Minimum: 20mm (smaller is impractical for folding carton)
Maximum: 600mm (larger requires corrugated, different die-cutting)
Width, depth, height must all be positive integers.
```

### Artwork Constraints

```
Accepted formats: PNG, JPG, PDF
PDF: first page only, rasterized at up to 1400px on the long edge
Max file size: 12MB per source image
Artwork is always cropped to the target face's aspect ratio
```

### Project Lifecycle

```
New project → "draft" status
Draft → save → still "draft"
Draft → publish → "published" (generates share URL)
Published → edit → reverts to "draft" (share URL cleared)
Published → view at /view/:id → read-only 3D preview (no login required)
```

### Face Assignment Rules

```
Each face can have at most one artwork image at a time.
Artwork is assigned with a crop + transform (rotate, flip).
When dimensions change, all assigned faces are re-cropped
  with the same crop settings against the new face proportions.
  (This is the "dimension sync" — debounced at 300ms.)
```

---

## Future Domain Features

### Planned (High Priority)

| Feature | Business Value |
|---|---|
| **SVG dieline import** | Printing houses bring their own die templates — supports any box shape |
| **Template library** (10-15 types) | Quick start for common packaging — no SVG upload needed |
| **Dieline export** (SVG/PDF) | Production-ready output with named layers (Cut, Fold, Bleed, Safe) |
| **Auto-save / draft persistence** | Prevents work loss during browser crashes |

### Planned (Medium Priority)

| Feature | Business Value |
|---|---|
| **Paper thickness simulation** | Realistic 3D model with material caliper offset |
| **Multiple dielines per project** | Inner liner + outer sleeve + wrap band |
| **Project thumbnails** | Visual recognition in the dashboard |
| **Cost calculator** | Compute material area from the dieline graph |

### Future Vision

| Feature | Business Value |
|---|---|
| **Dieline marketplace** | Printing houses share/sell their templates |
| **AI dieline generation** | Describe a box in words → generate the structure |
| **Nesting optimizer** | Arrange multiple dielines on a sheet for minimal waste |
| **Fold animation** | Client sees the box being assembled step-by-step |
| **Material simulation** | Kraft, coated, metallic, spot UV on the 3D model |
| **Barcode / QR placement** | Auto-position regulatory elements on designated panels |
