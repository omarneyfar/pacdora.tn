"use client";

import { memo, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/* ── Props ─────────────────────────────────────────────────────── */

type CollapsibleSectionProps = {
  children: ReactNode;
  className?: string;
  eyebrow: string;
  isOpen: boolean;
  title: string;
  trailing?: string;
  onToggle: () => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Accordion-style panel section with an eyebrow label, title, trailing badge, and toggle.
 * Used in the builder sidebar for Dimensions, Library, and Dieline sections.
 */
export const CollapsibleSection = memo(function CollapsibleSection({
  children,
  className,
  eyebrow,
  isOpen,
  title,
  trailing,
  onToggle,
}: CollapsibleSectionProps) {
  return (
    <section
      className={`panel-section collapsible-section ${className ?? ""} ${isOpen ? "" : "is-collapsed"}`}
    >
      <button
        aria-expanded={isOpen}
        className="collapsible-heading"
        type="button"
        onClick={onToggle}
      >
        <span className="collapsible-title">
          <span className="eyebrow">{eyebrow}</span>
          <strong>{title}</strong>
        </span>
        <span className="collapsible-meta">
          {trailing ? <span className="count-badge">{trailing}</span> : null}
          {isOpen ? (
            <ChevronDown aria-hidden size={18} />
          ) : (
            <ChevronRight aria-hidden size={18} />
          )}
        </span>
      </button>

      {isOpen ? <div className="collapsible-body">{children}</div> : null}
    </section>
  );
});
