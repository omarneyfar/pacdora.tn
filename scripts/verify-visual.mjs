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
  top: [255, 253, 247],
  bottom: [31, 42, 36]
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

    await page.goto(baseURL, { waitUntil: "networkidle" });
    await assertLayout(page, `home-${target.name}`);
    await assertCanvasPixels(page, `home-${target.name}`);

    await page.goto(`${baseURL}/view/${project.id}`, { waitUntil: "networkidle" });
    await assertLayout(page, `view-${target.name}`);
    await assertCanvasPixels(page, `view-${target.name}`);

    await context.close();
  }
} finally {
  await browser.close();
  await api.dispose();
}

console.log(`Visual verification passed for project ${project.id}`);

async function assertLayout(page, name) {
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
  await canvas.waitFor({ state: "visible", timeout: 10000 });
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
