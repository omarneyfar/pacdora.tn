import type { AnchorEdge } from "../componentEngine/types";

export type PartImplementationStatus =
  | "missing"
  | "existing-needs-review"
  | "implemented-experimental"
  | "graph-valid"
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
    id: "relieved-side-glue-tab",
    family: "glue-systems",
    implementationStatus: "missing",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:left", "anchor:right"],
    inputs: [{ name: "width", required: true }, { name: "reliefDepth" }, { name: "reliefHeight" }],
    outputs: {
      faces: ["side glue tab with relieved ends"],
      structuralCreases: ["glue tab hinge to the body panel"],
      geometryPrimitives: ["optional relief cuts and glue zone"],
      anchors: ["edge anchors for the relieved glue tab face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Glue tab width must be positive and finite.",
      "Relief cuts must remain GeometryPrimitive objects.",
      "Glue zone artwork markers must remain GeometryPrimitive objects.",
    ],
    warningRules: ["Relieved side-glue-tab is documented but not implemented in the component engine yet."],
    usedByTemplates: ["future tear-strip and relieved seam templates"],
  }),
  definePartContract({
    id: "tuck-flap",
    family: "top-closures",
    implementationStatus: "existing-needs-review",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "lipHeight" }, { name: "taper" }, { name: "scoreOffset" }],
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
      "Tuck flap base edge must equal its attach anchor.",
      "Internal lip scores remain GeometryPrimitive objects.",
    ],
    warningRules: ["Generic tuck-flap contract is compatibility-only; use reverse/straight/full-width contracts for verified recipes."],
    usedByTemplates: ["legacy v2 compatibility recipes"],
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
    id: "full-width-tuck-flap",
    family: "top-closures",
    implementationStatus: "implemented-experimental",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "cornerRadius" }, { name: "scoreOffsetFromBase" }],
    outputs: {
      faces: ["full-width tuck flap face"],
      structuralCreases: ["hinge from body panel edge to full-width tuck flap"],
      geometryPrimitives: ["internal lip score line"],
      anchors: ["edge anchors for the tuck flap face"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Base edge must equal attach anchor.",
      "Leading corner radius must be clamped to prevent self-intersection.",
      "Internal score line must remain GeometryPrimitive.",
    ],
    warningRules: ["Full-width tuck flap is graph-valid experimentally but still needs reference overlay testing."],
    usedByTemplates: ["tuck-end-folding-carton", "with-circular-hang-hole", "with-hang-tab"],
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
    usedByTemplates: ["legacy centered-tuck experiments only"],
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
    usedByTemplates: ["legacy tuck-end experiments only"],
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
    usedByTemplates: ["reverseTuckEnd", "straightTuckEnd"],
  }),
  definePartContract({
    id: "trapezoid-top-dust-flap",
    family: "dust-flaps",
    implementationStatus: "implemented-experimental",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top"],
    inputs: [{ name: "height", required: true }, { name: "taper" }],
    outputs: {
      faces: ["top trapezoid dust flap face"],
      structuralCreases: ["hinge from top side edge to dust flap"],
      anchors: ["edge anchors for the dust flap"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: [
      "Base edge must equal top attach anchor.",
      "Taper must not collapse the leading edge.",
    ],
    warningRules: ["Trapezoid top dust flap is experimental and needs visual comparison."],
    usedByTemplates: [
      "tuck-end-folding-carton",
      "centered-tuck-end-carton",
      "with-locking-tab-on-top-and-bottom",
      "with-circular-hang-hole",
      "with-hang-tab",
    ],
  }),
  definePartContract({
    id: "angled-bottom-dust-flap",
    family: "dust-flaps",
    implementationStatus: "implemented-experimental",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:bottom"],
    inputs: [{ name: "height", required: true }, { name: "startInset" }, { name: "endInset" }],
    outputs: {
      faces: ["bottom angled dust flap face"],
      structuralCreases: ["hinge from bottom side edge to dust flap"],
      anchors: ["edge anchors for the dust flap"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: false,
    createsAnchors: true,
    validationRules: [
      "Base edge must equal bottom attach anchor.",
      "Angled leading edge must not self-intersect.",
    ],
    warningRules: ["Angled bottom dust flap is experimental and needs bottom closure comparison."],
    usedByTemplates: [
      "tuck-end-folding-carton",
      "centered-tuck-end-carton",
      "with-locking-tab-on-top-and-bottom",
      "with-circular-hang-hole",
      "with-hang-tab",
      "snap-lock-bottom templates",
    ],
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
    usedByTemplates: ["legacy tuck-end experiments only"],
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
    usedByTemplates: ["legacy locking-tab experiments only"],
  }),
  definePartContract({
    id: "locking-lip-flap",
    family: "locking-closures",
    implementationStatus: "implemented-experimental",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:top", "anchor:bottom"],
    inputs: [{ name: "bodyDepth", required: true }, { name: "tabDepth", required: true }, { name: "tabWidth" }],
    outputs: {
      faces: ["locking lip flap face with integrated tab"],
      structuralCreases: ["hinge from parent panel edge to locking lip flap"],
      geometryPrimitives: ["geometry-only tab shoulder score"],
      anchors: ["edge anchors for the locking lip flap"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Base edge must equal attach anchor.",
      "Tab score must remain GeometryPrimitive.",
      "Lock slot remains a separate geometry-only part.",
    ],
    warningRules: ["Locking lip flap is graph-valid experimentally but slot fit is reference-pending."],
    usedByTemplates: ["centered-tuck-end-carton", "with-locking-tab-on-top-and-bottom"],
  }),
  definePartContract({
    id: "bottom-lock-flap",
    family: "bottom-closures",
    implementationStatus: "implemented-experimental",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:bottom"],
    inputs: [{ name: "bodyDepth", required: true }, { name: "tabDepth" }, { name: "tongueWidth" }],
    outputs: {
      faces: ["bottom lock flap with center tongue"],
      structuralCreases: ["hinge from bottom body edge to lock flap"],
      geometryPrimitives: ["geometry-only tongue shoulder score"],
      anchors: ["edge anchors for the bottom lock flap"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Base edge must equal bottom attach anchor.",
      "Tongue score must remain GeometryPrimitive.",
      "Receiving lock slot must remain GeometryPrimitive.",
    ],
    warningRules: ["Bottom lock flap is experimental and needs snap-lock fit verification."],
    usedByTemplates: ["tuck-end-folding-carton", "centered-tuck-end-carton", "snap-lock-bottom templates"],
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
    usedByTemplates: ["legacy rounded-slot experiments"],
  }),
  definePartContract({
    id: "lock-slot",
    family: "cutouts",
    implementationStatus: "implemented-experimental",
    requiredAnchors: ["attachTo|attachToFace"],
    allowedAttachTargets: ["face", "anchor:any"],
    inputs: [{ name: "width", required: true }, { name: "height", required: true }, { name: "margin" }],
    outputs: { geometryPrimitives: ["lock receiving slot"] },
    createsFaces: false,
    createsStructuralCreases: false,
    createsGeometryPrimitives: true,
    createsAnchors: false,
    validationRules: [
      "Lock slots must remain GeometryPrimitive objects.",
      "Lock slots must not overlap structural creases or glue zones.",
    ],
    warningRules: ["Lock-slot dimensions are graph-valid experimentally but need tab clearance verification."],
    usedByTemplates: ["tuck-end-folding-carton", "with-locking-tab-on-top-and-bottom", "snap-lock-bottom templates"],
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
  definePartContract({
    id: "snap-lock-bottom-panel",
    family: "bottom-closures",
    implementationStatus: "missing",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:bottom"],
    inputs: [{ name: "DFW" }, { name: "tabWidth" }, { name: "slotWidth" }],
    outputs: {
      faces: ["snap-lock major/minor bottom flaps"],
      structuralCreases: ["face-to-face hinges from body panels to bottom flaps"],
      geometryPrimitives: ["geometry-only receiving slot"],
      anchors: ["bottom flap anchors"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Snap lock slots must remain GeometryPrimitive objects.",
      "All bottom flap hinges must be real face-to-face creases.",
    ],
    warningRules: ["Snap-lock bottom panel is documented but not implemented yet."],
    usedByTemplates: ["snapLockBottom", "tuck-end-folding-carton", "centered-tuck-end-carton"],
  }),
  definePartContract({
    id: "auto-lock-bottom-panel",
    family: "bottom-closures",
    implementationStatus: "missing",
    requiredAnchors: ["attachTo"],
    allowedAttachTargets: ["anchor:bottom"],
    inputs: [{ name: "DFW" }, { name: "GFW" }, { name: "overlap" }],
    outputs: {
      faces: ["auto-lock major/minor bottom flaps and glue panel"],
      structuralCreases: ["face-to-face bottom flap hinges"],
      geometryPrimitives: ["diagonal score lines and glue zones"],
      anchors: ["bottom flap anchors"],
    },
    createsFaces: true,
    createsStructuralCreases: true,
    createsGeometryPrimitives: true,
    createsAnchors: true,
    validationRules: [
      "Diagonal auto-lock score lines must remain GeometryPrimitive objects.",
      "Only body-to-flap hinges become DielineCrease.",
    ],
    warningRules: ["Auto-lock bottom panel is documented but not implemented yet."],
    usedByTemplates: ["autoLockBottom", "auto-lock-bottom-carton-with-tab-closure"],
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
