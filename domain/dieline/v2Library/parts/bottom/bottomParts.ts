import {
  attachedRectanglePart,
  attachedTonguePart,
  attachedTrapezoidPart,
  faceBandPrimitivePart,
  faceLinePrimitivePart,
  faceSlotPrimitivePart,
} from "../parametricParts";

const snapWarning = () => ["Snap-lock bottom geometry is reference-pending; tongue and slot clearance must be prototype checked."];
const autoWarning = () => ["Auto-lock/crash-lock geometry is partial-experimental; diagonal behavior must be verified with a folding prototype."];
const fullFlapWarning = () => ["Full-flap bottom dimensions and diagonal scores are non-standard and require CAD/prototype validation."];

export const snapLockMajorFlap = attachedRectanglePart({
  id: "snapLockMajorFlap",
  label: "Snap-lock major flap",
  role: "bottom",
  edge: "bottom",
  depthParam: "flapDepth",
  defaultDepthRatio: 0.48,
  warningFactory: snapWarning,
});

export const snapLockMinorFlap = attachedTrapezoidPart({
  id: "snapLockMinorFlap",
  label: "Snap-lock minor flap",
  role: "bottom",
  edge: "bottom",
  depthParam: "DFW",
  defaultDepthRatio: 0.38,
  taperParam: "clearanceTaper",
  warningFactory: snapWarning,
});

export const snapLockTongue = attachedTonguePart({
  id: "snapLockTongue",
  label: "Snap-lock tongue",
  role: "bottom",
  edge: "bottom",
  bodyDepthParam: "bodyDepth",
  tongueDepthParam: "tongueDepth",
  tongueWidthParam: "tongueWidth",
  defaultBodyDepthRatio: 0.22,
  warningFactory: snapWarning,
});

export const snapLockReceiverSlot = faceSlotPrimitivePart({
  id: "snapLockReceiverSlot",
  label: "Snap-lock receiver slot",
  widthParam: "slotWidth",
  heightParam: "slotHeight",
  defaultWidthRatio: 0.44,
  defaultHeightRatio: 0.08,
  margin: 5,
  warningFactory: snapWarning,
});

export const autoLockMajorFlap = attachedRectanglePart({
  id: "autoLockMajorFlap",
  label: "Auto-lock major flap",
  role: "bottom",
  edge: "bottom",
  depthParam: "majorDepth",
  defaultDepthRatio: 0.56,
  warningFactory: autoWarning,
});

export const autoLockMinorFlap = attachedTrapezoidPart({
  id: "autoLockMinorFlap",
  label: "Auto-lock minor flap",
  role: "bottom",
  edge: "bottom",
  depthParam: "DFW",
  defaultDepthRatio: 0.38,
  taperParam: "clearanceTaper",
  warningFactory: autoWarning,
});

export const autoLockGluePanel = attachedRectanglePart({
  id: "autoLockGluePanel",
  label: "Auto-lock glue panel",
  role: "glue",
  edge: "bottom",
  depthParam: "GFW",
  defaultDepthRatio: 0.18,
  printable: false,
  warningFactory: autoWarning,
});

export const autoLockDiagonalScore = faceLinePrimitivePart({
  id: "autoLockDiagonalScore",
  label: "Auto-lock diagonal score guide",
  layer: "score",
  orientation: "diagonal-down",
  warningFactory: autoWarning,
});

export const fullFlapBottomPanel = attachedRectanglePart({
  id: "fullFlapBottomPanel",
  label: "Full-flap bottom panel",
  role: "bottom",
  edge: "bottom",
  depthParam: "fullFlapDepth",
  defaultDepthRatio: 0.95,
  warningFactory: fullFlapWarning,
});

export const bottomGlueZone = faceBandPrimitivePart({
  id: "bottomGlueZone",
  label: "Bottom glue zone",
  layer: "glue",
  heightParam: "glueHeight",
  defaultHeightRatio: 0.18,
  warningFactory: autoWarning,
});
