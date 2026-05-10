"use client";

import { memo } from "react";

import type { ProjectStatus } from "@/domain/packaging";

/* ── Props ─────────────────────────────────────────────────────── */

type StatusControlProps = {
  disabled: boolean;
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
};

/* ── Constants ─────────────────────────────────────────────────── */

const STATUSES: ProjectStatus[] = ["draft", "published"];

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  published: "Published",
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Segmented toggle between Draft and Published status.
 * Memoized — only re-renders when `disabled` or `value` change.
 */
export const StatusControl = memo(function StatusControl({
  disabled,
  value,
  onChange,
}: StatusControlProps) {
  return (
    <div className="status-control" aria-label="Project status">
      {STATUSES.map((status) => (
        <button
          aria-pressed={value === status}
          className={
            value === status ? `is-active status-${status}` : ""
          }
          disabled={disabled}
          key={status}
          type="button"
          onClick={() => onChange(status)}
        >
          {STATUS_LABELS[status]}
        </button>
      ))}
    </div>
  );
});
