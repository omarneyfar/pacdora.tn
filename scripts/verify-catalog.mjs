import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const moduleCache = new Map();

const {
  generateGraphFromCatalogTemplate,
  loadTemplateCatalog,
  validateTemplateCatalog,
} = loadTs(path.join(projectRoot, "domain", "dieline", "catalog"));
const { hasDielineGenerator } = loadTs(path.join(projectRoot, "domain", "dieline", "generators", "generatorRegistry"));
const { validateDielineGraph } = loadTs(path.join(projectRoot, "domain", "dieline", "validation", "validateDielineGraph"));

const catalog = loadTemplateCatalog();
const validation = validateTemplateCatalog(catalog);
const errors = validation.messages.filter((message) => message.level === "error");

if (errors.length > 0) {
  for (const error of errors) {
    console.error(formatMessage(error));
  }

  throw new Error(`Catalog validation failed with ${errors.length} error(s).`);
}

const implemented = catalog.templates.filter((template) => hasDielineGenerator(template.runtime.generatorId));
const catalogOnly = catalog.templates.filter((template) => !hasDielineGenerator(template.runtime.generatorId));

for (const template of implemented) {
  const result = generateGraphFromCatalogTemplate(template.id);
  const graphValidation = validateDielineGraph(result.graph);

  if (!graphValidation.ok) {
    throw new Error(`${template.id}: generated graph is invalid: ${graphValidation.errors.join("; ")}`);
  }

  assert(result.graph.metadata?.catalog?.templateId === template.id, `${template.id}: generated graph is missing catalog metadata`);
  assert(result.graph.metadata.catalog.generatorId === template.runtime.generatorId, `${template.id}: graph generator metadata mismatch`);
  assertFoldingBoxV2Policy(template);
}

for (const template of catalogOnly) {
  assert(template.productionStatus.productionReady === false, `${template.id}: catalog-only template must not be production-ready`);
  assert(template.requiresManualVerification === true, `${template.id}: catalog-only template must require manual verification`);
}

assertCatalogMigrationPolicy(catalog.templates);

console.log(
  `Catalog verification passed: ${catalog.templates.length} templates, ${implemented.length} generator-backed, ${catalogOnly.length} catalog-only, ${validation.messages.length} warning(s).`,
);

function formatMessage(message) {
  return `${message.level.toUpperCase()}${message.templateId ? ` ${message.templateId}` : ""}: ${message.message}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFoldingBoxV2Policy(template) {
  if (template.category !== "Folding Box") {
    return;
  }

  const isExperimentalV2 = [
    "tuckEndFoldingCarton",
    "centeredTuckEndCarton",
    "lockingTabTopBottom",
    "circularHangHole",
    "hangTab"
  ].includes(template.runtime.generatorId);

  if (!isExperimentalV2) {
    assert(template.runtime.generatorId.endsWith("V2"), `${template.id}: generator-backed folding-box templates must use v2 component-engine generators`);
    assert(template.runtime.status === "graph-valid", `${template.id}: v2 folding-box runtime status must be graph-valid`);
  } else {
    assert(template.runtime.status === "experimental" || template.runtime.status === "graph-valid", `${template.id}: experimental v2 folding-box runtime status must be experimental or graph-valid`);
  }

  assert(template.productionStatus.productionReady === false, `${template.id}: v2 folding-box templates must remain productionReady=false`);
  assert(template.requiresManualVerification === true, `${template.id}: v2 folding-box templates must still require manual verification`);
}

function assertCatalogMigrationPolicy(templates) {
  const reverse = templates.find((template) => template.slug === "reverseTuckEnd");
  const straight = templates.find((template) => template.slug === "straightTuckEnd");

  assert(reverse?.runtime.generatorId === "reverseTuckEndV2", "Reverse Tuck End catalog runtime must use reverseTuckEndV2");
  assert(straight?.runtime.generatorId === "straightTuckEndV2", "Straight Tuck End catalog runtime must use straightTuckEndV2");

  for (const template of templates) {
    if (template === reverse || template === straight) {
      continue;
    }

    assert(template.productionStatus.productionReady === false, `${template.id}: non-migrated templates must not be production-ready`);
    assert(
      template.runtime.status === "catalog-only" || template.runtime.status === "experimental",
      `${template.id}: non-migrated templates must remain catalog-only or experimental`,
    );
  }
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
