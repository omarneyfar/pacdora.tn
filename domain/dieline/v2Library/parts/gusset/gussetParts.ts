import {
  attachedRectanglePart,
  attachedTrianglePart,
  faceLinePrimitivePart,
} from "../parametricParts";

const gussetWarning = () => ["Gusset geometry is reference-pending; roof angles, triangular fold sequence, and ridge closure need packaging-engineer validation."];

export const gussetTrianglePanel = attachedTrianglePart({
  id: "gussetTrianglePanel",
  label: "Gusset triangle panel",
  role: "gusset",
  edge: "top",
  depthParam: "triangleDepth",
  defaultDepthRatio: 0.42,
  warningFactory: gussetWarning,
});

export const gussetCover = attachedRectanglePart({
  id: "gussetCover",
  label: "Gusset cover panel",
  role: "gusset",
  edge: "top",
  depthParam: "TFW",
  defaultDepthRatio: 0.46,
  warningFactory: gussetWarning,
});

export const gussetSidePanel = attachedRectanglePart({
  id: "gussetSidePanel",
  label: "Gusset side panel",
  role: "gusset",
  edge: "top",
  depthParam: "sideDepth",
  defaultDepthRatio: 0.38,
  warningFactory: gussetWarning,
});

export const gussetDiagonalScore = faceLinePrimitivePart({
  id: "gussetDiagonalScore",
  label: "Gusset diagonal score guide",
  layer: "score",
  orientation: "diagonal-down",
  warningFactory: gussetWarning,
});
