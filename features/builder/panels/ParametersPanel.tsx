"use client";

import { useCallback, useMemo } from "react";

import type { CartonDimensions } from "@/domain/packaging";
import { generateReverseTuckEnd } from "@/domain/dieline/templates/reverseTuckEnd";
import type { ParameterSpec, ParameterValueMap } from "@/domain/dieline/types";
import { useAppDispatch, useAppSelector } from "@/store";
import { markChanged, setDielineGraph, setDimensions } from "@/store/builderSlice";
import { setSelectedSourceId } from "@/store/artworkSlice";
import { clearShareUrl, toggleSection } from "@/store/uiSlice";

import { ArtworkLibrary } from "../components/ArtworkLibrary";
import { CollapsibleSection } from "../components/CollapsibleSection";
import { DimensionControls } from "../components/DimensionControls";

export function ParametersPanel() {
  const dispatch = useAppDispatch();

  const dimensions = useAppSelector((s) => s.builder.dimensions);
  const dielineGraph = useAppSelector((s) => s.builder.dielineGraph);
  const isRecropping = useAppSelector((s) => s.artwork.isRecropping);
  const sources = useAppSelector((s) => s.artwork.sources);
  const selectedSourceId = useAppSelector((s) => s.artwork.selectedSourceId);
  const openSections = useAppSelector((s) => s.ui.openSections);
  const parameterSpecs = dielineGraph?.metadata?.parameterSpecs ?? [];
  const parameterValues = useMemo(
    () => dielineGraph?.metadata?.parameterValues ?? {},
    [dielineGraph?.metadata?.parameterValues],
  );

  const handleDimensionChange = useCallback(
    (key: keyof CartonDimensions, value: string) => {
      dispatch(clearShareUrl());
      dispatch(markChanged());
      dispatch(
        setDimensions({
          ...dimensions,
          [key]: Number(value),
        } as CartonDimensions),
      );
    },
    [dimensions, dispatch],
  );

  const handleSourceSelect = useCallback(
    (sourceId: string) => {
      dispatch(markChanged({ forceDraft: false }));
      dispatch(setSelectedSourceId(sourceId));
    },
    [dispatch],
  );

  const handleTemplateParameterChange = useCallback(
    (spec: ParameterSpec, rawValue: string | boolean) => {
      if (!dielineGraph?.metadata) return;

      const nextValue = spec.input === "boolean"
        ? Boolean(rawValue)
        : typeof spec.defaultValue === "number"
          ? Number(rawValue)
          : rawValue;
      const nextValues: ParameterValueMap = {
        ...parameterValues,
        [spec.id]: nextValue,
      };

      if (dielineGraph.metadata.family === "reverse-tuck-end") {
        dispatch(clearShareUrl());
        dispatch(setDielineGraph(generateReverseTuckEnd(nextValues)));
        dispatch(markChanged());
      }
    },
    [dielineGraph, dispatch, parameterValues],
  );

  return (
    <>
      <div className="parameters-title">
        <div>
          <span className="eyebrow">Parameters</span>
          <h2>Box setup</h2>
        </div>
        {isRecropping ? <span className="count-badge">Updating</span> : null}
      </div>

      <CollapsibleSection
        className="dimension-section"
        eyebrow="Box size"
        isOpen={openSections.dimensions}
        title="Pizza carton dimensions"
        trailing={`${dimensions.width} x ${dimensions.depth} x ${dimensions.height}`}
        onToggle={() => dispatch(toggleSection("dimensions"))}
      >
        <DimensionControls dimensions={dimensions} onChange={handleDimensionChange} />
      </CollapsibleSection>

      {parameterSpecs.length > 0 ? (
        <CollapsibleSection
          className="dimension-section"
          eyebrow="Template parameters"
          isOpen={openSections.templateParameters}
          title={dielineGraph?.metadata?.familyLabel ?? "Dieline parameters"}
          trailing={`${parameterSpecs.length} controls`}
          onToggle={() => dispatch(toggleSection("templateParameters"))}
        >
          <div className="dimension-grid template-parameter-grid">
            {parameterSpecs.map((spec) => (
              <TemplateParameterControl
                key={spec.id}
                spec={spec}
                value={parameterValues[spec.id] ?? spec.defaultValue}
                onChange={handleTemplateParameterChange}
              />
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        className="library-section"
        eyebrow="Artwork library"
        isOpen={openSections.library}
        title="Uploaded images"
        trailing={String(sources.length)}
        onToggle={() => dispatch(toggleSection("library"))}
      >
        <ArtworkLibrary
          selectedSourceId={selectedSourceId}
          sources={sources}
          onSelect={handleSourceSelect}
        />
      </CollapsibleSection>
    </>
  );
}

function TemplateParameterControl({
  onChange,
  spec,
  value,
}: {
  onChange: (spec: ParameterSpec, value: string | boolean) => void;
  spec: ParameterSpec;
  value: string | number | boolean;
}) {
  if (spec.input === "boolean") {
    return (
      <label className="dimension-control template-parameter-control">
        <span>{spec.label}</span>
        <input
          checked={Boolean(value)}
          type="checkbox"
          onChange={(event) => onChange(spec, event.currentTarget.checked)}
        />
      </label>
    );
  }

  if (spec.input === "select") {
    return (
      <label className="dimension-control template-parameter-control">
        <span>{spec.label}</span>
        <select value={String(value)} onChange={(event) => onChange(spec, event.currentTarget.value)}>
          {(spec.options ?? []).map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="dimension-control template-parameter-control">
      <span>{spec.label}</span>
      <input
        min={spec.min}
        max={spec.max}
        step={spec.step ?? 1}
        type="number"
        value={typeof value === "number" ? value : Number(value) || 0}
        onChange={(event) => onChange(spec, event.currentTarget.value)}
      />
      {spec.unit ? <em>{spec.unit}</em> : null}
    </label>
  );
}
