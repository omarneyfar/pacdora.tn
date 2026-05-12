export const PARAMETER_KEY_ALIASES: Record<string, string> = {
  length: "L",
  width: "W",
  depth: "W",
  height: "H",
  topFlapHeight: "TFW",
  tuckFlapHeight: "TFW",
  topFlapRadius: "TFR",
  glueFlapWidth: "GFW",
  dustFlapHeight: "DFW",
  materialThickness: "materialThickness",
  bleed: "bleeds",
  bleeds: "bleeds",
  outputSizeMode: "outputSizeMode",
  closureMode: "closureMode",
};

export function toGeneratorParameterKey(catalogKey: string): string {
  return PARAMETER_KEY_ALIASES[catalogKey] ?? catalogKey;
}

export function toCatalogParameterKey(generatorKey: string): string {
  const match = Object.entries(PARAMETER_KEY_ALIASES).find(([, mapped]) => mapped === generatorKey);
  return match?.[0] ?? generatorKey;
}
