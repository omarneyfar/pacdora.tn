import {
  attachedRectanglePart,
  attachedTonguePart,
  faceSlotPrimitivePart,
} from "../parametricParts";

const reversibleWarning = () => ["Reversible lid geometry is partial-experimental; 180-degree hinge motion, insert slot registration, and open/closed clearances need prototype validation."];

export const reversibleLid = attachedRectanglePart({
  id: "reversibleLid",
  label: "Reversible lid panel",
  role: "reversible",
  edge: "top",
  depthParam: "lidDepth",
  defaultDepthRatio: 0.82,
  warningFactory: reversibleWarning,
});

export const reversibleLidLockTab = attachedTonguePart({
  id: "reversibleLidLockTab",
  label: "Reversible lid lock tab",
  role: "locking",
  edge: "top",
  bodyDepthParam: "tabBodyDepth",
  tongueDepthParam: "TD1",
  tongueWidthParam: "TL",
  defaultBodyDepthRatio: 0.16,
  warningFactory: reversibleWarning,
});

export const reversibleLidReceiverSlot = faceSlotPrimitivePart({
  id: "reversibleLidReceiverSlot",
  label: "Reversible lid receiver slot",
  widthParam: "SL1",
  heightParam: "SW2",
  defaultWidthRatio: 0.36,
  defaultHeightRatio: 0.08,
  margin: 5,
  warningFactory: reversibleWarning,
});

export const lidInsertPanel = attachedRectanglePart({
  id: "lidInsertPanel",
  label: "Lid insert panel",
  role: "reversible",
  edge: "top",
  depthParam: "insertDepth",
  defaultDepthRatio: 0.34,
  warningFactory: reversibleWarning,
});
