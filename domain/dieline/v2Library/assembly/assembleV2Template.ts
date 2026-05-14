import { V2AssemblyContext } from "./V2AssemblyContext";
import { assertValidV2Assembly } from "./validateV2Assembly";
import type { V2TemplateAssembly, V2TemplateAssemblyDefinition } from "./types";

export function assembleV2Template(definition: V2TemplateAssemblyDefinition): V2TemplateAssembly {
  const context = new V2AssemblyContext();

  for (const part of definition.parts) {
    context.addPart(part);
  }

  const assembly = context.toAssembly(definition);
  assertValidV2Assembly(assembly);
  return assembly;
}
