import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const moduleCache = new Map();
const fixtureDir = path.join(projectRoot, "fixtures", "references", "reverse-tuck-end", "120x60x160");
const outputDir = path.join(projectRoot, "scripts", "output", "component-engine");
const generatedSvgPath = path.join(outputDir, "reverse-tuck-end-v2-120x60x160.generated.svg");
const debugSvgPath = path.join(outputDir, "reverse-tuck-end-v2-120x60x160.debug.svg");
const reportPath = path.join(fixtureDir, "comparison-report.md");

const { generateFromRecipe } = loadTs(path.join(projectRoot, "domain", "dieline", "componentEngine"));
const { graphToSvg } = loadTs(path.join(projectRoot, "domain", "dieline", "canonicalGeometry"));
const { parseReferenceGeometry, compareGraphToReference } = loadTs(path.join(projectRoot, "domain", "dieline", "reference"));
const recipe = loadJson(path.join(projectRoot, "domain", "dieline", "recipes", "foldingBox", "reverseTuckEnd.v2.json"));

fs.mkdirSync(fixtureDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const graph = generateFromRecipe(recipe, { L: 120, W: 60, H: 160 });
fs.writeFileSync(generatedSvgPath, graphToSvg(graph), "utf8");

const referenceFile = findReferenceFile(fixtureDir);
const report = referenceFile
  ? buildComparisonReport(referenceFile, graph)
  : buildMissingReferenceReport();

fs.writeFileSync(reportPath, report, "utf8");
console.log(`RTE v2 comparison report written to ${path.relative(projectRoot, reportPath)}`);

function buildComparisonReport(referenceFile, graph) {
  const relativeReference = path.relative(projectRoot, referenceFile);
  const ext = path.extname(referenceFile).toLowerCase();
  const generatedRelative = path.relative(projectRoot, generatedSvgPath);
  const debugRelative = path.relative(projectRoot, debugSvgPath);

  if (ext === ".svg" || ext === ".dxf") {
    const reference = parseReferenceGeometry(fs.readFileSync(referenceFile, "utf8"), referenceFile);
    const comparison = compareGraphToReference(graph, reference);
    const status = comparison.ok ? "automated-geometry-pass" : "automated-geometry-needs-review";

    return [
      "# RTE V2 Reference Comparison",
      "",
      `Generated: \`${generatedRelative}\``,
      `Debug: \`${debugRelative}\``,
      `Reference: \`${relativeReference}\``,
      `Status: ${status}`,
      "",
      "## Automated Geometry Comparison",
      "",
      comparison.ok
        ? "- Bounds/layer-count comparison passed within the current parser tolerance."
        : comparison.messages.map((message) => `- ${message}`).join("\n"),
      "",
      "## Manual Closure Review",
      "",
      "| Area | Generated V2 | Reference | Decision |",
      "| --- | --- | --- | --- |",
      "| Tuck flaps | | | |",
      "| Dust flaps | | | |",
      "| Glue tab | | | |",
      "| Score lines | | | |",
      "| Cut outline | | | |",
      "",
      "## Verification Decision",
      "",
      comparison.ok
        ? "- Automated geometry comparison passed. Manual closure review is still required before changing `verificationStatus` to `visual-compared`."
        : "- Keep `verificationStatus` as `geometry-needs-verification` until differences are resolved.",
      "- Keep `productionReady: false`.",
      "",
    ].join("\n");
  }

  return [
    "# RTE V2 Reference Comparison",
    "",
    `Generated: \`${generatedRelative}\``,
    `Debug: \`${debugRelative}\``,
    `Reference: \`${relativeReference}\``,
    "Status: manual-visual-review-required",
    "",
    "The current automated parser can compare SVG/DXF geometry. PDF/PNG references require manual visual overlay/review.",
    "",
    "## Manual Closure Review",
    "",
    "| Area | Generated V2 | Reference | Decision |",
    "| --- | --- | --- | --- |",
    "| Tuck flaps | | | |",
    "| Dust flaps | | | |",
    "| Glue tab | | | |",
    "| Score lines | | | |",
    "| Cut outline | | | |",
    "",
    "## Verification Decision",
    "",
    "- Keep `verificationStatus` as `geometry-needs-verification` until manual comparison passes.",
    "- Keep `productionReady: false`.",
    "",
  ].join("\n");
}

function buildMissingReferenceReport() {
  return [
    "# RTE V2 Reference Comparison",
    "",
    `Generated: \`${path.relative(projectRoot, generatedSvgPath)}\``,
    `Debug: \`${path.relative(projectRoot, debugSvgPath)}\``,
    "Reference: missing",
    "Status: reference-missing",
    "",
    "Place a trusted `reference.svg`, `reference.pdf`, or `reference.png` in this folder, then rerun:",
    "",
    "```bash",
    "npm run compare:rte-v2",
    "```",
    "",
    "Do not change `verificationStatus` to `visual-compared` until the comparison passes.",
    "Keep `productionReady: false`.",
    "",
  ].join("\n");
}

function findReferenceFile(folder) {
  const priority = ["reference.svg", "reference.dxf", "reference.pdf", "reference.png"];
  for (const name of priority) {
    const candidate = path.join(folder, name);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  const fallback = fs.readdirSync(folder)
    .filter((name) => /\.(svg|dxf|pdf|png)$/i.test(name))
    .map((name) => path.join(folder, name))
    .find((candidate) => fs.statSync(candidate).isFile());

  return fallback ?? null;
}

function loadJson(filename) {
  return JSON.parse(fs.readFileSync(filename, "utf8"));
}

function loadTs(modulePath) {
  const filename = resolveTsFile(modulePath);
  const cached = moduleCache.get(filename);

  if (cached) {
    return cached.exports;
  }

  if (filename.endsWith(".json")) {
    const jsonModule = { exports: JSON.parse(fs.readFileSync(filename, "utf8")) };
    moduleCache.set(filename, jsonModule);
    return jsonModule.exports;
  }

  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const compiledModule = { exports: {} };

  moduleCache.set(filename, compiledModule);

  const dirname = path.dirname(filename);
  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadTs(path.join(projectRoot, specifier.slice(2)));
    }

    if (specifier.startsWith(".")) {
      return loadTs(path.resolve(dirname, specifier));
    }

    return require(specifier);
  };

  const runModule = new Function("exports", "require", "module", "__filename", "__dirname", transpiled.outputText);
  runModule(compiledModule.exports, localRequire, compiledModule, filename, dirname);

  return compiledModule.exports;
}

function resolveTsFile(modulePath) {
  const candidates = [
    modulePath,
    `${modulePath}.ts`,
    `${modulePath}.tsx`,
    `${modulePath}.json`,
    path.join(modulePath, "index.ts"),
    path.join(modulePath, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Cannot resolve module: ${modulePath}`);
}
