import type {
  DielineCategory,
  DielineGraph,
  DielineGraphMetadata,
  DielinePart,
  DielinePartRole,
} from "./types";

export const DIELINE_CATEGORY_ORDER: DielineCategory[] = [
  "folding-box",
  "mailer-box",
  "sleeve",
  "shipping-box",
  "display-box",
  "tray-and-sleeve",
  "tray-and-cover",
  "insert",
  "divider",
  "bottle-carrier",
  "envelope",
  "cake-box",
  "pillow-box",
  "secure-box",
  "sticker",
  "custom",
];

export const DIELINE_CATEGORY_LABELS: Record<DielineCategory, string> = {
  "folding-box": "Folding Box",
  "mailer-box": "Mailer Box",
  sleeve: "Sleeve",
  "shipping-box": "Shipping Box",
  "display-box": "Display Box",
  sticker: "Sticker",
  "secure-box": "Secure Box",
  insert: "Insert",
  "tray-and-sleeve": "Tray and Sleeve",
  "tray-and-cover": "Tray and Cover",
  "bottle-carrier": "Bottle Carrier",
  envelope: "Envelope",
  divider: "Divider",
  "cake-box": "Cake Box",
  "pillow-box": "Pillow Box",
  custom: "Custom",
};

const PART_ROLE_LABELS: Record<DielinePartRole, string> = {
  body: "Body",
  panel: "Panel",
  closure: "Closure",
  "top-closure": "Top closure",
  "bottom-closure": "Bottom closure",
  lid: "Lid",
  base: "Base",
  wall: "Wall",
  "dust-flap": "Dust flap",
  "tuck-flap": "Tuck flap",
  "seal-flap": "Seal flap",
  "bottom-flap": "Bottom flap",
  "glue-flap": "Glue flap",
  lock: "Lock",
  insert: "Insert",
  divider: "Divider",
  handle: "Handle",
  window: "Window",
  "tear-strip": "Tear strip",
  unknown: "Part",
};

const TEMPLATE_CATEGORY_HINTS: Record<string, DielineCategory> = {
  "folding-carton": "folding-box",
  "straight-tuck-end": "folding-box",
  "reverse-tuck-end": "folding-box",
  "full-seal-end": "folding-box",
  "mailer-box": "mailer-box",
  sleeve: "sleeve",
  "tray-with-lid": "tray-and-cover",
  "sticker-rectangle": "sticker",
  "sticker-rounded": "sticker",
  "sticker-oval": "sticker",
};

const TEMPLATE_FAMILY_LABELS: Record<string, string> = {
  "folding-carton": "Folding Carton",
  "straight-tuck-end": "Straight Tuck End",
  "reverse-tuck-end": "Reverse Tuck End",
  "full-seal-end": "Full Seal End",
  "mailer-box": "Mailer Box",
  sleeve: "Standard Sleeve",
  "tray-with-lid": "Tray with Lid",
  "sticker-rectangle": "Rectangular Sticker/Label",
  "sticker-rounded": "Well-rounded Sticker/Label",
  "sticker-oval": "Oval Sticker",
};

export function getDielineCategory(graph: DielineGraph): DielineCategory {
  if (graph.metadata?.category) {
    return graph.metadata.category;
  }

  if (graph.source?.type === "template") {
    return TEMPLATE_CATEGORY_HINTS[graph.source.templateId] ?? "custom";
  }

  return "custom";
}

export function getDielineCategoryLabel(category: DielineCategory | undefined): string {
  return category ? DIELINE_CATEGORY_LABELS[category] : DIELINE_CATEGORY_LABELS.custom;
}

export function getDielineFamilyLabel(graph: DielineGraph): string {
  if (graph.metadata?.familyLabel) {
    return graph.metadata.familyLabel;
  }

  if (graph.source?.type === "template") {
    return TEMPLATE_FAMILY_LABELS[graph.source.templateId] ?? graph.source.templateId;
  }

  return "Custom dieline";
}

export function getDielineParts(graph: DielineGraph): DielinePart[] {
  if (graph.metadata?.parts.length) {
    return graph.metadata.parts;
  }

  return createFallbackParts(graph);
}

export function createDimensionParameters(width: number, height: number, depth: number) {
  return [
    { id: "length", label: "Length", kind: "dimension" as const, value: width, unit: "mm" },
    { id: "width", label: "Width", kind: "dimension" as const, value: depth, unit: "mm" },
    { id: "height", label: "Height", kind: "dimension" as const, value: height, unit: "mm" },
  ];
}

export function createFlatSizeParameters(length: number, width: number) {
  return [
    { id: "length", label: "Length", kind: "dimension" as const, value: length, unit: "mm" },
    { id: "width", label: "Width", kind: "dimension" as const, value: width, unit: "mm" },
  ];
}

export function createTemplateMetadata(metadata: DielineGraphMetadata): DielineGraphMetadata {
  return metadata;
}

export function getDielineStructureSummary(graph: DielineGraph): string {
  const category = getDielineCategoryLabel(getDielineCategory(graph));
  const family = getDielineFamilyLabel(graph);
  const parts = getDielineParts(graph).length;
  return `${category} / ${family} / ${parts} parts`;
}

function createFallbackParts(graph: DielineGraph): DielinePart[] {
  const roles: Array<{ id: string; role: DielinePartRole; label: string; faceIds: string[] }> = [
    {
      id: "panels",
      role: "panel",
      label: PART_ROLE_LABELS.panel,
      faceIds: graph.faces.filter((face) => face.role === "panel").map((face) => face.id),
    },
    {
      id: "flaps",
      role: "closure",
      label: "Flaps",
      faceIds: graph.faces.filter((face) => face.role === "flap").map((face) => face.id),
    },
    {
      id: "glue",
      role: "glue-flap",
      label: "Glue",
      faceIds: graph.faces.filter((face) => face.role === "glue").map((face) => face.id),
    },
    {
      id: "unknown",
      role: "unknown",
      label: "Unclassified",
      faceIds: graph.faces.filter((face) => face.role === "unknown").map((face) => face.id),
    },
  ];

  return roles
    .filter((part) => part.faceIds.length > 0)
    .map((part) => ({
      id: part.id,
      label: part.label,
      role: part.role,
      faceIds: part.faceIds,
    }));
}
