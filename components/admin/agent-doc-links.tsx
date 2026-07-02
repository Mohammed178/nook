"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/nook/icon";
import { getAgentDocumentLinkAction } from "@/app/admin/agents/actions";

interface AdminDoc {
  id: string;
  docType: "ren_cert" | "employment_letter";
  storagePath: string;
}

interface Props {
  docs: AdminDoc[];
  labelRen: string;
  labelEmployment: string;
  ctaView: string;
  ctaOpening: string;
  ctaFailed: string;
  emptyLabel: string;
}

// Renders one short-TTL signed-URL anchor per uploaded document. The URL is
// fetched on click (not at page render) so a queue with N agents doesn't pre-
// generate N×k signed links. 60-second TTL is set in the action.
export function AgentDocLinks({
  docs,
  labelRen,
  labelEmployment,
  ctaView,
  ctaOpening,
  ctaFailed,
  emptyLabel,
}: Props) {
  if (docs.length === 0) {
    return <span className="admin-doc-empty">{emptyLabel}</span>;
  }
  return (
    <ul className="admin-doc-list">
      {docs.map((d) => (
        <li key={d.id}>
          <DocLink
            doc={d}
            label={d.docType === "ren_cert" ? labelRen : labelEmployment}
            ctaView={ctaView}
            ctaOpening={ctaOpening}
            ctaFailed={ctaFailed}
          />
        </li>
      ))}
    </ul>
  );
}

function DocLink({
  doc,
  label,
  ctaView,
  ctaOpening,
  ctaFailed,
}: {
  doc: AdminDoc;
  label: string;
  ctaView: string;
  ctaOpening: string;
  ctaFailed: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function open() {
    setError(null);
    start(async () => {
      const result = await getAgentDocumentLinkAction(doc.id);
      if (!result.ok) {
        setError(ctaFailed);
        return;
      }
      // Open in a new tab. The URL expires in 60 s; if the user comes back
      // later they need to re-click for a fresh signature.
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <span className="admin-doc-row">
      <Icon name="check" size={12} aria-hidden />
      <span className="admin-doc-label">{label}</span>
      <button
        type="button"
        className="btn btn-sm admin-doc-link"
        onClick={open}
        disabled={busy}
      >
        {busy ? ctaOpening : ctaView}
      </button>
      {error ? <span className="admin-doc-error">{error}</span> : null}
    </span>
  );
}
