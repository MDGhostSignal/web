"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  ErrorCard,
  Loading,
  Modal,
} from "@/components/admin";
import type {
  MarketingAssetCategory,
  MarketingAssetCreateInput,
  MarketingAssetRow,
  MarketingAssetWithFiles,
} from "@/lib/marketing-assets-types";

import { AssetDetail } from "../components/AssetDetail";
import { AssetForm } from "../components/AssetForm";
import { AssetGrid } from "../components/AssetGrid";
import type { CardPreview } from "../components/AssetCard";
import { CategoryTabs } from "../components/CategoryTabs";
import styles from "../marketing.module.css";

type Filter = MarketingAssetCategory | "all";

type ListResponse = {
  ok: true;
  assets: MarketingAssetRow[];
  previews: Record<string, CardPreview>;
  variantCounts: Record<string, number>;
  count: number;
};

type DetailResponse = {
  ok: true;
  asset: MarketingAssetWithFiles;
};

type CreateResponse = {
  ok: true;
  asset: MarketingAssetRow;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

/**
 * Assets sub-section. Identical behaviour to the original
 * /admin/marketing page before the sub-tab refactor — list / detail
 * modal / create modal / drag-upload variants. Now wrapped so it can
 * sit alongside Copy and Social sections under a single PageHeader.
 */
export function AssetsSection() {
  const [assets, setAssets] = useState<MarketingAssetRow[]>([]);
  const [previews, setPreviews] = useState<Map<string, CardPreview>>(
    new Map(),
  );
  const [variantCounts, setVariantCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [category, setCategory] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] =
    useState<MarketingAssetWithFiles | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketing-assets?limit=500", {
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`HTTP ${res.status} — ${detail.slice(0, 200)}`);
      }
      const json = (await res.json()) as ListResponse;
      setAssets(json.assets);
      setPreviews(new Map(Object.entries(json.previews ?? {})));
      setVariantCounts(new Map(Object.entries(json.variantCounts ?? {})));
      setState({ kind: "ready" });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(
      `/api/admin/marketing-assets/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as DetailResponse;
    return json.asset;
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedAsset(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setSelectedAsset(null);
    (async () => {
      try {
        const asset = await loadDetail(selectedId);
        if (!cancelled) setSelectedAsset(asset);
      } catch {
        if (!cancelled) setSelectedAsset(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadDetail]);

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return;
    try {
      const fresh = await loadDetail(selectedId);
      setSelectedAsset(fresh);
    } catch {
      // ignore; keep stale data, user can close + reopen
    }
    loadList();
  }, [selectedId, loadDetail, loadList]);

  const handleDeleted = useCallback(() => {
    setSelectedId(null);
    setSelectedAsset(null);
    loadList();
  }, [loadList]);

  async function handleCreate(payload: MarketingAssetCreateInput): Promise<void> {
    const res = await fetch("/api/admin/marketing-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Create failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as CreateResponse;
    setCreating(false);
    await loadList();
    setSelectedId(json.asset.id);
  }

  const filteredAssets = useMemo(
    () =>
      category === "all"
        ? assets
        : assets.filter((a) => a.category === category),
    [assets, category],
  );

  return (
    <>
      <div className={styles.sectionToolbar}>
        <div className={styles.sectionMeta}>
          {assets.length} {assets.length === 1 ? "asset" : "assets"}
        </div>
        <Button variant="primary" onClick={() => setCreating(true)}>
          Add asset
        </Button>
      </div>

      {state.kind === "loading" && (
        <Loading message="Loading marketing assets…" />
      )}

      {state.kind === "error" && (
        <ErrorCard title="Couldn't load assets">
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
          <CategoryTabs
            assets={assets}
            value={category}
            onChange={setCategory}
          />

          {assets.length === 0 ? (
            <EmptyState
              title="No marketing assets yet"
              message={
                <>
                  Add your first asset via the <strong>Add asset</strong>{" "}
                  button above, or run the seed script:
                  <br />
                  <code>
                    cd apps/web &amp;&amp; node scripts/seed-marketing-assets.mjs
                  </code>
                </>
              }
            />
          ) : filteredAssets.length === 0 ? (
            <EmptyState
              title={`No assets in "${category}"`}
              message="Try another category, or clear the filter."
            />
          ) : (
            <AssetGrid
              assets={filteredAssets}
              previews={previews}
              variantCounts={variantCounts}
              onSelect={(id) => setSelectedId(id)}
            />
          )}
        </>
      )}

      {selectedId && (
        <Modal
          open
          title={selectedAsset?.title ?? "Loading…"}
          onClose={() => setSelectedId(null)}
          size="lg"
        >
          {detailLoading && <Loading message="Loading asset details…" />}
          {!detailLoading && !selectedAsset && (
            <ErrorCard title="Couldn't load asset details">
              <p>The asset metadata failed to load. Close and try again.</p>
            </ErrorCard>
          )}
          {!detailLoading && selectedAsset && (
            <AssetDetail
              asset={selectedAsset}
              onSaved={refreshSelected}
              onDeleted={handleDeleted}
            />
          )}
        </Modal>
      )}

      {creating && (
        <Modal
          open
          title="Add asset"
          onClose={() => setCreating(false)}
          size="md"
        >
          <AssetForm
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
            submitLabel="Create"
          />
        </Modal>
      )}
    </>
  );
}
