export type Point = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DielineFaceRole = "panel" | "flap" | "glue" | "unknown";

export type DielineLayer =
  | "cut"
  | "crease"
  | "perf"
  | "window"
  | "hole"
  | "bleed"
  | "safe"
  | "label";

export type GeometryPrimitive =
  | {
      id: string;
      layer: DielineLayer;
      type: "line";
      start: Point;
      end: Point;
    }
  | {
      id: string;
      layer: DielineLayer;
      type: "polyline" | "polygon";
      points: Point[];
    }
  | {
      id: string;
      layer: DielineLayer;
      type: "arc";
      center: Point;
      radius: number;
      startAngle: number;
      endAngle: number;
    }
  | {
      id: string;
      layer: DielineLayer;
      type: "circle";
      center: Point;
      radius: number;
    }
  | {
      id: string;
      layer: DielineLayer;
      type: "ellipse";
      center: Point;
      radiusX: number;
      radiusY: number;
    }
  | {
      id: string;
      layer: DielineLayer;
      type: "rounded-rect" | "slot";
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
    }
  | {
      id: string;
      layer: DielineLayer;
      type: "label";
      position: Point;
      text: string;
    };

export type DielineCategory =
  | "folding-box"
  | "mailer-box"
  | "sleeve"
  | "shipping-box"
  | "display-box"
  | "sticker"
  | "secure-box"
  | "insert"
  | "tray-and-sleeve"
  | "tray-and-cover"
  | "bottle-carrier"
  | "envelope"
  | "divider"
  | "cake-box"
  | "pillow-box"
  | "custom";

export type DielinePartRole =
  | "body"
  | "panel"
  | "closure"
  | "top-closure"
  | "bottom-closure"
  | "lid"
  | "base"
  | "wall"
  | "dust-flap"
  | "tuck-flap"
  | "seal-flap"
  | "bottom-flap"
  | "glue-flap"
  | "lock"
  | "insert"
  | "divider"
  | "handle"
  | "window"
  | "tear-strip"
  | "unknown";

export type DielinePart = {
  id: string;
  label: string;
  role: DielinePartRole;
  faceIds: string[];
  creaseIds?: string[];
};

export type DielineParameterKind = "dimension" | "material" | "closure" | "export" | "other";

export type DielineParameterInput = "number" | "select" | "boolean";

export type DielineParameterOption = {
  label: string;
  value: string | number | boolean;
};

export type ParameterSpec = {
  id: string;
  label: string;
  kind: DielineParameterKind;
  input: DielineParameterInput;
  defaultValue: string | number | boolean;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: DielineParameterOption[];
};

export type DielineParameter = {
  id: string;
  label: string;
  kind: DielineParameterKind;
  value: string | number | boolean;
  unit?: string;
};

export type ParameterValueMap = Record<string, string | number | boolean>;

export type DielineTemplateDefinition = {
  id: string;
  label: string;
  category: DielineCategory;
  parameters: ParameterSpec[];
};

export type DielineGraphMetadata = {
  category: DielineCategory;
  family: string;
  familyLabel: string;
  parts: DielinePart[];
  parameters?: DielineParameter[];
  parameterSpecs?: ParameterSpec[];
  parameterValues?: ParameterValueMap;
};

export type DielineFace = {
  id: string;
  label: string;
  vertices: Point[];
  centroid: Point;
  bounds: Bounds;
  role: DielineFaceRole;
  artworkEnabled: boolean;
};

export type DielineCrease = {
  id: string;
  faceA: string;
  faceB: string;
  edgeStart: Point;
  edgeEnd: Point;
  foldAngle: number;
  direction: 1 | -1;
};

export type DielineCutPath = {
  id: string;
  d: string;
  points?: Point[];
};

export type DielineFaceNode = {
  faceId: string;
  creaseId: string | null;
  children: DielineFaceNode[];
};

export type DielineGraphSource =
  | {
      type: "template";
      templateId: string;
    }
  | {
      type: "svg-upload";
      fileName?: string;
    };

export type DielineGraph = {
  size: Size;
  faces: DielineFace[];
  creases: DielineCrease[];
  cutPaths: DielineCutPath[];
  faceTree: DielineFaceNode[];
  geometry?: GeometryPrimitive[];
  metadata?: DielineGraphMetadata;
  source?: DielineGraphSource;
  sourceSvg?: string;
};
