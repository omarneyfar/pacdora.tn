import {
  attachedRectanglePart,
  attachedTrapezoidPart,
  faceBandPrimitivePart,
  faceLinePrimitivePart,
  faceSlotPrimitivePart,
} from "../parametricParts";

const internalWarning = () => ["Internal structure geometry is partial-experimental; 3D collision, material thickness, and bottom-closure interference must be prototype checked."];

export const centeredDivider = attachedRectanglePart({
  id: "centeredDivider",
  label: "Centered divider panel",
  role: "internal",
  edge: "any",
  depthParam: "DL",
  defaultDepthRatio: 0.85,
  warningFactory: internalWarning,
});

export const integratedPartition = attachedRectanglePart({
  id: "integratedPartition",
  label: "Integrated partition panel",
  role: "internal",
  edge: "any",
  depthParam: "PD1",
  defaultDepthRatio: 0.65,
  warningFactory: internalWarning,
});

export const builtInInsert = attachedRectanglePart({
  id: "builtInInsert",
  label: "Built-in product insert",
  role: "internal",
  edge: "any",
  depthParam: "D1",
  defaultDepthRatio: 0.42,
  warningFactory: internalWarning,
});

export const productMount = attachedTrapezoidPart({
  id: "productMount",
  label: "Product mount panel",
  role: "internal",
  edge: "any",
  depthParam: "D1",
  defaultDepthRatio: 0.45,
  taperParam: "mountTaper",
  warningFactory: internalWarning,
});

export const internalHolder = attachedRectanglePart({
  id: "internalHolder",
  label: "Internal holder panel",
  role: "internal",
  edge: "any",
  depthParam: "holderDepth",
  defaultDepthRatio: 0.38,
  warningFactory: internalWarning,
});

export const compartmentGrid = faceLinePrimitivePart({
  id: "compartmentGrid",
  label: "Compartment grid guide",
  layer: "guide",
  orientation: "vertical",
  warningFactory: internalWarning,
});

export const partitionLockSlot = faceSlotPrimitivePart({
  id: "partitionLockSlot",
  label: "Partition lock slot",
  widthParam: "slotWidth",
  heightParam: "slotHeight",
  defaultWidthRatio: 0.08,
  defaultHeightRatio: 0.45,
  margin: 5,
  warningFactory: internalWarning,
});

export const partitionGlueZone = faceBandPrimitivePart({
  id: "partitionGlueZone",
  label: "Partition glue zone",
  layer: "glue",
  heightParam: "glueHeight",
  defaultHeightRatio: 0.16,
  warningFactory: internalWarning,
});
