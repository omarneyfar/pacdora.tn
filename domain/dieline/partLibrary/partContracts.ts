import type { AnchorEdge } from "../componentEngine/types";

export type PartImplementationStatus =
  | "implemented"
  | "partial"
  | "reference-pending"
  | "experimental";

export type PartAttachTarget = "face" | "anchor:any" | `anchor:${AnchorEdge}`;

export type PartOutputCardinality = "none" | "optional" | "one-or-more";

export type PartOutputExpectations = {
  faces: PartOutputCardinality;
  structuralCreases: PartOutputCardinality;
  geometryPrimitives: PartOutputCardinality;
  anchors: PartOutputCardinality;
};

export type PartContractInput = {
  name: string;
  description?: string;
  required?: boolean;
};

export type PartContractOutputs = {
  faces?: string[];
  structuralCreases?: string[];
  geometryPrimitives?: string[];
  anchors?: string[];
};

export type PartContract = {
  id: string;
  family: string;
  implementationStatus: PartImplementationStatus;
  requiredAnchors: string[];
  allowedAttachTargets: PartAttachTarget[];
  inputs: PartContractInput[];
  outputs: PartContractOutputs;
  createsFaces: boolean;
  createsStructuralCreases: boolean;
  createsGeometryPrimitives: boolean;
  createsAnchors: boolean;
  validationRules: string[];
  warningRules: string[];
  usedByTemplates: string[];
  productionReady: boolean;
};

type PartContractDefinition = Omit<PartContract, "productionReady"> & {
  productionReady?: boolean;
};

const emptyOutputExpectations: PartOutputExpectations = {
  faces: "none",
  structuralCreases: "none",
  geometryPrimitives: "none",
  anchors: "none",
};

function definePartContract(contract: PartContractDefinition): PartContract {
  return {
    ...contract,
    productionReady: contract.productionReady ?? false,
  };
}

export function createOutputExpectations(
  expectations: Partial<PartOutputExpectations>,
): PartOutputExpectations {
  return { ...emptyOutputExpectations, ...expectations };
}

