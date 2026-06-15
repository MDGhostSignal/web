"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  ErrorCard,
  Loading,
  PageHeader,
  SearchInput,
} from "@/components/admin";
import { IconExternal } from "@/components/admin/icons";
import { ESIGNATURES_TEMPLATES } from "@/lib/esignatures-templates";
import type { ContractRow } from "@/lib/esignatures-types";

import { ContractComposer } from "./components/ContractComposer";
import { ContractsFilterSidebar, type FilterState } from "./components/ContractsFilterSidebar";
import { ContractsKpiRow } from "./components/ContractsKpiRow";
import { ContractsTable, type ContractsTableRow } from "./components/ContractsTable";
import { ImportContractModal } from "./components/ImportContractModal";
import styles from "./contracts.module.css";

type ListResponse = {
  ok: true;
  contracts: ContractRow[];
  count: number;
};

type MembersResponse = {
  ok: true;
  members: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    organization: string | null;
  }>;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

/**
 * /admin/contracts — Phase B dashboard.
 *
 * Data flow:
 *  - Mount: GET /api/admin/contracts (large limit) — reads from local cache.
 *  - Side-fetch /api/admin/members lite-list so the table can render the
 *    linked + suggested member names without a per-row hit.
 *  - Filters apply client-side over the loaded rows — cheap and instant.
 *  - "Import contract by ID" opens a modal that POSTs back to the list
 *    endpoint; on success we re-fetch and surface the new row.
 *
 * The webhook receiver keeps the cache fresh automatically, so most of
 * the time the user just lands here and sees current state.
 */
export default function ContractsPage() {
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [memberNames, setMemberNames] = useState<Map<string, string>>(
    new Map(),
  );
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [filters, setFilters] = useState<FilterState>({
    status: null,
    counterparty: null,
    unlinked: false,
    archived: false,
  });
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const router = useRouter();

  const loadList = useCallback(async () => {
    try {
      // We pull both active AND archived in one go so the sidebar can
      // surface accurate counts for the "Archived" chip. The filter state
      // decides what's actually rendered.
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/admin/contracts?limit=500", { cache: "no-store" }),
        fetch("/api/admin/contracts?limit=500&archived=true", {
          cache: "no-store",
        }),
      ]);
      if (!activeRes.ok) {
        const detail = await activeRes.text();
        throw new Error(`HTTP ${activeRes.status} — ${detail.slice(0, 200)}`);
      }
      const activeJson = (await activeRes.json()) as ListResponse;
      const archivedJson = archivedRes.ok
        ? ((await archivedRes.json()) as ListResponse)
        : { contracts: [] as ContractRow[] };
      const combined = [...activeJson.contracts, ...archivedJson.contracts];
      setRows(combined);
      setState({ kind: "ready" });

      // Hydrate member names referenced by member_id / suggested_member_id.
      const idSet = new Set<string>();
      for (const r of combined) {
        if (r.member_id) idSet.add(r.member_id);
        if (r.suggested_member_id) idSet.add(r.suggested_member_id);
      }
      if (idSet.size > 0) {
        await hydrateMemberNames(idSet, setMemberNames);
      }
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const tableRows = useMemo<ContractsTableRow[]>(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        // Archived toggle: when on, show only archived; when off, hide them.
        if (filters.archived) {
          if (!r.archived_at) return false;
        } else {
          if (r.archived_at) return false;
        }
        if (filters.status && r.status !== filters.status) return false;
        if (
          filters.counterparty &&
          r.counterparty_kind !== filters.counterparty
        ) {
          return false;
        }
        if (filters.unlinked && r.member_id) return false;
        if (term) {
          const hay = `${r.title ?? ""} ${r.id}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      })
      .map((r) => ({
        ...r,
        linkedMemberName: r.member_id
          ? memberNames.get(r.member_id) ?? null
          : null,
        suggestedMemberName: r.suggested_member_id
          ? memberNames.get(r.suggested_member_id) ?? null
          : null,
      }));
  }, [rows, filters, search, memberNames]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Contracts"
        subtitle="Creator + brand agreements, mirrored from esignatures.com."
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              Import by ID
            </Button>
            <Button
              variant="secondary"
              href={ESIGNATURES_TEMPLATES.creator.editUrl}
              target="_blank"
              rel="noopener noreferrer"
              trailingIcon={<IconExternal />}
            >
              + New Creator Contract
            </Button>
            <Button variant="primary" onClick={() => setComposerOpen(true)}>
              Send new contract
            </Button>
          </>
        }
      />

      {state.kind === "loading" && <Loading message="Loading contracts…" />}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load contracts">
          <p>{state.message}</p>
          <p>
            <button
              type="button"
              onClick={() => {
                setState({ kind: "loading" });
                loadList();
              }}
            >
              Retry
            </button>
          </p>
        </ErrorCard>
      )}

      {state.kind === "ready" && (
        <>
          <ContractsKpiRow rows={rows.filter((r) => !r.archived_at)} />

          <div className={styles.layout}>
            <ContractsFilterSidebar
              rows={rows}
              value={filters}
              onChange={setFilters}
            />

            <div>
              <div className={styles.tableHead}>
                <div className={styles.tableCount}>
                  {tableRows.length} contract{tableRows.length === 1 ? "" : "s"}
                </div>
                <div className={styles.tableActions}>
                  <SearchInput
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search title or id…"
                    wrapClassName={styles.search}
                  />
                </div>
              </div>
              {tableRows.length === 0 ? (
                <EmptyState
                  title="No contracts match these filters"
                  message={
                    rows.length === 0
                      ? "Nothing imported yet — use Import by ID to backfill an existing esignatures contract, or wait for the next webhook event."
                      : "Clear filters or adjust the search to widen the result set."
                  }
                />
              ) : (
                <ContractsTable rows={tableRows} />
              )}
            </div>
          </div>
        </>
      )}

      <ImportContractModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          loadList();
        }}
      />

      <ContractComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSent={(id) => {
          // Re-fetch so the row appears immediately, then navigate to
          // the detail page where the user can review what they sent.
          loadList();
          router.push(`/hq/contracts/${encodeURIComponent(id)}`);
        }}
      />
    </div>
  );
}

async function hydrateMemberNames(
  ids: Set<string>,
  setNames: (next: Map<string, string>) => void,
) {
  const list = Array.from(ids);
  if (list.length === 0) return;
  const params = new URLSearchParams();
  params.set("ids", list.join(","));
  const res = await fetch(`/api/admin/members/lite?${params.toString()}`, {
    cache: "no-store",
  }).catch(() => null);
  if (!res || !res.ok) return;
  const json = (await res.json().catch(() => null)) as MembersResponse | null;
  if (!json?.members) return;
  const map = new Map<string, string>();
  for (const m of json.members) {
    const name =
      [m.first_name, m.last_name].filter(Boolean).join(" ").trim() ||
      m.organization ||
      "(unnamed member)";
    map.set(m.id, name);
  }
  setNames(map);
}
