"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Button,
  ErrorCard,
  Loading,
  PageHeader,
} from "@/components/admin";
import type { ContractWithSigners } from "@/lib/esignatures-types";

import { ContractDetailCard } from "../components/ContractDetailCard";
import { ContractPdfEmbed } from "../components/ContractPdfEmbed";
import { LinkMemberPanel } from "../components/LinkMemberPanel";
import styles from "../contracts.module.css";

type MemberLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  organization: string | null;
  email: string | null;
  member_type: string;
};

type DetailResponse = {
  ok: true;
  contract: ContractWithSigners;
  linkedMember: MemberLite | null;
  suggestedMember: MemberLite | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: DetailResponse };

type Props = {
  id: string;
};

/**
 * Client view for a single contract. The route's page.tsx is a thin
 * server component that just awaits params + forwards the id here;
 * keeping the dynamic param off of any `use(params)` call in client
 * code avoids a Turbopack dev-mode SWC crash on this route.
 */
export function ContractDetailView({ id }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/contracts/${encodeURIComponent(id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status} — ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as DetailResponse;
      setState({ kind: "ready", data: json });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleResync = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/contracts/${encodeURIComponent(id)}/resync`,
        { method: "POST" },
      );
      if (!res.ok) {
        const detail = await res.text();
        console.error("Resync failed", res.status, detail);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }, [id, load]);

  const handleUpdate = useCallback(
    async (patch: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/contracts/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        );
        if (!res.ok) {
          const detail = await res.text();
          console.error("Update failed", res.status, detail);
        }
        await load();
      } finally {
        setBusy(false);
      }
    },
    [id, load],
  );

  const handleArchive = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/contracts/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const detail = await res.text();
        console.error("Archive failed", res.status, detail);
      }
      await load();
    } finally {
      setBusy(false);
    }
  }, [id, load]);

  const handleRemind = useCallback(
    async (signerId: string) => {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/admin/contracts/${encodeURIComponent(id)}/remind`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ signer_id: signerId }),
          },
        );
        if (!res.ok) {
          const detail = await res.text();
          console.error("Reminder failed", res.status, detail);
        }
      } finally {
        setBusy(false);
      }
    },
    [id],
  );

  return (
    <div className={styles.page}>
      <PageHeader
        title={
          state.kind === "ready"
            ? state.data.contract.title || "Contract"
            : "Contract"
        }
        subtitle={
          state.kind === "ready"
            ? `Status: ${state.data.contract.status} · ${state.data.contract.id}`
            : id
        }
        actions={
          <Button variant="ghost" href="/hq/contracts">
            ← Back to contracts
          </Button>
        }
      />

      {state.kind === "loading" && <Loading message="Loading contract…" />}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load contract">
          <p>{state.message}</p>
          <p>
            <button
              type="button"
              onClick={() => {
                setState({ kind: "loading" });
                load();
              }}
            >
              Retry
            </button>
          </p>
        </ErrorCard>
      )}

      {state.kind === "ready" && (
        <>
          {/* Top row — 2-column: contract details (1fr) + counterparty
              card (360 px). Each card is denser content that benefits
              from a side-by-side layout. */}
          <div className={styles.detailLayout}>
            <div className={styles.detailMain}>
              <ContractDetailCard
                contract={state.data.contract}
                onResync={handleResync}
                onArchive={handleArchive}
                onUpdate={handleUpdate}
                onRemindSigner={handleRemind}
                busy={busy}
              />
            </div>
            <div className={styles.detailSide}>
              <div className={styles.detailCard}>
                <div className={styles.detailCardTitle}>Counterparty</div>
                <LinkMemberPanel
                  contractId={state.data.contract.id}
                  memberId={state.data.contract.member_id}
                  suggestedMemberId={state.data.contract.suggested_member_id}
                  linkedMember={state.data.linkedMember}
                  suggestedMember={state.data.suggestedMember}
                  onUpdated={load}
                />
              </div>
            </div>
          </div>

          {/* PDF embed — full-width below the 2-col header. PDFs
              benefit from horizontal real estate; the 360 px side
              column above would waste it here. The iframe targets the
              proxy route (/api/admin/contracts/:id/pdf) which
              re-fetches a fresh signed S3 URL on every load —
              esignatures URLs expire after ~48h and our cached one
              was returning S3 AccessDenied. */}
          <ContractPdfEmbed
            contractId={state.data.contract.id}
            hasPdf={hasPdfInRaw(state.data.contract.raw)}
          />
        </>
      )}
    </div>
  );
}

function hasPdfInRaw(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as { contract_pdf_url?: unknown };
  return typeof obj.contract_pdf_url === "string" && obj.contract_pdf_url.length > 0;
}
