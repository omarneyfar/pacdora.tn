# Skill: SVG Parsing & Computational Geometry for Dieline Import

> **Read this before implementing the SVG dieline importer, face detection algorithm, or any 2D computational geometry code.**

---

## The Core Problem

A dieline SVG file contains a set of **lines, curves, and paths.** These lines form the boundary of panels (faces) and indicate where to fold. The challenge is:

1. **Parse** the SVG into structured line segments
2. **Detect faces** — find all closed polygon regions formed by the lines
3. **Classify edges** — determine which are cuts (exterior) and which are folds (shared between two faces)
4. **Build a fold tree** — determine which face is the "root" and how all other faces connect via creases

This is a **planar subdivision problem** from computational geometry.

---

## SVG File Structure for Dielines

### The Convention: Two Layers

Professional dieline SVGs follow this structure:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <!-- Structural lines -->
  <g id="CUTS" inkscape:label="CUTS">
    <path d="M 10 10 L 390 10 L 390 590 L 10 590 Z" />
    <!-- ... more cut paths -->
  </g>
  <g id="CREASES" inkscape:label="CREASES">
    <line x1="100" y1="10" x2="100" y2="590" />
    <!-- ... more fold lines -->
  </g>
</svg>
```

### Detection Strategy (Fallback Chain)

Not all SVGs follow the convention. Detect layers using this priority:

```
1. Named groups:      <g id="CUTS">     / <g id="CREASES">
2. Inkscape labels:   <g inkscape:label="CUTS">
3. Illustrator layers: <g data-name="CUTS">
4. Stroke color:       red (#ff0000, #d94f30) = cuts, blue (#0000ff, #1677ff) = creases
5. Stroke style:       solid = cuts, dashed (stroke-dasharray) = creases
6. Single layer:       all paths → classify by topology (exterior = cut, shared = crease)
```

### SVG Elements to Handle

| SVG Element | How to Process |
|---|---|
| `<line>` | Direct: (x1,y1) → (x2,y2) |
| `<rect>` | Convert to 4 line segments |
| `<polyline>` / `<polygon>` | Convert points to line segments |
| `<path>` | Parse `d` attribute, flatten curves to segments |
| `<circle>` / `<ellipse>` | Approximate as polygon (32+ segments) |
| `<g>` with `transform` | Apply transform matrix to all children |

---

## SVG Path `d` Attribute Parsing

The most complex part is parsing `<path d="...">`. Commands:

| Command | Meaning | Parameters |
|---|---|---|
| `M x y` | Move to (start new subpath) | absolute coords |
| `m dx dy` | Move to (relative) | offset from current |
| `L x y` | Line to | absolute endpoint |
| `l dx dy` | Line to (relative) | offset |
| `H x` | Horizontal line to | absolute x |
| `h dx` | Horizontal line (relative) | offset |
| `V y` | Vertical line to | absolute y |
| `v dy` | Vertical line (relative) | offset |
| `Q cx cy x y` | Quadratic Bézier curve | control point + endpoint |
| `C c1x c1y c2x c2y x y` | Cubic Bézier curve | 2 control points + endpoint |
| `A rx ry rot large-arc sweep x y` | Elliptical arc | complex parameters |
| `Z` / `z` | Close path | line back to last M |

### Flattening Curves to Line Segments

Curves must be approximated as a sequence of straight line segments for the graph algorithm:

```typescript
function flattenQuadraticBezier(
  p0: Point, // start
  cp: Point, // control point
  p1: Point, // end
  segments: number = 16
): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    points.push({
      x: u * u * p0.x + 2 * u * t * cp.x + t * t * p1.x,
      y: u * u * p0.y + 2 * u * t * cp.y + t * t * p1.y,
    });
  }
  return points;
}

function flattenCubicBezier(
  p0: Point, cp1: Point, cp2: Point, p1: Point,
  segments: number = 16
): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    points.push({
      x: u*u*u * p0.x + 3*u*u*t * cp1.x + 3*u*t*t * cp2.x + t*t*t * p1.x,
      y: u*u*u * p0.y + 3*u*u*t * cp1.y + 3*u*t*t * cp2.y + t*t*t * p1.y,
    });
  }
  return points;
}
```

> **Keep the original path `d` string** for rendering curved cut lines in the SVG. The flattened segments are only for the graph algorithm.

---

## The Planar Graph Algorithm

### Step 1: Build the Graph

```typescript
type GraphNode = {
  id: string;           // "x,y" rounded to epsilon
  x: number;
  y: number;
  edges: GraphEdge[];   // sorted by angle
};