export const partContracts = [
  definePartContract({
    id: "body-strip",
    family: "body-systems",
    implementationStatus: "implemented",
    requiredAnchors: [],
    allowedAttachTargets: [],
    inputs: [
      { name: "panels", required: true, description: "Ordered body panels with width and height formulas." },
      { name: "topBand", description: "Vertical clearance above the body strip for top closure geometry." },
      { name: "bottomBand", description: "Vertical clearance below the body strip for bottom closure geometry." },
      { name: "offsetX", description: "Horizontal body offset used when a glue tab sits before the strip." },
    ],
    outputs: {
      faces: ["ordered body panel faces"],
      structuralCreases: ["face-to-face panel hinges"],
      anchors: ["edge anchors for every body panel"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: [
      "Every panel width and height must be positive and finite.",
      "Generated panel hinges must sit on shared face boundaries.",
    ],
    warningRules: [],
    usedByTemplates: [
      "reverseTuckEnd",
      "straightTuckEnd",
      "tuck-end-folding-carton",
      "centered-tuck-end-carton",
      "with-locking-tab-on-top-and-bottom",
      "with-circular-hang-hole",
      "with-hang-tab",
    ],
  }),
  definePartContract({
    id: "side-glue-tab",
    family: "glue-systems",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:left", "anchor:right"],
    inputs: [{ name: "width", required: true, description: "Glue tab width." }],
    outputs: {
      faces: ["glue tab face"],
      structuralCreases: ["glue tab hinge to the body panel"],
      anchors: ["edge anchors for the glue tab face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: [
      "Glue tab width must be positive and finite.",
      "Glue tab must attach to a vertical body edge.",
    ],
    warningRules: [],
    usedByTemplates: ["all folding box body-strip recipes"],
  }),
  definePartContract({
    id: "reverse-tuck-flap",
    family: "top-closures",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [
      { name: "height", required: true },
      { name: "lipHeight", required: true },
      { name: "taper" },
      { name: "scoreOffset", required: true },
    ],
    outputs: {
      faces: ["single tuck flap face"],
      structuralCreases: ["hinge from body panel edge to tuck flap face"],
      geometryPrimitives: ["internal lip score line"],
      anchors: ["edge anchors for the tuck flap face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Tuck flap height must be positive and finite.",
      "Only the body-to-flap hinge is a DielineCrease.",
      "Internal lip scores remain GeometryPrimitive objects.",
    ],
    warningRules: [],
    usedByTemplates: ["reverseTuckEnd", "with-circular-hang-hole", "with-hang-tab"],
  }),
  definePartContract({
    id: "straight-tuck-flap",
    family: "top-closures",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [
      { name: "height", required: true },
      { name: "lipHeight", required: true },
      { name: "taper" },
      { name: "scoreOffset", required: true },
    ],
    outputs: {
      faces: ["single tuck flap face"],
      structuralCreases: ["hinge from body panel edge to tuck flap face"],
      geometryPrimitives: ["internal lip score line"],
      anchors: ["edge anchors for the tuck flap face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Tuck flap height must be positive and finite.",
      "Only the body-to-flap hinge is a DielineCrease.",
      "Internal lip scores remain GeometryPrimitive objects.",
    ],
    warningRules: [],
    usedByTemplates: ["straightTuckEnd"],
  }),
  definePartContract({
    id: "centered-tuck-flap",
    family: "top-closures",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "lipHeight" }, { name: "taper" }, { name: "scoreOffset" }],
    outputs: {
      faces: ["centered tuck flap face scaffold"],
      structuralCreases: ["hinge to parent panel or partial edge anchor"],
      geometryPrimitives: ["internal score geometry when configured"],
      anchors: ["edge anchors for the flap scaffold"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: ["Generated flap face must not self-intersect."],
    warningRules: ["Centered tuck geometry is reference-pending and needs visual comparison."],
    usedByTemplates: ["centered-tuck-end-carton"],
  }),
  definePartContract({
    id: "slotted-tuck-flap",
    family: "top-closures",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "slot" }, { name: "relief" }],
    outputs: {
      faces: ["slotted tuck flap face"],
      structuralCreases: ["hinge to parent body panel"],
      geometryPrimitives: ["internal score line", "slot cutout", "optional relief cuts"],
      anchors: ["edge anchors for the slotted tuck face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Slot and relief geometry must remain GeometryPrimitive objects.",
      "Generated flap face must not self-intersect.",
    ],
    warningRules: ["Slotted tuck flap geometry is reference-pending and needs overlay comparison."],
    usedByTemplates: ["tuck-end-folding-carton"],
  }),
  definePartContract({
    id: "dust-flap",
    family: "dust-flaps",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true, description: "Dust flap depth." }],
    outputs: {
      faces: ["single dust flap face"],
      structuralCreases: ["hinge from body panel edge to dust flap face"],
      anchors: ["edge anchors for the dust flap face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: ["Dust flap height must be positive and finite."],
    warningRules: [],
    usedByTemplates: ["reverseTuckEnd", "straightTuckEnd", "centered-tuck-end-carton"],
  }),
  definePartContract({
    id: "custom-dust-flap",
    family: "dust-flaps",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "notch" }, { name: "shape" }],
    outputs: {
      faces: ["custom dust flap face"],
      structuralCreases: ["hinge from body panel edge to dust flap face"],
      geometryPrimitives: ["optional notch cut geometry"],
      anchors: ["edge anchors for the custom dust flap face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: ["Notches must remain GeometryPrimitive objects."],
    warningRules: ["Custom dust flap geometry is reference-pending and needs overlay comparison."],
    usedByTemplates: ["tuck-end-folding-carton"],
  }),
  definePartContract({
    id: "panel-flap",
    family: "panel-flaps",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }],
    outputs: {
      faces: ["rectangular flap face"],
      structuralCreases: ["hinge from parent panel edge to flap face"],
      anchors: ["edge anchors for the panel flap face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: ["Panel flap height must be positive and finite."],
    warningRules: ["Panel flap usage is reference-pending for folding-box templates."],
    usedByTemplates: ["future panel-flap templates"],
  }),
  definePartContract({
    id: "lock-tab",
    family: "locking-closures",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "tipWidth" }, { name: "shoulder" }],
    outputs: {
      faces: ["lock tab face"],
      structuralCreases: ["hinge from parent flap to lock tab face"],
      anchors: ["edge anchors for the lock tab face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: ["Lock tab face must not self-intersect."],
    warningRules: ["Lock tab geometry is reference-pending and needs overlay comparison."],
    usedByTemplates: ["with-locking-tab-on-top-and-bottom"],
  }),
  definePartContract({
    id: "hang-tab",
    family: "hang-display",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "topWidth" }, { name: "shoulder" }],
    outputs: {
      faces: ["hang tab scaffold face"],
      structuralCreases: ["hinge from parent edge to hang tab face"],
      anchors: ["edge anchors for the hang tab face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: ["Hang tab face must not self-intersect."],
    warningRules: ["Hang tab geometry is reference-pending and needs display-load validation."],
    usedByTemplates: ["with-hang-tab", "with-circular-hang-hole"],
  }),
  definePartContract({
    id: "partial-edge-anchor",
    family: "layout-guides",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:any"],
    inputs: [{ name: "length" }, { name: "margin" }, { name: "offsetAlong" }],
    outputs: { anchors: ["derived partial edge anchor"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: ["Derived anchor length must be positive and finite."],
    warningRules: [],
    usedByTemplates: ["centered-tuck-end-carton", "with-locking-tab-on-top-and-bottom", "with-circular-hang-hole", "with-hang-tab"],
  }),
  definePartContract({
    id: "score-line",
    family: "non-structural-guides",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:any"],
    inputs: [{ name: "offset" }],
    outputs: { geometryPrimitives: ["internal score line guide"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Score lines must remain GeometryPrimitive objects, never DielineCrease."],
    warningRules: [],
    usedByTemplates: ["guide-only recipes"],
  }),
  definePartContract({
    id: "slot-cutout",
    family: "cutouts",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "width", required: true }, { name: "height", required: true }, { name: "safeDistance" }],
    outputs: { geometryPrimitives: ["slot cutout"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: [
      "Slot cutouts must remain GeometryPrimitive objects.",
      "Slot cutouts must stay inside the target face and away from structural creases.",
    ],
    warningRules: [],
    usedByTemplates: ["legacy slot helper smoke tests"],
  }),
  definePartContract({
    id: "rounded-slot-cutout",
    family: "cutouts",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo|attachToFace"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "width", required: true }, { name: "height", required: true }, { name: "margin" }],
    outputs: { geometryPrimitives: ["rounded slot cutout"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Rounded slot cutouts must remain GeometryPrimitive objects."],
    warningRules: ["Rounded slot geometry is reference-pending and needs overlay comparison."],
    usedByTemplates: ["with-locking-tab-on-top-and-bottom"],
  }),
  definePartContract({
    id: "circular-hang-hole",
    family: "cutouts",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo|attachToFace"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "radius", required: true }, { name: "margin" }],
    outputs: { geometryPrimitives: ["circular hang hole cutout"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Circular hang holes must remain GeometryPrimitive objects."],
    warningRules: ["Circular hang hole placement is reference-pending and needs display-load validation."],
    usedByTemplates: ["with-circular-hang-hole"],
  }),
  definePartContract({
    id: "circular-hole-cutout",
    family: "cutouts",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo|attachToFace"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "radius", required: true }, { name: "margin" }],
    outputs: { geometryPrimitives: ["circular cutout"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Circular cutouts must remain GeometryPrimitive objects."],
    warningRules: ["Circular hole placement is reference-pending and needs overlay comparison."],
    usedByTemplates: ["generic cutout recipes"],
  }),
  definePartContract({
    id: "euro-slot-cutout",
    family: "cutouts",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo|attachToFace"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "width", required: true }, { name: "height", required: true }, { name: "crownRadius" }],
    outputs: { geometryPrimitives: ["euro slot composed from slot and crown primitives"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Euro slots must remain GeometryPrimitive objects."],
    warningRules: ["Euro slot geometry is reference-pending and needs overlay comparison."],
    usedByTemplates: ["with-hang-tab"],
  }),
  definePartContract({
    id: "window-cutout",
    family: "windows",
    implementationStatus: "reference-pending",
    requiredAnchors: ["attachTo|attachToFace"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "width", required: true }, { name: "height", required: true }, { name: "radius" }],
    outputs: { geometryPrimitives: ["window cutout shape"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Windows must remain GeometryPrimitive objects and avoid folds and glue zones."],
    warningRules: ["Window cutout geometry is reference-pending and needs film and margin validation."],
    usedByTemplates: ["carton-with-three-windows", "with-circular-hang-hole-and-window"],
  }),
  definePartContract({
    id: "relief-notch",
    family: "cutouts",
    implementationStatus: "implemented",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "width", required: true }, { name: "depth", required: true }],
    outputs: { geometryPrimitives: ["relief notch cut path"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: ["Relief notches must remain GeometryPrimitive objects."],
    warningRules: [],
    usedByTemplates: ["tuck-end-folding-carton"],
  }),
] satisfies PartContract[];

export const partContractRegistry = new Map(partContracts.map((contract) => [contract.id, contract]));

export function getPartContract(contractId: string): PartContract {
  const contract = partContractRegistry.get(contractId);
  if (!contract) {
    throw new Error(`Unknown dieline part contract: ${contractId}`);
  }
  return contract;
}

export function hasPartContract(contractId: string): boolean {
  return partContractRegistry.has(contractId);
}
