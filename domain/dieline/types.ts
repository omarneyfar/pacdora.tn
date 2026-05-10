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

export type DielineParameter = {
  id: string;
  label: string;
  kind: DielineParameterKind;
  value: string | number | boolean;
  unit?: string;
};

export type DielineGraphMetadata = {
  category: DielineCategory;
  family: string;
  familyLabel: string;
  parts: DielinePart[];
  parameters?: DielineParameter[];
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
  metadata?: DielineGraphMetadata;
  source?: DielineGraphSource;
  sourceSvg?: string;
};
