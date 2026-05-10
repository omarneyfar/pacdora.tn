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
  source?: DielineGraphSource;
  sourceSvg?: string;
};
