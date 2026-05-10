"use client";

import { useAppDispatch, useAppSelector } from "@/store";
import { closeConfirmDialog } from "@/store/uiSlice";

/* ── Props ─────────────────────────────────────────────────────── */

type ConfirmDialogProps = {
  /** Called when the user clicks "Confirm". */
  onConfirm: () => void;
};

/* ── Component ─────────────────────────────────────────────────── */

/**
 * App-wide confirmation dialog — replaces native `window.confirm()`.
 * Reads its visibility, title, and message from the Redux `ui` slice.
 *
 * Usage pattern:
 * 1. Store the pending action in local state or a ref.
 * 2. Dispatch `openConfirmDialog({ title, message })`.
 * 3. On confirm, execute the pending action and dispatch `closeConfirmDialog()`.
 */
export function ConfirmDialog({ onConfirm }: ConfirmDialogProps) {
  const dispatch = useAppDispatch();
  const dialog = useAppSelector((s) => s.ui.confirmDialog);

  if (!dialog) return null;

  function handleConfirm() {
    dispatch(closeConfirmDialog());
    onConfirm();
  }

  function handleCancel() {
    dispatch(closeConfirmDialog());
  }

  return (
    <div className="crop-overlay" role="dialog" aria-modal="true" aria-label={dialog.title}>
      <div className="confirm-dialog">
        <h3>{dialog.title}</h3>
        <p>{dialog.message}</p>
        <div className="confirm-dialog-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="primary-button danger-button"
            type="button"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
