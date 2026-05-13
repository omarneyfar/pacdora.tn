import type {
  DielineCategory,
  DielineCrease,
  DielineFace,
  DielineFaceNode,
  DielineGraph,
  DielinePart,
  GeometryPrimitive,
  ParameterSpec,
  ParameterValueMap,
  Point,
} from "../types";

export type RecipeVerificationStatus =
  | "none"
  | "graph-valid"
  | "visual-compared"
  | "cad-compared"
  | "prototype-tested"
  | "geometry-needs-verification";

export type RecipeParameterDefinition = {
  label?: string;
  kind?: ParameterSpec["kind"];
  input?: ParameterSpec["input"];
  default: string | number | boolean;
  min?: string | number;
  max?: string | number;
  step?: number;
  unit?: string;
  options?: Array<{ label: string; value: string | number | boolean }>;
};

export type DielineComponentRecipe = {
  id: string;
  label?: string;
  schemaVersion: "dieline-recipe-1.0" | string;
  category: DielineCategory;
  family: string;
  productionReady: boolean;
  verificationStatus: RecipeVerificationStatus;
  parameters: Record<string, RecipeParameterDefinition>;
  parts: ComponentRecipePart[];
  folding: {
    rootFace: string;
    strategy?: "derive-from-attachments";
  };
};

export type ComponentRecipePart = {
  id: string;
  type: string;
  attachTo?: string;
  [key: string]: unknown;
};

export type AnchorEdge = "top" | "right" | "bottom" | "left" | "custom";

export type Anchor = {
  id: string;
  ownerPartId: string;
  faceId: string;
  edge: AnchorEdge;
  start: Point;
  end: Point;
  normal: Point;
  tangent: Point;
  length: number;
};

export type FaceTreeHint = {
  parentFaceId: string;
  childFaceId: string;
  creaseId: string;
};

export type PartResult = {
  faces?: DielineFace[];
  structuralCreases?: DielineCrease[];
  geometry?: GeometryPrimitive[];
  anchors?: Anchor[];
  faceTreeHints?: FaceTreeHint[];
  part?: DielinePart;
  warnings?: string[];
};

export type ComponentLayoutContext = {
  recipe: DielineComponentRecipe;
  params: ParameterValueMap;
  faces: DielineFace[];
  creases: DielineCrease[];
  geometry: GeometryPrimitive[];
  anchors: Map<string, Anchor>;
  parts: DielinePart[];
  faceTreeHints: FaceTreeHint[];
  warnings: string[];
  getAnchor(anchorId: string): Anchor;
  numberValue(value: unknown, label: string): number;
  addPartResult(partId: string, result: PartResult): void;
};

export type DielinePartGenerator<Config extends ComponentRecipePart = ComponentRecipePart> = {
  type: string;
  build(ctx: ComponentLayoutContext, config: Config): PartResult;
};

export type ResolvedRecipeParameters = {
  values: ParameterValueMap;
  parameterSpecs: ParameterSpec[];
  warnings: string[];
};

export type ComponentGraphAssemblyInput = {
  recipe: DielineComponentRecipe;
  params: ParameterValueMap;
  parameterSpecs: ParameterSpec[];
  faces: DielineFace[];
  creases: DielineCrease[];
  geometry: GeometryPrimitive[];
  parts: DielinePart[];
  faceTreeHints: FaceTreeHint[];
  warnings: string[];
};

export type ComponentGraphAssemblyResult = {
  graph: DielineGraph;
  faceTree: DielineFaceNode[];
};
