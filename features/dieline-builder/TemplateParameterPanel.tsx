"use client";

import { getParameterSpecsByGroup, type RegisteredDielineTemplate } from "@/domain/dieline/templateRegistry";
import type { ParameterSpec, ParameterValueMap } from "@/domain/dieline/types";

export type BuilderUnitMode = "mm" | "in" | "in64";

type TemplateParameterPanelProps = {
  template: RegisteredDielineTemplate;
  unitMode: BuilderUnitMode;
  values: ParameterValueMap;
  onChange: (spec: ParameterSpec, value: string | number | boolean) => void;
  onUnitModeChange: (unitMode: BuilderUnitMode) => void;
};

export function TemplateParameterPanel({
  onChange,
  onUnitModeChange,
  template,
  unitMode,
  values,
}: TemplateParameterPanelProps) {
  const groups = getParameterSpecsByGroup(template);
  const primaryGroups = groups.filter((group) => group.id !== "advanced-closure");
  const advancedGroups = groups.filter((group) => group.id === "advanced-closure");
  const closureMode = values.closureMode === "manual" ? "manual" : "auto";
  const advancedDisabled = closureMode !== "manual";

  return (
    <aside className="template-builder-parameters" aria-label="Template parameters">
      <div className="template-parameter-title">
        <span className="eyebrow">Template</span>
        <h2>{template.label}</h2>
      </div>

      <div className="template-unit-toggle" aria-label="Dimension unit">
        {(["mm", "in", "in64"] as const).map((mode) => (
          <button className={unitMode === mode ? "is-active" : ""} key={mode} type="button" onClick={() => onUnitModeChange(mode)}>
            {mode === "in64" ? "1/64 in" : mode}
          </button>
        ))}
      </div>

      <div className="template-parameter-layout">
        <div className="template-parameter-basic-stack">
          {primaryGroups.map((group) => (
            <TemplateParameterGroup
              disabled={false}
              group={group}
              key={group.id}
              onChange={onChange}
              unitMode={unitMode}
              values={values}
            />
          ))}
        </div>

        <div className={`template-parameter-advanced-stack${advancedDisabled ? " is-disabled" : ""}`}>
          <div className="template-advanced-note">
            <strong>{advancedDisabled ? "Auto closure" : "Manual closure"}</strong>
            <span>{advancedDisabled ? "Derived from length and width." : "Advanced values are editable."}</span>
          </div>
          {advancedGroups.map((group) => (
            <TemplateParameterGroup
              disabled={advancedDisabled}
              group={group}
              key={group.id}
              onChange={onChange}
              unitMode={unitMode}
              values={values}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function TemplateParameterGroup({
  disabled,
  group,
  onChange,
  unitMode,
  values,
}: {
  disabled: boolean;
  group: ReturnType<typeof getParameterSpecsByGroup>[number];
  onChange: (spec: ParameterSpec, value: string | number | boolean) => void;
  unitMode: BuilderUnitMode;
  values: ParameterValueMap;
}) {
  return (
    <section className="template-parameter-group">
      <div className="template-parameter-group-heading">
        <h3>{group.label}</h3>
        {group.description ? <p>{group.description}</p> : null}
      </div>
      <div className={`template-parameter-controls template-parameter-columns-${group.columns ?? 2}`}>
        {group.specs.map((spec) => (
          <TemplateParameterControl
            disabled={disabled}
            key={spec.id}
            spec={spec}
            unitMode={unitMode}
            value={values[spec.id] ?? spec.defaultValue}
            onChange={onChange}
          />
        ))}
      </div>
    </section>
  );
}

function TemplateParameterControl({
  disabled = false,
  onChange,
  spec,
  unitMode,
  value,
}: {
  disabled?: boolean;
  onChange: (spec: ParameterSpec, value: string | number | boolean) => void;
  spec: ParameterSpec;
  unitMode: BuilderUnitMode;
  value: string | number | boolean;
}) {
  if (spec.input === "boolean") {
    return (
      <label className="template-builder-control template-builder-control-checkbox" aria-disabled={disabled}>
        <span>{spec.label}</span>
        <input checked={Boolean(value)} disabled={disabled} type="checkbox" onChange={(event) => onChange(spec, event.currentTarget.checked)} />
      </label>
    );
  }

  if (spec.input === "select") {
    return (
      <label className="template-builder-control" aria-disabled={disabled}>
        <span>{spec.label}</span>
        <select
          disabled={disabled}
          value={String(value)}
          onChange={(event) => onChange(spec, coerceSelectValue(spec, event.currentTarget.value))}
        >
          {(spec.options ?? []).map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const displayValue = toDisplayNumber(value, spec, unitMode);
  const unitLabel = spec.unit === "mm" ? getDisplayUnitLabel(unitMode) : spec.unit;

  return (
    <label className="template-builder-control" aria-disabled={disabled}>
      <span>{spec.label}</span>
      <input
        disabled={disabled}
        min={getDisplayLimit(spec.min, spec, unitMode)}
        max={getDisplayLimit(spec.max, spec, unitMode)}
        step={getDisplayStep(spec.step, spec, unitMode)}
        type="number"
        value={displayValue}
        onChange={(event) => onChange(spec, fromDisplayNumber(event.currentTarget.value, spec, unitMode))}
      />
      {unitLabel ? <em>{unitLabel}</em> : null}
    </label>
  );
}

function coerceSelectValue(spec: ParameterSpec, rawValue: string): string | number | boolean {
  const option = spec.options?.find((candidate) => String(candidate.value) === rawValue);
  return option ? option.value : rawValue;
}

function toDisplayNumber(value: string | number | boolean, spec: ParameterSpec, unitMode: BuilderUnitMode): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (spec.unit !== "mm") return numeric;
  if (unitMode === "in") return round(numeric / 25.4, 4);
  if (unitMode === "in64") return Math.round((numeric / 25.4) * 64);
  return numeric;
}

function fromDisplayNumber(rawValue: string, spec: ParameterSpec, unitMode: BuilderUnitMode): number {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return Number(spec.defaultValue) || 0;
  if (spec.unit !== "mm") return numeric;
  if (unitMode === "in") return round(numeric * 25.4, 3);
  if (unitMode === "in64") return round((numeric / 64) * 25.4, 3);
  return numeric;
}

function getDisplayLimit(value: number | undefined, spec: ParameterSpec, unitMode: BuilderUnitMode): number | undefined {
  if (typeof value !== "number") return undefined;
  return toDisplayNumber(value, spec, unitMode);
}

function getDisplayStep(value: number | undefined, spec: ParameterSpec, unitMode: BuilderUnitMode): number {
  if (spec.unit !== "mm") return value ?? 1;
  if (unitMode === "in") return 0.01;
  if (unitMode === "in64") return 1;
  return value ?? 1;
}

function getDisplayUnitLabel(unitMode: BuilderUnitMode): string {
  if (unitMode === "in") return "in";
  if (unitMode === "in64") return "1/64 in";
  return "mm";
}

function round(value: number, precision: number): number {
  const scale = 10 ** precision;
  return Math.round(value * scale) / scale;
}
