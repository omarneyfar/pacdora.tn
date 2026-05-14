export type V2ImplementationStatus =
  | "spec-only"
  | "implemented-experimental"
  | "graph-valid"
  | "reference-pending"
  | "verified";

export type V2PartFamily =
  | "body-systems"
  | "glue-systems"
  | "top-closures"
  | "dust-flaps"
  | "bottom-closures"
  | "cutouts"
  | "hang-display"
  | "artwork-guides";

export type V2Point = {
  x: number;
  y: number;
};

export type V2Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type V2AnchorEdge = "top" | "right" | "bottom" | "left" | "custom";

export type V2Anchor = {
  id: string;
  ownerPartId: string;
  faceId: string;
  edge: V2AnchorEdge;
  start: V2Point;
  end: V2Point;
  normal: V2Point;
  tangent: V2Point;
  length: number;
};

export type V2FaceRole =
  | "body"
  | "closure"
  | "dust"
  | "glue"
  | "display"
  | "guide";

export type V2Face = {
  id: string;
  label: string;
  role: V2FaceRole;
  points: V2Point[];
  bounds: V2Bounds;
  centroid: V2Point;
  sourcePartId: string;
  printable: boolean;
};

export type V2StructuralCrease = {
  id: string;
  label: string;
  faceA: string;
  faceB: string;
  start: V2Point;
  end: V2Point;
  foldAngle?: number;
  foldDirection?: "valley" | "mountain" | "inward" | "outward";
};

export type V2GeometryLayer =
  | "cut"
  | "hole"
  | "window"
  | "score"
  | "glue"
  | "safe-area"
  | "bleed"
  | "guide";

export type V2LinePrimitive = {
  id: string;
  label: string;
  type: "line";
  layer: V2GeometryLayer;
  start: V2Point;
  end: V2Point;
  ownerFaceId?: string;
};

export type V2PolylinePrimitive = {
  id: string;
  label: string;
  type: "polyline" | "polygon";
  layer: V2GeometryLayer;
  points: V2Point[];
  ownerFaceId?: string;
};

export type V2CirclePrimitive = {
  id: string;
  label: string;
  type: "circle";
  layer: V2GeometryLayer;
  center: V2Point;
  radius: number;
  ownerFaceId?: string;
};

export type V2RoundedRectPrimitive = {
  id: string;
  label: string;
  type: "rounded-rect" | "slot" | "euro-slot";
  layer: V2GeometryLayer;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  crownRadius?: number;
  ownerFaceId?: string;
};

export type V2GeometryPrimitive =
  | V2LinePrimitive
  | V2PolylinePrimitive
  | V2CirclePrimitive
  | V2RoundedRectPrimitive;

export type V2ContractInput = {
  name: string;
  label?: string;
  unit?: string;
  required?: boolean;
  description?: string;
  defaultValue?: number | string;
};

export type V2ContractOutputs = {
  faces?: string[];
  structuralCreases?: string[];
  geometryPrimitives?: string[];
  anchors?: string[];
};

export type V2PartContract = {
  id: string;
  label: string;
  family: V2PartFamily;
  sourceDocPartId: string;
  implementationStatus: V2ImplementationStatus;
  productionReady: false;
  requiredAnchors: string[];
  allowedAttachTargets: string[];
  inputs: V2ContractInput[];
  outputs: V2ContractOutputs;
  createsFaces: boolean;
  createsStructuralCreases: boolean;
  createsGeometryPrimitives: boolean;
  createsAnchors: boolean;
  validationRules: string[];
  warningRules: string[];
  foldingNotes: string[];
  artworkNotes: string[];
  productionRisks: string[];
  usedByTemplates: string[];
};

export type V2PartParameters = Record<string, number | string | boolean | undefined>;

export type V2PartBuildInput<Parameters extends V2PartParameters = V2PartParameters> = {
  id: string;
  attachTo?: string;
  attachToFace?: string;
  parameters: Parameters;
};

export type V2PartResult = {
  faces: V2Face[];
  structuralCreases: V2StructuralCrease[];
  geometryPrimitives: V2GeometryPrimitive[];
  anchors: V2Anchor[];
  warnings: string[];
};

export type V2PartBuildContext = {
  anchors: Map<string, V2Anchor>;
  faces: Map<string, V2Face>;
  warnings: string[];
  getAnchor(anchorId: string): V2Anchor;
  getFace(faceId: string): V2Face;
  addWarning(message: string): void;
};

export type V2PartImplementation<Parameters extends V2PartParameters = V2PartParameters> = {
  id: string;
  label: string;
  contractId: string;
  build(input: V2PartBuildInput<Parameters>, context: V2PartBuildContext): V2PartResult;
};

export type V2PartRegistryEntry = {
  id: string;
  label: string;
  contract: V2PartContract;
  implementation?: V2PartImplementation;
};

export type V2PartDebugGraph = {
  id: string;
  label: string;
  faces: V2Face[];
  structuralCreases: V2StructuralCrease[];
  geometryPrimitives: V2GeometryPrimitive[];
  anchors: V2Anchor[];
  warnings: string[];
};
