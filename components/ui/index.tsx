"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className = "", variant = "secondary", ...props }: ButtonProps) {
  return <button className={`ui-button ui-button-${variant} ${className}`.trim()} type="button" {...props} />;
}

export function IconButton({ className = "", ...props }: ButtonProps) {
  return <Button className={`ui-icon-button ${className}`.trim()} variant="ghost" {...props} />;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange(value: T): void;
}) {
  return (
    <div className="ui-segmented-control">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className={option.value === value ? "is-active" : ""}
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ToggleRow({
  checked,
  children,
  onChange,
}: {
  checked: boolean;
  children: ReactNode;
  onChange(checked: boolean): void;
}) {
  return (
    <label className="ui-toggle-row">
      <span>{children}</span>
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

export function PanelSection({ children, title }: { children: ReactNode; title: ReactNode }) {
  return (
    <section className="ui-panel-section">
      <div className="ui-panel-section-title">{title}</div>
      {children}
    </section>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "draft" | "published" }) {
  return <span className={`ui-status-badge ui-status-badge-${tone}`}>{children}</span>;
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="ui-toolbar">{children}</div>;
}

export function InlineTextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-inline-input ${props.className ?? ""}`.trim()} {...props} />;
}