type GraphEdge = {
  from: string;         // node ID
  to: string;           // node ID
  type: "cut" | "crease";
  originalPathD?: string; // preserved for curved rendering
};
```

**Node snapping:** Two endpoints within ε = 0.5mm are the same node.

```typescript
function snapToGrid(value: number, epsilon: number = 0.5): number {
  return Math.round(value / epsilon) * epsilon;
}
```

### Step 2: Find Intersections

If any cut line crosses a crease line (or vice versa), split both edges at the intersection point. This ensures the graph is a proper **planar subdivision**.

```typescript
// Line-line intersection
function lineIntersection(
  a1: Point, a2: Point,
  b1: Point, b2: Point
): Point | null {
  const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
  const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  
  if (Math.abs(denom) < 1e-10) return null; // parallel
  
  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
  const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
  
  if (t < 0 || t > 1 || u < 0 || u > 1) return null; // outside segments
  
  return {
    x: a1.x + t * dx1,
    y: a1.y + t * dy1,
  };
}
```

### Step 3: Sort Edges by Angle at Each Node

At every node, sort outgoing edges by the angle they make from the positive X-axis. This is critical for the cycle-detection algorithm.

```typescript
function edgeAngle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// At each node, sort edges counterclockwise
node.edges.sort((a, b) => {
  const angleA = edgeAngle(node, getNode(a.to));
  const angleB = edgeAngle(node, getNode(b.to));
  return angleA - angleB;
});
```

### Step 4: Minimum Cycle Detection (Face Finding)

This is the **core algorithm.** It finds all minimal faces of the planar graph.

**Concept:** For each directed edge (u → v), find the "next" edge by turning **left** (the smallest counterclockwise angle from the incoming direction). Follow the chain until you return to the start. Each unique chain is one minimal face.

```typescript
function findAllFaces(graph: PlanarGraph): Polygon[] {
  const visited = new Set<string>(); // "fromId→toId"
  const faces: Polygon[] = [];

  for (const node of graph.nodes.values()) {
    for (const edge of node.edges) {
      const dirKey = `${edge.from}→${edge.to}`;
      if (visited.has(dirKey)) continue;

      // Walk the cycle
      const cycle: Point[] = [];
      let current = edge;
      
      do {
        const key = `${current.from}→${current.to}`;
        if (visited.has(key)) break;
        visited.add(key);

        const toNode = graph.nodes.get(current.to)!;
        cycle.push({ x: toNode.x, y: toNode.y });

        // Find the "next left turn" edge at toNode
        const incomingAngle = edgeAngle(toNode, graph.nodes.get(current.from)!);
        current = findNextEdgeCCW(toNode, incomingAngle);
      } while (current.to !== edge.from);

      if (cycle.length >= 3) {
        faces.push(cycle);
      }
    }
  }

  // Remove the outermost face (largest area, wrong winding order)
  return faces
    .filter(face => polygonArea(face) > 0)  // keep only inner faces (CCW)
    .sort((a, b) => Math.abs(polygonArea(b)) - Math.abs(polygonArea(a)));
}

