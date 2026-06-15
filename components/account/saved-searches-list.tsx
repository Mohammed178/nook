"use client";

import Link from "next/link";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { Icon } from "@/components/nook/icon";
import { buildListingsHref } from "@/lib/listings-search";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import {
  deleteSavedSearchAction,
  renameSavedSearchAction,
} from "@/app/account/searches/actions";
import type { SavedSearchRow } from "@/lib/saved-searches";

type SavedSearchesDict = Dictionary["savedSearches"];

interface SavedSearchesListProps {
  initial: SavedSearchRow[];
}

function relativeDate(iso: string, s: SavedSearchesDict): string {
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return s.today;
  if (days === 1) return s.yesterday;
  if (days < 30) return format(s.daysAgo, { n: days });
  if (days < 60) return s.aMonthAgo;
  return format(s.monthsAgo, { n: Math.floor(days / 30) });
}

type Action =
  | { kind: "remove"; id: string }
  | { kind: "rename"; id: string; name: string };

export function SavedSearchesList({ initial }: SavedSearchesListProps) {
  const dict = useDict();
  const s = dict.savedSearches;
  const [items, setItems] = useState<SavedSearchRow[]>(initial);
  const [optimisticItems, applyOptimistic] = useOptimistic<
    SavedSearchRow[],
    Action
  >(items, (state, action) => {
    if (action.kind === "remove") {
      return state.filter((i) => i.id !== action.id);
    }
    return state.map((i) =>
      i.id === action.id ? { ...i, name: action.name } : i,
    );
  });
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const confirmTimeoutRef = useRef<number | null>(null);

  function clearConfirmTimeout() {
    if (confirmTimeoutRef.current !== null) {
      window.clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
  }

  useEffect(() => clearConfirmTimeout, []);

  function armDelete(id: string) {
    clearConfirmTimeout();
    setConfirmingDeleteId(id);
    confirmTimeoutRef.current = window.setTimeout(() => {
      setConfirmingDeleteId(null);
      confirmTimeoutRef.current = null;
    }, 5000);
  }

  function cancelDelete() {
    clearConfirmTimeout();
    setConfirmingDeleteId(null);
  }

  function confirmDelete(id: string) {
    clearConfirmTimeout();
    setConfirmingDeleteId(null);
    handleDelete(id);
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ kind: "remove", id });
      const result = await deleteSavedSearchAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    });
  }

  function handleRename(id: string, newName: string) {
    const trimmed = newName.trim();
    if (trimmed.length === 0) return;
    setError(null);
    startTransition(async () => {
      applyOptimistic({ kind: "rename", id, name: trimmed });
      const result = await renameSavedSearchAction(id, trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, name: trimmed } : i)),
      );
      setEditingId(null);
    });
  }

  const count = optimisticItems.length;

  return (
    <>
      <header className="account-page-head">
        <span className="account-page-kicker">{dict.accountHome.yourAccount}</span>
        <h1>{dict.accountNav.savedSearches}</h1>
        <p className="account-page-sub">
          {count === 0
            ? s.noneYet
            : `${format(count === 1 ? s.countSearch : s.countSearches, { count })}.`}
        </p>
      </header>

      {error ? (
        <div className="auth-error" role="alert" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {count === 0 ? (
        <div className="saved-empty">
          <span className="saved-empty-icon" aria-hidden="true">
            <Icon name="search" size={28} />
          </span>
          <h2>{s.emptyTitle}</h2>
          <p>{s.emptyBody}</p>
          <Link href="/listings" className="btn btn-primary">
            {dict.accountHome.browseListings}
          </Link>
        </div>
      ) : (
        <ul className="searches-list">
          {optimisticItems.map((row, i) => (
            <SavedSearchRowView
              key={row.id}
              index={i}
              row={row}
              s={s}
              editing={editingId === row.id}
              confirmingDelete={confirmingDeleteId === row.id}
              onEdit={() => {
                cancelDelete();
                setEditingId(row.id);
              }}
              onCancelEdit={() => setEditingId(null)}
              onSubmitName={(newName) => handleRename(row.id, newName)}
              onRequestDelete={() => armDelete(row.id)}
              onConfirmDelete={() => confirmDelete(row.id)}
              onCancelDelete={cancelDelete}
            />
          ))}
        </ul>
      )}
    </>
  );
}

interface SavedSearchRowViewProps {
  row: SavedSearchRow;
  index: number;
  editing: boolean;
  confirmingDelete: boolean;
  s: SavedSearchesDict;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSubmitName: (name: string) => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

function SavedSearchRowView({
  row,
  index,
  editing,
  confirmingDelete,
  s,
  onEdit,
  onCancelEdit,
  onSubmitName,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: SavedSearchRowViewProps) {
  const common = useDict().common;
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);
  const prevConfirmingRef = useRef(confirmingDelete);

  useEffect(() => {
    if (prevConfirmingRef.current && !confirmingDelete) {
      deleteBtnRef.current?.focus();
    }
    prevConfirmingRef.current = confirmingDelete;
  }, [confirmingDelete]);

  return (
    <li className="search-row" style={{ "--i": index } as React.CSSProperties}>
      <div className="search-row-head">
        {editing ? (
          <form
            className="search-rename"
            onSubmit={(e) => {
              e.preventDefault();
              const v = inputRef.current?.value ?? "";
              onSubmitName(v);
            }}
          >
            <input
              ref={inputRef}
              className="input search-rename-input"
              defaultValue={row.name}
              maxLength={100}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onCancelEdit();
                }
              }}
            />
            <button type="submit" className="btn btn-primary btn-sm">
              {common.save}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onCancelEdit}
            >
              {common.cancel}
            </button>
          </form>
        ) : (
          <h3 className="search-row-name">{row.name}</h3>
        )}
      </div>

      {row.chips.length > 0 ? (
        <div className="search-chips">
          {row.chips.map((c) => (
            <span key={c} className="pill">
              {c}
            </span>
          ))}
        </div>
      ) : (
        <div className="search-chips search-chips-empty">{s.noFilters}</div>
      )}

      <div className="search-row-meta">
        {format(row.matchCount === 1 ? s.matchNow : s.matchesNow, {
          count: row.matchCount,
          when: relativeDate(row.createdAt, s),
        })}
      </div>

      {!editing ? (
        <div className="search-row-actions">
          <Link
            href={buildListingsHref(row.query)}
            className="btn btn-primary btn-sm"
          >
            {s.runSearch}
          </Link>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onEdit}
            aria-label={format(s.renameAria, { name: row.name })}
          >
            {s.rename}
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                className="btn btn-sm search-row-delete-confirm"
                onClick={onConfirmDelete}
                aria-label={format(s.confirmDeleteAria, { name: row.name })}
                autoFocus
              >
                {s.confirmDelete}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onCancelDelete}
                aria-label={s.cancelDelete}
              >
                {common.cancel}
              </button>
            </>
          ) : (
            <button
              ref={deleteBtnRef}
              type="button"
              className="btn btn-ghost btn-sm search-row-delete"
              onClick={onRequestDelete}
              aria-label={format(s.deleteAria, { name: row.name })}
            >
              {s.delete}
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}
