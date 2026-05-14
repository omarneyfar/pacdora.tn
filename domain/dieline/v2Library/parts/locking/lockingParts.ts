import {
  attachedRectanglePart,
  attachedTonguePart,
  faceRoundedRectPrimitivePart,
  faceSlotPrimitivePart,
} from "../parametricParts";

const lockingWarning = () => ["Lock tab/slot fit is tolerance-sensitive and remains reference-pending until CAD and prototype checks pass."];

export const lockTab = attachedTonguePart({
  id: "lockTab",
  label: "Lock tab",
  role: "locking",
  edge: "top",
  bodyDepthParam: "tabShoulderDepth",
  tongueDepthParam: "TD1",
  tongueWidthParam: "TL",
  defaultBodyDepthRatio: 0.12,
  warningFactory: lockingWarning,
});

export const lockSlot = faceSlotPrimitivePart({
  id: "lockSlot",
  label: "Lock slot",
  widthParam: "TL",
  heightParam: "TD1",
  defaultWidthRatio: 0.45,
  defaultHeightRatio: 0.08,
  margin: 5,
  warningFactory: lockingWarning,
});

export const lockingTuckFlap = attachedTonguePart({
  id: "lockingTuckFlap",
  label: "Locking tuck flap",
  role: "closure",
  edge: "top",
  bodyDepthParam: "TFW",
  tongueDepthParam: "TD1",
  tongueWidthParam: "TL",
  defaultBodyDepthRatio: 0.42,
  warningFactory: lockingWarning,
});

export const catalogLockFlap = attachedRectanglePart({
  id: "catalogLockFlap",
  label: "Catalog lock flap",
  role: "closure",
  edge: "top",
  depthParam: "TFW",
  defaultDepthRatio: 0.42,
  warningFactory: lockingWarning,
});

export const snapLockingLip = attachedTonguePart({
  id: "snapLockingLip",
  label: "Snap locking lip",
  role: "locking",
  edge: "bottom",
  bodyDepthParam: "lipDepth",
  tongueDepthParam: "snapDepth",
  tongueWidthParam: "snapWidth",
  defaultBodyDepthRatio: 0.16,
  warningFactory: lockingWarning,
});

export const lockReliefNotch = faceRoundedRectPrimitivePart({
  id: "lockReliefNotch",
  label: "Lock relief notch",
  layer: "hole",
  widthParam: "notchWidth",
  heightParam: "notchDepth",
  defaultWidthRatio: 0.08,
  defaultHeightRatio: 0.08,
  margin: 3,
  warningFactory: lockingWarning,
});
