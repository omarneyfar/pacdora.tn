import type {
  V2Anchor,
  V2Face,
  V2GeometryPrimitive,
  V2ImplementationStatus,
  V2PartParameters,
  V2StructuralCrease,
} from "../contracts/types";

export type V2TemplatePartSpec = {
  id: string;
  type: string;
  attachTo?: string;
  attachToFace?: string;
  parameters?: V2PartParameters;
};

export type V2TemplateAssemblyDefinition = {
  id: string;
  label: string;
  rootFaceId?: string;
  parameters?: V2PartParameters;
  parts: V2TemplatePartSpec[];
};

export type V2AssemblyPartMetadata = {
  id: string;
  type: string;
  label: string;
  contractId: string;
  implementationStatus: V2ImplementationStatus;
  productionReady: false;
  faceIds: string[];
  creaseIds: string[];
  geometryPrimitiveIds: string[];
  anchorIds: string[];
  warnings: string[];
};

export type V2TemplateAssembly = {
  id: string;
  label: string;
  source: "v2Library/template-assembly";
  rootFaceId?: string;
  parameters: V2PartParameters;
  faces: V2Face[];
  structuralCreases: V2StructuralCrease[];
  geometryPrimitives: V2GeometryPrimitive[];
  anchors: V2Anchor[];
  parts: V2AssemblyPartMetadata[];
  warnings: string[];
};

export type V2AssemblyValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
