import type { DielineGraph, ParameterSpec, ParameterValueMap } from "../types";

export type CatalogPrimitive = string | number | boolean | null;

export type DatabaseInfo = {
  name: string;
  category: string;
  source: string;
  generatedOn?: string;
  refactoredOn?: string;
  templateCount: number;
  disclaimer?: string;
  intendedUse?: string;
};

export type UnitInfo = {
  length?: string;
  angle?: string;
  stroke?: string;
};

export type LineTypeDefinition = {
  strokeStyle: string;
  exportToDieCut: boolean;
  exportToPrint: boolean;
  meaning: string;
};

export type ManufacturingRules = {
  recommendedMaterials?: string[];
  recommendedThicknessRange?: {
    min: number;
    max: number;
    unit: string;
  };
  minimumGlueFlapWidth?: number;
  minimumFoldDistance?: number;
  minimumCutToFoldDistance?: number;
  minimumWindowMargin?: number;
  grainDirection?: string;
  tolerance?: string | Record<string, unknown>;
  dieCuttingNotes?: string;
  printingNotes?: string;
  assemblyNotes?: string;
  [key: string]: unknown;
};

export type ValidationRule = {
  ruleId: string;
  severity: "error" | "warning" | "info" | string;
  condition: string;
  message: string;
  affectedParameters?: string[];
  suggestedFix?: string;
};

export type DimensionDefinition = {
  key: string;
  label: string;
  type: "number" | "boolean" | "select" | string;
  cefBoxCode?: string | null;
  defaultValue?: CatalogPrimitive;
  minValue?: number | null;
  maxValue?: number | null;
  unit?: string | null;
  editable?: boolean;
  required?: boolean;
  formula?: string | null;
  dependsOn?: string[];
  description?: string;
  requiresManualVerification?: boolean;
};

export type EditableParameter = {
  key: string;
  label: string;
  type: "number" | "boolean" | "select" | string;
  defaultValue?: CatalogPrimitive;
  min?: number | null;
  max?: number | null;
  unit?: string | null;
  allowedValues?: CatalogPrimitive[] | null;
  affectsComponents?: string[];
  validationRules?: string[];
};

export type ComponentDefinition = {
  id: string;
  name: string;
  type: string;
  role?: string;
  visibleExterior?: boolean;
  printableArea?: boolean;
  foldable?: boolean;
  gluable?: boolean;
  cutout?: boolean;
  anchor?: {
    panelId?: string | null;
    edge?: string | null;
  };
  dimensions?: Record<string, string>;
  position?: Record<string, string | number>;
  connectedTo?: string[];
  usedByPaths?: string[];
  usedByFoldingSteps?: number[];
  notes?: string;
  requiresManualVerification?: boolean;
};

export type GeometryDefinition = {
  coordinateSystem?: string;
  origin?: string;
  unit?: string;
  canvasWidthFormula?: string;
  canvasHeightFormula?: string;
  viewBoxFormula?: string;
  bleedIncluded?: boolean;
  safeAreaIncluded?: boolean;
  requiresManualVerification?: boolean;
};

export type PathDefinition = {
  id: string;
  type: string;
  pathCommandFormula?: string;
  pointsFormula?: unknown[];
  strokeStyle?: string;
  manufacturingMeaning?: string;
  componentIds?: string[];
  visibleInEditor?: boolean;
  exportToDieCut?: boolean;
  exportToPrint?: boolean;
  requiresManualVerification?: boolean;
};

export type FoldingStep = {
  step: number;
  componentId: string;
  foldLineId: string;
  angle: number;
  direction: string;
  dependsOn?: number[];
  description?: string;
};

export type FoldingLogicDefinition = {
  topClosureType?: string;
  bottomClosureType?: string;
  sideSeamType?: string;
  foldSequence?: FoldingStep[];
  glueSequence?: string[];
  panelHierarchy?: {
    root?: string;
    children?: Record<string, string[]>;
  };
  mountainFolds?: string[];
  valleyFolds?: string[];
  lockedParts?: string[];
  assemblyNotes?: string;
};