function findNextEdgeCCW(node: GraphNode, incomingAngle: number): GraphEdge {
  // Find the edge with the smallest CCW angle from the incoming direction
  // This is the "turn left as much as possible" rule
  const edges = node.edges;
  let bestIdx = 0;
  let bestAngle = Infinity;

  for (let i = 0; i < edges.length; i++) {
    const outAngle = edgeAngle(node, getNode(edges[i].to));
    let diff = outAngle - incomingAngle;
    if (diff <= 0) diff += 2 * Math.PI;
    if (diff < bestAngle) {
      bestAngle = diff;
      bestIdx = i;
    }
  }

  return edges[bestIdx];
}
```

### Step 5: Classify Edges

After finding all faces, classify each edge:

```typescript
function classifyEdges(faces: Polygon[], edges: GraphEdge[]): void {
  for (const edge of edges) {
    const adjacentFaces = faces.filter(face => faceContainsEdge(face, edge));
    
    if (adjacentFaces.length === 2) {
      edge.type = "crease";  // shared by 2 faces → fold line
    } else {
      edge.type = "cut";     // on the boundary → cut line
    }
  }
}
```

### Step 6: Build the Face Tree

Starting from the **largest face** (or user-selected root), BFS through adjacent faces via crease edges:

```typescript
function buildFaceTree(faces: DielineFace[], creases: DielineCrease[]): DielineFaceNode[] {
  const root = faces.reduce((a, b) => 
    polygonArea(a.vertices) > polygonArea(b.vertices) ? a : b
  );
  
  const visited = new Set<string>();
  const queue: DielineFaceNode[] = [];
  
  visited.add(root.id);
  const rootNode: DielineFaceNode = { faceId: root.id, creaseId: null, children: [] };
  queue.push(rootNode);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const adjacentCreases = creases.filter(c => 
      (c.faceA === current.faceId || c.faceB === current.faceId) &&
      !visited.has(c.faceA === current.faceId ? c.faceB : c.faceA)
    );
    
    for (const crease of adjacentCreases) {
      const childFaceId = crease.faceA === current.faceId ? crease.faceB : crease.faceA;
      visited.add(childFaceId);
      const childNode: DielineFaceNode = { faceId: childFaceId, creaseId: crease.id, children: [] };
      current.children.push(childNode);
      queue.push(childNode);
    }
  }
  
  return [rootNode];
}
```

---

## Polygon Utilities

```typescript
/** Signed area — positive = CCW, negative = CW */
function polygonArea(vertices: Point[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return area / 2;
}

/** Centroid of a polygon */
function polygonCentroid(vertices: Point[]): Point {
  let cx = 0, cy = 0;
  for (const v of vertices) { cx += v.x; cy += v.y; }
  return { x: cx / vertices.length, y: cy / vertices.length };
}

/** Bounding box of a polygon */
function polygonBounds(vertices: Point[]): { x: number; y: number; width: number; height: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
```

---

## Common Pitfalls

### 1. Floating-Point Precision

SVG coordinates are floats. Two points that should be the same may differ by 0.0001. **Always snap to a grid** when building the graph.

### 2. SVG Transform Stacking

SVG elements can have nested transforms: `translate`, `rotate`, `scale`, `matrix`. You must **flatten all transforms** before extracting coordinates.

```typescript
function flattenTransform(element: SVGElement): DOMMatrix {
  const transforms: DOMMatrix[] = [];
  let current: SVGElement | null = element;
  
  while (current && current.tagName !== "svg") {
    const transform = current.getAttribute("transform");
    if (transform) transforms.unshift(parseTransform(transform));
    current = current.parentElement as SVGElement | null;
  }
  
  return transforms.reduce((acc, t) => acc.multiply(t), new DOMMatrix());
}
```

### 3. Duplicate / Overlapping Edges

Some SVGs draw the same edge twice (once in CUTS, once as part of a face rect). Deduplicate edges by their snapped endpoint pairs.

### 4. Degenerate Faces

The algorithm may detect very tiny faces from imprecise SVG paths. Filter out faces with area < 1mm².

### 5. SVG Coordinate Direction

SVG Y-axis points **down**. When computing polygon winding (CW vs CCW), account for this — the "positive area = CCW" convention is inverted.

---

## Libraries to Consider

| Library | Purpose | When to Use |
|---|---|---|
| `svg-path-parser` | Parse `d` attributes to command arrays | Phase 2 (SVG import) |
| `flatten-js` | Full 2D geometry: intersections, polygon ops, DCEL | If manual algorithm is too error-prone |
| `earcut` | Triangulate polygons for Three.js meshes | Phase 5 (3D model from DielineGraph) |
| Three.js `SVGLoader` | Parse SVG into Three.js Shape objects | Alternative import path for 3D-first approach |

> **Recommendation:** Start with a manual implementation (~200 lines). Only bring in `flatten-js` if edge cases become unmanageable.

---

## Testing Strategy

### Unit Tests for the Graph Algorithm

```
Test 1: Simple box (4 rectangles in a cross) → should detect 4 faces
Test 2: Box with tuck flaps → should detect 6+ faces
Test 3: Box with curved tuck → should detect the tuck as a face with curved boundary
Test 4: Hexagonal box → should detect 6 triangular/trapezoidal faces
Test 5: Overlapping edges → should deduplicate correctly
Test 6: Missing intersection → should split edges and still find faces
```

### Integration Test

Upload the user's actual dieline SVG → verify it produces the expected number of faces → verify the face tree hierarchy is correct → verify the 3D model folds correctly.
