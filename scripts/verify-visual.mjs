import { mkdir } from "fs/promises";
import path from "path";
import { chromium, request } from "@playwright/test";
import { PNG } from "pngjs";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), ".verification");
const background = { r: 246, g: 241, b: 230 };

await mkdir(outputDir, { recursive: true });

const api = await request.newContext({ baseURL });
const faceKeys = ["front", "back", "left", "right", "top", "bottom"];
const faceColors = {
  front: [217, 79, 48],
  back: [47, 125, 107],
  left: [224, 184, 79],
  right: [60, 86, 150],
  top: [126, 78, 173],
  bottom: [31, 42, 36]
};
const dielineSize = { width: 604, height: 372 };
const dielineFaceBounds = {
  back: { x: 70, y: 0, width: 232, height: 70 },
  left: { x: 0, y: 70, width: 70, height: 232 },
  top: { x: 70, y: 70, width: 232, height: 232 },
  right: { x: 302, y: 70, width: 70, height: 232 },
  front: { x: 70, y: 302, width: 232, height: 70 },
  bottom: { x: 372, y: 70, width: 232, height: 232 }
};
const projectResponse = await api.post("/api/projects", {
  data: {
    name: "Visual verification carton",
    status: "published",
    templateId: "folding-carton",
    dimensions: { width: 232, depth: 232, height: 70 },
    workspace: {
      sources: faceKeys.map((face) => ({
        dataUrl: createPngDataUrl(faceColors[face]),
        fileName: `${face}.png`,
        id: `visual-${face}`,
        mimeType: "image/png",
        sourceType: "image"
      })),
      selectedSourceId: "visual-front",
      faceAssets: Object.fromEntries(
        faceKeys.map((face) => [
          face,
          {
            crop: {
              coordinates: null,
              transforms: {
                flip: { horizontal: false, vertical: false },
                rotate: 0
              }
            },
            fileName: `${face}.png`,
            sourceId: `visual-${face}`,
            sourceType: "image"
          }
        ])
      )
    }
  }
});

if (!projectResponse.ok()) {
  throw new Error(`Could not create visual verification project: ${projectResponse.status()}`);
}

const project = await projectResponse.json();
const customDieline = await ensureCustomDieline(api);
const browser = await chromium.launch();

