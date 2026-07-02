"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { rejectAgentAction } from "@/app/admin/agents/actions";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const REASON_MAX = 500;

interface Props {
  agentId: string;
  agentName: string;
  agency: string | null;
  dict: Dictionary;
}

// Reject confirmation dialog. Native <dialog> (showModal) gives the focus trap,
// Esc-to-close and inert background for free; the styling/animation lives in
// globals.css (.reject-dialog*). The reason is required here AND re-checked
// server-side in rejectAgentAction (the HTML gate is bypassable, the action
// throw is the real one).
export function RejectAgentDialog({ agentId, agentName, agency, dict }: Props) {
  const t = dict.admin;
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    setReason("");
    ref.current?.showModal();
  }

  function close() {
    if (!pending) ref.current?.close();
  }

  // Click on the backdrop = click whose target is the <dialog> element itself
  // (the panel is a child div, clicks inside it never match).
  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) close();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const fd = new FormData();
    fd.set("agentId", agentId);
    fd.set("reason", reason);
    startTransition(async () => {
      try {
        await rejectAgentAction(fd);
        ref.current?.close();
        // revalidatePath in the action already invalidated the queue;
        // refresh re-renders it so the row disappears immediately.
        router.refresh();
      } catch {
        setError(t.rejectFailed);
      }
    });
  }

  return (
    <>
      <button type="button" className="btn btn-sm btn-reject" onClick={open}>
        {t.reject}
      </button>

      <dialog
        ref={ref}
        className="reject-dialog"
        aria-labelledby={`reject-title-${agentId}`}
        onClick={onBackdropClick}
        onCancel={(e) => {
          // Esc while the rejection is in flight: keep the dialog up so the
          // admin sees the outcome instead of a silently vanishing modal.
          if (pending) e.preventDefault();
        }}
      >
        <form onSubmit={onSubmit} className="reject-dialog-panel">
          <span className="reject-dialog-badge" aria-hidden="true">
            <Icon name="x" size={20} strokeWidth={2.2} />
          </span>

          <h2 id={`reject-title-${agentId}`} className="reject-dialog-title">
            {format(t.rejectDialogTitle, { name: agentName })}
          </h2>
          {agency ? <p className="reject-dialog-agency">{agency}</p> : null}
          <p className="reject-dialog-body">{t.rejectDialogBody}</p>

          <div className="field">
            <label className="label" htmlFor={`reject-reason-${agentId}`}>
              {t.rejectionReason}
            </label>
            <textarea
              id={`reject-reason-${agentId}`}
              className="input reject-dialog-reason"
              rows={3}
              required
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.rejectReasonPlaceholder}
              // eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog
              // exists only for this field; focusing it is the expected flow.
              autoFocus
            />
            <div className="reject-dialog-count" aria-hidden="true">
              {reason.length}/{REASON_MAX}
            </div>
          </div>

          {error ? (
            <div className="auth-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="reject-dialog-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={close}
              disabled={pending}
            >
              {t.rejectCancel}
            </button>
            <button
              type="submit"
              className="btn reject-dialog-confirm"
              disabled={pending || reason.trim().length === 0}
            >
              {pending ? t.rejecting : t.rejectConfirm}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
