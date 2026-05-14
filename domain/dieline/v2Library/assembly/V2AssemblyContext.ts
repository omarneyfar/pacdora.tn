import type { V2Anchor, V2Face, V2PartBuildContext, V2PartResult, V2StructuralCrease } from "../contracts/types";
import { getV2FoldingBoxPart } from "../registry/partRegistry";
import type { V2AssemblyPartMetadata, V2TemplateAssembly, V2TemplateAssemblyDefinition, V2TemplatePartSpec } from "./types";

export class V2AssemblyContext implements V2PartBuildContext {
  readonly faces = new Map<string, V2Face>();
  readonly anchors = new Map<string, V2Anchor>();
  readonly structuralCreases = new Map<string, V2StructuralCrease>();
  readonly geometryPrimitives = new Map<string, V2PartResult["geometryPrimitives"][number]>();
  readonly parts: V2AssemblyPartMetadata[] = [];
  readonly warnings: string[] = [];

  private readonly entityIds = new Set<string>();

  getAnchor(anchorId: string): V2Anchor {
    const found = this.anchors.get(anchorId);
    if (!found) {
      throw new Error(`Missing V2 assembly anchor: ${anchorId}`);
    }
    return found;
  }

  getFace(faceId: string): V2Face {
    const found = this.faces.get(faceId);
    if (!found) {
      throw new Error(`Missing V2 assembly face: ${faceId}`);
    }
    return found;
  }

  addWarning(message: string): void {
    this.warnings.push(message);
  }

  addPart(spec: V2TemplatePartSpec): void {
    const entry = getV2FoldingBoxPart(spec.type);
    if (!entry.implementation) {
      throw new Error(`${spec.id}: V2 part type "${spec.type}" is ${entry.contract.implementationStatus} and has no implementation.`);
    }
    if (entry.contract.implementationStatus === "spec-only") {
      throw new Error(`${spec.id}: spec-only V2 part "${spec.type}" cannot be used in an assembly implementation.`);
    }

    const warningStart = this.warnings.length;
    const result = entry.implementation.build({
      id: spec.id,
      attachTo: spec.attachTo,
      attachToFace: spec.attachToFace,
      parameters: spec.parameters ?? {},
    }, this);
    const contextWarnings = this.warnings.slice(warningStart);
    this.addPartResult(spec, entry.label, entry.contract.id, entry.contract.implementationStatus, result, contextWarnings);
  }

  toAssembly(definition: V2TemplateAssemblyDefinition): V2TemplateAssembly {
    return {
      id: definition.id,
      label: definition.label,
      source: "v2Library/template-assembly",
      rootFaceId: definition.rootFaceId,
      parameters: definition.parameters ?? {},
      faces: [...this.faces.values()],
      structuralCreases: [...this.structuralCreases.values()],
      geometryPrimitives: [...this.geometryPrimitives.values()],
      anchors: [...this.anchors.values()],
      parts: this.parts,
      warnings: this.warnings,
    };
  }

  private addPartResult(
    spec: V2TemplatePartSpec,
    label: string,
    contractId: string,
    implementationStatus: V2AssemblyPartMetadata["implementationStatus"],
    result: V2PartResult,
    contextWarnings: string[],
  ): void {
    for (const face of result.faces) this.reserveId(face.id, spec.id);
    for (const crease of result.structuralCreases) this.reserveId(crease.id, spec.id);
    for (const primitive of result.geometryPrimitives) this.reserveId(primitive.id, spec.id);
    for (const anchor of result.anchors) this.reserveId(anchor.id, spec.id);

    for (const face of result.faces) this.faces.set(face.id, face);
    for (const crease of result.structuralCreases) this.structuralCreases.set(crease.id, crease);
    for (const primitive of result.geometryPrimitives) this.geometryPrimitives.set(primitive.id, primitive);
    for (const anchor of result.anchors) this.anchors.set(anchor.id, anchor);

    const warnings = [...contextWarnings, ...result.warnings];
    this.warnings.push(...result.warnings);
    this.parts.push({
      id: spec.id,
      type: spec.type,
      label,
      contractId,
      implementationStatus,
      productionReady: false,
      faceIds: result.faces.map((face) => face.id),
      creaseIds: result.structuralCreases.map((crease) => crease.id),
      geometryPrimitiveIds: result.geometryPrimitives.map((primitive) => primitive.id),
      anchorIds: result.anchors.map((anchor) => anchor.id),
      warnings,
    });
  }

  private reserveId(id: string, partId: string): void {
    if (this.entityIds.has(id)) {
      throw new Error(`${partId}: duplicate V2 assembly entity id "${id}".`);
    }
    this.entityIds.add(id);
  }
}