try {
  for (const target of [
    { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false },
    { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true }
  ]) {
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      hasTouch: target.isMobile,
      isMobile: target.isMobile,
      viewport: target.viewport
    });
    const page = await context.newPage();

    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await assertLayout(page, `home-${target.name}`);
    await assertCanvasPixels(page, `home-${target.name}`);

    await page.goto(`${baseURL}/project/${project.id}/edit`, { waitUntil: "domcontentloaded" });
    await assertLayout(page, `edit-${target.name}`);
    await assertDielinePixels(page, `edit-${target.name}`);
    await assertCanvasPixels(page, `edit-${target.name}`);

    await page.goto(`${baseURL}/?dielineId=${customDieline.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.body.innerText.includes("Custom dieline") || document.body.innerText.includes("Using:"), null, { timeout: 10000 });
    await assertLayout(page, `custom-dieline-${target.name}`);
    await assertCanvasPixels(page, `custom-dieline-${target.name}`);

    await page.goto(`${baseURL}/view/${project.id}`, { waitUntil: "domcontentloaded" });
    await assertLayout(page, `view-${target.name}`);
    await assertCanvasPixels(page, `view-${target.name}`);

    await context.close();
  }
} finally {
  await browser.close();
  await api.dispose();
}

console.log(`Visual verification passed for project ${project.id}`);

async function ensureCustomDieline(apiContext) {
  const listResponse = await apiContext.get("/api/dielines?limit=80&status=ready");

  if (listResponse.ok()) {
    const payload = await listResponse.json();
    const templates = payload.templates ?? [];
    const preferred = templates.find((template) =>
      /seed-(sleeve|ste|mailer|tray)/.test(template.id),
    );

    if (preferred) {
      return preferred;
    }

    if (templates[0]) {
      return templates[0];
    }
  }

  const createResponse = await apiContext.post("/api/dielines", {
    data: {
      name: "Visual verification custom tray",
      status: "ready",
      source: "svg-upload",
      fileName: "visual-verification-custom-tray",
      graph: createCustomTrayGraph()
    }
  });

  if (!createResponse.ok()) {
    throw new Error(`Could not create custom visual verification dieline: ${createResponse.status()}`);
  }

  return createResponse.json();
}

function createCustomTrayGraph() {
  const W = 180;
  const H = 120;
  const D = 42;
  const x0 = D;
  const x1 = x0 + W;
  const y0 = D;
  const y1 = y0 + H;
  const y2 = y1 + D;

  const faces = [
    face("base", "Base", x0, y0, W, H, "panel", true),
    face("wall-top", "Top wall", x0, 0, W, D, "panel", true),
    face("wall-bottom", "Bottom wall", x0, y1, W, D, "panel", true),
    face("wall-left", "Left wall", 0, y0, D, H, "panel", true),
    face("wall-right", "Right wall", x1, y0, D, H, "panel", true),
    face("lid-panel", "Lid panel", x0, y2, W, W, "panel", true)
  ];
  const creases = [
    crease("cr-base-top", "base", "wall-top", { x: x0, y: y0 }, { x: x1, y: y0 }),
    crease("cr-base-bottom", "base", "wall-bottom", { x: x0, y: y1 }, { x: x1, y: y1 }),
    crease("cr-base-left", "base", "wall-left", { x: x0, y: y0 }, { x: x0, y: y1 }),
    crease("cr-base-right", "base", "wall-right", { x: x1, y: y0 }, { x: x1, y: y1 }),
    crease("cr-bottom-lid", "wall-bottom", "lid-panel", { x: x0, y: y2 }, { x: x1, y: y2 })
  ];

  return {
    size: { width: W + D * 2, height: H + D * 2 + W },
    faces,
    creases,
    cutPaths: createExteriorCutPaths(faces),
    faceTree: [
      {
        faceId: "base",
        creaseId: null,
        children: [
          { faceId: "wall-top", creaseId: "cr-base-top", children: [] },
          {
            faceId: "wall-bottom",
            creaseId: "cr-base-bottom",
            children: [{ faceId: "lid-panel", creaseId: "cr-bottom-lid", children: [] }]
          },
          { faceId: "wall-left", creaseId: "cr-base-left", children: [] },
          { faceId: "wall-right", creaseId: "cr-base-right", children: [] }
        ]
      }
    ],
    source: { type: "svg-upload", fileName: "visual-verification-custom-tray" }
  };
}

function face(id, label, x, y, width, height, role, artworkEnabled) {
  const vertices = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];

  return {
    id,
    label,
    vertices,
    centroid: {
      x: x + width / 2,
      y: y + height / 2
    },
    bounds: { x, y, width, height },
    role,
    artworkEnabled
  };
}

function crease(id, faceA, faceB, edgeStart, edgeEnd) {
  return {
    id,
    faceA,
    faceB,
    edgeStart,
    edgeEnd,
    foldAngle: Math.PI / 2,
    direction: 1
  };
}

function createExteriorCutPaths(faces) {
  const edgeGroups = new Map();

  for (const currentFace of faces) {
    const vertices = currentFace.vertices;
    for (let index = 0; index < vertices.length; index += 1) {
      const start = vertices[index];
      const end = vertices[(index + 1) % vertices.length];
      const key = getEdgeKey(start, end);
      edgeGroups.set(key, [...(edgeGroups.get(key) ?? []), { start, end }]);
    }
  }

  return Array.from(edgeGroups.values())
    .filter((edges) => edges.length === 1)
    .map(([edge], index) => ({
      id: `cut-${index + 1}`,
      points: [edge.start, edge.end],
      d: `M ${edge.start.x} ${edge.start.y} L ${edge.end.x} ${edge.end.y}`
    }));
}

function getEdgeKey(start, end) {
  const a = `${start.x},${start.y}`;
  const b = `${end.x},${end.y}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

async function assertLayout(page, name) {
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 20000 });

  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canvasCount: document.querySelectorAll("canvas").length
  }));

  if (metrics.canvasCount < 1) {
    throw new Error(`${name}: no canvas rendered`);
  }

  if (metrics.scrollWidth > metrics.clientWidth + 2) {
    throw new Error(`${name}: horizontal overflow (${metrics.scrollWidth}px > ${metrics.clientWidth}px)`);
  }
}

