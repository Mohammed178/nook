"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/nook/icon";
import { approveUniversityAction } from "@/app/admin/agents/actions";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

const NOTE_MAX = 500;

interface Props {
  agentId: string;
  universityName: string;
  dict: Dictionary;
}

// Approve-with-a-receipt dialog for a university application (migration 0036).
// Clone of RejectAgentDialog: native <dialog> (focus trap, Esc, inert backdrop)
// with a REQUIRED outreach-note textarea. The note is the audit trail of the
// switchboard verification call ("Spoke to Puan Ainun, UM Housing Unit, via
// +60 3-7967 ···· on 15 Jul 2026"); required here AND re-checked server-side in
// approveUniversityAction/decide (the HTML gate is bypassable).
export function ApproveUniversityDialog({ agentId, universityName, dict }: Props) {
  const t = dict.admin;
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setError(null);
    setNote("");
    ref.current?.showModal();
  }

  function close() {
    if (!pending) ref.current?.close();
  }

  function onBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) close();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const fd = new FormData();
    fd.set("agentId", agentId);
    fd.set("note", note);
    startTransition(async () => {
      try {
        await approveUniversityAction(fd);
        ref.current?.close();
        router.refresh();
      } catch {
        setError(t.approveUniFailed);
      }
    });
  }

  return (
    <>
      <button type="button" className="btn btn-sm btn-approve" onClick={open}>
        {t.approve}
      </button>

      <dialog
        ref={ref}
        className="reject-dialog"
        aria-labelledby={`approve-title-${agentId}`}
        onClick={onBackdropClick}
        onCancel={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <form onSubmit={onSubmit} className="reject-dialog-panel">
          <span className="reject-dialog-badge reject-dialog-badge-ok" aria-hidden="true">
            <Icon name="check" size={20} strokeWidth={2.2} />
          </span>

          <h2 id={`approve-title-${agentId}`} className="reject-dialog-title">
            {format(t.approveUniDialogTitle, { name: universityName })}
          </h2>
          <p className="reject-dialog-body">{t.approveUniDialogBody}</p>

          <div className="field">
            <label className="label" htmlFor={`approve-note-${agentId}`}>
              {t.outreachNote}
            </label>
            <textarea
              id={`approve-note-${agentId}`}
              className="input reject-dialog-reason"
              rows={3}
              required
              maxLength={NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.outreachNotePlaceholder}
              autoFocus
            />
            <div className="reject-dialog-count" aria-hidden="true">
              {note.length}/{NOTE_MAX}
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
              className="btn btn-approve"
              disabled={pending || note.trim().length === 0}
            >
              {pending ? t.approveUniSubmitting : t.approveUniConfirm}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
