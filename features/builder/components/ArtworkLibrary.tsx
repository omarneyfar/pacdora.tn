"use client";

/* eslint-disable @next/next/no-img-element */

import { memo } from "react";

import type { ArtworkSource } from "@/store/artworkSlice";

/* ── Props ─────────────────────────────────────────────────────── */

type ArtworkLibraryProps = {
  selectedSourceId: string;
  sources: ArtworkSource[];
  onSelect: (sourceId: string) => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * Thumbnail grid of uploaded artwork sources.
 * Click a source to select it for reuse across faces.
 */
export const ArtworkLibrary = memo(function ArtworkLibrary({
  selectedSourceId,
  sources,
  onSelect,
}: ArtworkLibraryProps) {
  if (sources.length === 0) {
    return (
      <p className="empty-library">
        Uploaded images will appear here and can be reused on other sides.
      </p>
    );
  }

  return (
    <div className="artwork-library">
      {sources.map((source) => (
        <button
          className={`artwork-thumb ${selectedSourceId === source.id ? "is-selected" : ""}`}
          key={source.id}
          title={source.fileName}
          type="button"
          onClick={() => onSelect(source.id)}
        >
          <img alt="" src={source.dataUrl} />
          <span>{source.fileName}</span>
        </button>
      ))}
    </div>
  );
});