async function assertCanvasPixels(page, name) {
  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 20000 });
  await page.waitForTimeout(900);

  const box = await canvas.boundingBox();
  if (!box || box.width < 240 || box.height < 260) {
    throw new Error(`${name}: canvas is too small or missing`);
  }

  const buffer = await canvas.screenshot({
    path: path.join(outputDir, `${name}-canvas.png`)
  });
  const png = PNG.sync.read(buffer);
  let changed = 0;

  for (let index = 0; index < png.data.length; index += 4) {
    const r = png.data[index];
    const g = png.data[index + 1];
    const b = png.data[index + 2];
    const a = png.data[index + 3];

    if (a > 0 && Math.abs(r - background.r) + Math.abs(g - background.g) + Math.abs(b - background.b) > 38) {
      changed += 1;
    }
  }

  const changedRatio = changed / (png.width * png.height);
  if (changedRatio < 0.015) {
    throw new Error(`${name}: canvas appears blank (${(changedRatio * 100).toFixed(2)}% changed pixels)`);
  }
}

async function assertDielinePixels(page, name) {
  const board = page.locator(".dieline-board").first();
  await board.waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(900);

  const box = await board.boundingBox();
  if (!box || box.width < 260 || box.height < 150) {
    throw new Error(`${name}: dieline board is too small or missing`);
  }

  const buffer = await board.screenshot({
    path: path.join(outputDir, `${name}-dieline.png`)
  });
  const png = PNG.sync.read(buffer);

  for (const face of faceKeys) {
    const matchRatio = getFaceColorMatchRatio(png, dielineFaceBounds[face], faceColors[face]);

    if (matchRatio < 0.08) {
      throw new Error(`${name}: ${face} artwork is missing from the flat dieline (${(matchRatio * 100).toFixed(1)}% matching pixels)`);
    }
  }
}

function createPngDataUrl([r, g, b]) {
  const png = new PNG({ width: 96, height: 128 });

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = (png.width * y + x) << 2;
      const stripe = Math.floor(x / 12) % 2 === 0 ? 24 : 0;
      png.data[index] = Math.min(255, r + stripe);
      png.data[index + 1] = Math.min(255, g + stripe);
      png.data[index + 2] = Math.min(255, b + stripe);
      png.data[index + 3] = 255;
    }
  }

  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

function getFaceColorMatchRatio(png, bounds, color) {
  const left = Math.max(0, Math.floor((bounds.x / dielineSize.width) * png.width));
  const top = Math.max(0, Math.floor((bounds.y / dielineSize.height) * png.height));
  const right = Math.min(png.width, Math.ceil(((bounds.x + bounds.width) / dielineSize.width) * png.width));
  const bottom = Math.min(png.height, Math.ceil(((bounds.y + bounds.height) / dielineSize.height) * png.height));
  let matching = 0;
  let total = 0;

  for (let y = top; y < bottom; y += 2) {
    for (let x = left; x < right; x += 2) {
      const index = (png.width * y + x) << 2;
      const pixel = [png.data[index], png.data[index + 1], png.data[index + 2]];

      total += 1;

      if (isCloseToStripedFaceColor(pixel, color)) {
        matching += 1;
      }
    }
  }

  return total > 0 ? matching / total : 0;
}

function isCloseToStripedFaceColor(pixel, color) {
  const stripedColor = color.map((channel) => Math.min(255, channel + 24));
  return colorDistance(pixel, color) < 80 || colorDistance(pixel, stripedColor) < 80;
}

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}
