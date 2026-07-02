"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { deleteAccountAction } from "@/app/account/delete/actions";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface Props {
  // Live (non-withdrawn) agents row → hijack-proof variant (typed phrase +
  // password). The server independently re-derives this; the prop only picks
  // which dialog to render.
  isAgent: boolean;
  dict: Dictionary;
}

// "Danger zone" section + delete-confirmation dialog. Native <dialog>
// (showModal) gives the focus trap, Esc-to-close and inert background for
// free — same skeleton as components/admin/reject-agent-dialog.tsx, whose
// .reject-dialog* styles are reused. The typed phrase is client-side UX only;
// the real gates live in deleteAccountAction (confirm field for students,
// password re-verification for agents).
export function DeleteAccountDialog({ isAgent, dict }: Props) {
  const a = dict.account;
  const ref = useRef<HTMLDialogElement>(null);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const phraseOk = !isAgent || phrase.trim() === a.deleteConfirmPhrase;
  const passwordOk = !isAgent || password.length > 0;

  function open() {
    setError(null);
    setPhrase("");
    setPassword("");
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
    if (pending || !phraseOk || !passwordOk) return;
    setError(null);
    const fd = new FormData();
    fd.set("confirm", "true");
    if (isAgent) fd.set("password", password);
    startTransition(async () => {
      try {
        const res = await deleteAccountAction(fd);
        // Success never reaches here — the action redirects to /goodbye.
        if (res?.error) setError(res.error);
      } catch {
        setError(a.deleteFailed);
      }
    });
  }

  return (
    <section id="danger-zone" className="danger-zone" aria-labelledby="danger-zone-title">
      <div className="danger-zone-text">
        <h2 id="danger-zone-title" className="danger-zone-title">
          {a.dangerZoneTitle}
        </h2>
        <p className="danger-zone-sub">{a.dangerZoneSub}</p>
      </div>
      <button type="button" className="btn danger-zone-btn" onClick={open}>
        {a.deleteAccount}
      </button>

      <dialog
        ref={ref}
        className="reject-dialog"
        aria-labelledby="delete-account-title"
        onClick={onBackdropClick}
        onCancel={(e) => {
          // Esc mid-deletion: keep the dialog up so the outcome is visible.
          if (pending) e.preventDefault();
        }}
      >
        <form onSubmit={onSubmit} className="reject-dialog-panel">
          <span className="reject-dialog-badge" aria-hidden="true">
            <Icon name="trash" size={20} strokeWidth={2.2} />
          </span>

          <h2 id="delete-account-title" className="reject-dialog-title">
            {a.deleteDialogTitle}
          </h2>
          <p className="reject-dialog-body">
            {isAgent ? a.deleteDialogBodyAgent : a.deleteDialogBodyStudent}
          </p>

          {isAgent ? (
            <>
              <div className="field">
                <label className="label" htmlFor="delete-confirm-phrase">
                  {format(a.deleteConfirmLabel, { phrase: a.deleteConfirmPhrase })}
                </label>
                <input
                  id="delete-confirm-phrase"
                  className="input"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="label" htmlFor="delete-confirm-password">
                  {a.deletePasswordLabel}
                </label>
                <input
                  id="delete-confirm-password"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="danger-zone-help">{a.deletePasswordHelp}</p>
              </div>
            </>
          ) : null}

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
              {a.deleteCancel}
            </button>
            <button
              type="submit"
              className="btn reject-dialog-confirm"
              disabled={pending || !phraseOk || !passwordOk}
            >
              {pending ? a.deleting : a.deleteConfirmCta}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
