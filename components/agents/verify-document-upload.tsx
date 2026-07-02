"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { createClient } from "@/lib/supabase/client";
import { recordAgentDocumentAction } from "@/app/agents/verify/actions";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type {
  AgentDocType,
  AgentDocument,
} from "@/lib/data/agent-verification";

const BUCKET = "agent-documents";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB, mirrors the bucket size_limit (0033)
const ACCEPT = ".pdf,.jpg,.jpeg,.png";

function extFor(file: File): string {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  return "jpg";
}

interface Props {
  dict: Dictionary;
  agentId: string;
  initialDocuments: AgentDocument[];
  onDocumentAdded: (d: AgentDocument) => void;
}

// First private-bucket upload in the codebase. Pattern mirrors photo-manager /
// video-manager (client `supabase.storage.from(BUCKET).upload(...)`), with the
// difference that the bucket is private — no public URL resolver, the admin
// queue surfaces docs via short-TTL signed URLs (service-role).
//
// All-or-nothing per file: if the upload succeeds but the record (RPC)
// insert_agent_document_self fails, roll back the orphan storage object.
export function VerifyDocumentUpload({
  dict,
  agentId,
  initialDocuments,
  onDocumentAdded,
}: Props) {
  const t = dict.agentVerify;
  const [docType, setDocType] = useState<AgentDocType>("ren_cert");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const [documents, setDocuments] = useState<AgentDocument[]>(initialDocuments);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(t.errDocTooLarge);
      setFile(null);
      return;
    }
    setFile(f);
  }

  function upload() {
    if (!file) {
      setError(t.errPickFile);
      return;
    }
    setError(null);
    startUpload(async () => {
      const supabase = createClient();
      const ext = extFor(file);
      // Path convention {agent_id}/{document_uuid}.{ext}. First segment must
      // be the agent_id so the storage RLS resolves ownership.
      const path = `${agentId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(t.errUploadFailed);
        return;
      }
      const result = await recordAgentDocumentAction(docType, path);
      if (!result.ok) {
        // Roll back orphan object.
        await supabase.storage.from(BUCKET).remove([path]);
        setError(result.error);
        return;
      }
      const next: AgentDocument = {
        id: result.id,
        docType,
        storagePath: path,
        uploadedAt: new Date().toISOString(),
      };
      setDocuments((prev) => [next, ...prev]);
      onDocumentAdded(next);
      setFile(null);
      // Reset the input value so the same filename can be selected again.
      const el = document.getElementById("verify-doc-file") as HTMLInputElement | null;
      if (el) el.value = "";
    });
  }

  return (
    <div className="verify-doc-block">
      {error ? <div className="auth-error">{error}</div> : null}

      <div className="field">
        <label className="label" htmlFor="verify-doc-type">
          {t.docTypeLabel}
        </label>
        <select
          id="verify-doc-type"
          className="input"
          value={docType}
          onChange={(e) => setDocType(e.target.value as AgentDocType)}
        >
          <option value="ren_cert">{t.docTypeRen}</option>
          <option value="employment_letter">{t.docTypeEmployment}</option>
        </select>
        <div className="help">{t.docTypeHelp}</div>
      </div>

      <div className="field">
        <label className="label" htmlFor="verify-doc-file">
          {t.docFileLabel}
        </label>
        <input
          id="verify-doc-file"
          className="input"
          type="file"
          accept={ACCEPT}
          onChange={pickFile}
        />
        <div className="help">{t.docFileHelp}</div>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={upload}
        disabled={!file || uploading}
      >
        {uploading ? t.uploading : t.upload}
      </button>

      {documents.length > 0 ? (
        <ul className="verify-doc-list" aria-label={t.docListAria}>
          {documents.map((d) => (
            <li key={d.id} className="verify-doc-item">
              <Icon name="check" size={14} />
              <span className="verify-doc-label">
                {d.docType === "ren_cert" ? t.docTypeRen : t.docTypeEmployment}
              </span>
              <span className="verify-doc-path tabular">{d.storagePath}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
