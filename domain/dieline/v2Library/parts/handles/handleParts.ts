import {
  attachedRectanglePart,
  attachedTrapezoidPart,
  faceRoundedRectPrimitivePart,
} from "../parametricParts";

const handleWarning = () => ["Handle geometry is partial-experimental; carry load, board grain, and reinforcement stack-up must be prototype verified."];

export const foldedHandle = attachedRectanglePart({
  id: "foldedHandle",
  label: "Folded handle panel",
  role: "handle",
  edge: "top",
  depthParam: "HL",
  defaultDepthRatio: 0.35,
  warningFactory: handleWarning,
});

export const arcHandle = attachedTrapezoidPart({
  id: "arcHandle",
  label: "Arc handle grip panel",
  role: "handle",
  edge: "top",
  depthParam: "HT",
  defaultDepthRatio: 0.32,
  taperParam: "shoulderInset",
  warningFactory: handleWarning,
});

export const handleBridge = attachedRectanglePart({
  id: "handleBridge",
  label: "Handle bridge",
  role: "handle",
  edge: "top",
  depthParam: "bridgeDepth",
  defaultDepthRatio: 0.18,
  warningFactory: handleWarning,
});

export const handleCutout = faceRoundedRectPrimitivePart({
  id: "handleCutout",
  label: "Handle cutout",
  layer: "hole",
  widthParam: "HW",
  heightParam: "HT",
  defaultWidthRatio: 0.48,
  defaultHeightRatio: 0.18,
  margin: 8,
  warningFactory: handleWarning,
});

export const handleReinforcementPanel = attachedRectanglePart({
  id: "handleReinforcementPanel",
  label: "Handle reinforcement panel",
  role: "handle",
  edge: "top",
  depthParam: "reinforcementDepth",
  defaultDepthRatio: 0.24,
  warningFactory: handleWarning,
});