export type Mockup3DDefinition = {
  enabled?: boolean;
  mappingConfidence?: string;
  faces?: Record<string, string | string[]>;
  uvMapping?: Array<{
    componentId: string;
    face?: string;
    uFormula?: string;
    vFormula?: string;
    widthFormula?: string;
    heightFormula?: string;
    rotation?: number;
    requiresManualVerification?: boolean;
  }>;
  foldAngles?: unknown[];
  hiddenFaces?: string[];
  notes?: string;
};

export type VariantDefinition = {
  variantId: string;
  variantName: string;
  enabledByParameter?: string;
  differenceFromBase?: string;
  addedComponents?: string[];
  removedComponents?: string[];
  changedFormulas?: Record<string, string>;
  changedValidationRules?: ValidationRule[];
  requiresManualVerification?: boolean;
};

export type TemplateSource = {
  website?: string;
  sourceUrl?: string;
  sourceTemplateName?: string;
  extractionMethod?: string;
  requiresManualVerification?: boolean;
  sourceVerificationNotes?: string;
};

export type ProductionStatus = {
  productionReady: boolean;
  verifiedByPackagingEngineer: boolean;
  prototypeTested: boolean;
  productionRiskLevel?: "low" | "medium" | "high" | string;
  warning?: string;
};

export type WarningDefinition = {
  message: string;
  severity?: "info" | "warning" | "error";
};

export type CatalogRuntimeStatus =
  | "catalog-only"
  | "generator-missing"
  | "generator-implemented"
  | "graph-valid"
  | "visually-compared"
  | "prototype-tested"
  | "production-ready"
  | "ready"
  | "beta"
  | "experimental";

export type TemplateRuntime = {
  generatorId: string;
  geometrySource: "typescript-generator" | "json-formula" | "external-fixture";
  supports2D: boolean;
  supports3D: boolean;
  status: CatalogRuntimeStatus;
};

export type TemplateVerification = {
  catalogNormalized: boolean;
  generatorImplemented: boolean;
  catalogReferencesValid: boolean;
  graphValidationPassed: boolean;
  visualComparedWithReference: boolean;
  dxfComparedWithReference: boolean;
  physicalPrototypeTested: boolean;
};

export type DielineTemplateDefinition = {
  id: string;
  name: string;
  slug: string;
  category: string;
  family: string;
  templateType: string;
  difficultyLevel?: string;
  productionUseCase?: string;
  commonIndustries?: string[];
  description: string;
  source: TemplateSource;
  productionStatus: ProductionStatus;
  dimensions: Record<string, DimensionDefinition>;
  derivedDimensions: Record<string, DimensionDefinition>;
  editableParameters: EditableParameter[];
  components: ComponentDefinition[];
  geometry: GeometryDefinition;
  paths: PathDefinition[];
  foldingLogic: FoldingLogicDefinition;
  mockup3D: Mockup3DDefinition;
  variants: VariantDefinition[];
  manufacturingRules: ManufacturingRules;
  validationRules: ValidationRule[];
  formulas: Record<string, string>;
  warnings: Array<string | WarningDefinition>;
  requiresManualVerification: boolean;
  runtime: TemplateRuntime;
  verification: TemplateVerification;
};

export type DielineTemplateCatalog = {
  databaseInfo: DatabaseInfo;
  units: UnitInfo;
  lineTypeLegend: Record<string, LineTypeDefinition>;
  globalDefaults: Record<string, unknown>;
  globalManufacturingRules: ManufacturingRules;
  globalValidationRules: ValidationRule[];
  templateSchemaVersion: string;
  templates: DielineTemplateDefinition[];
};

export type CatalogValidationLevel = "error" | "warning";

export type CatalogValidationMessage = {
  level: CatalogValidationLevel;
  templateId?: string;
  message: string;
};

export type CatalogValidationResult = {
  ok: boolean;
  messages: CatalogValidationMessage[];
};

export type ResolvedTemplateParameters = {
  catalogValues: ParameterValueMap;
  generatorParameters: ParameterValueMap;
  parameterSpecs: ParameterSpec[];
  warnings: string[];
};

export type CatalogGraphResult = {
  template: DielineTemplateDefinition;
  resolvedParameters: ParameterValueMap;
  graph: DielineGraph;
  warnings: string[];
};
