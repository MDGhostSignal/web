"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, typeVariant } from "@/components/admin";

import type { BrandRow, MemberRow, PickRow } from "./page";
import styles from "./page.module.css";

/** Editorial convention — mirrors the roster loader's `limit=4`. */
const TARGET_PICKS = 4;
/** Hard cap, matches the API route's MAX_PICKS. */
const MAX_PICKS = 8;

type DraftPick = { brandId: string; note: string };

/**
 * Two-pane editorial desk: member list on the left, that member's
 * ordered pick deck on the right. Edits are local until Save, which
 * does a replace-all PUT (array order = deck order).
 */
export function PicksManager({
  members,
  brands,
  picks,
  saveDisabled,
}: {
  members: MemberRow[];
  brands: BrandRow[];
  picks: PickRow[];
  saveDisabled: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    members[0]?.id ?? null,
  );
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<DraftPick[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const brandById = useMemo(
    () => new Map(brands.map((b) => [b.id, b])),
    [brands],
  );
  const picksByMember = useMemo(() => {
    const map = new Map<string, DraftPick[]>();
    for (const p of picks) {
      const list = map.get(p.member_id) ?? [];
      list.push({ brandId: p.brand_id, note: p.note ?? "" });
      map.set(p.member_id, list);
    }
    return map;
  }, [picks]);

  const selected = members.find((m) => m.id === selectedId) ?? null;
  const savedPicks = selected ? picksByMember.get(selected.id) ?? [] : [];
  // Draft is null until the user edits — the saved state renders as-is,
  // so a background router.refresh never clobbers in-flight edits.
  const current = draft ?? savedPicks;
  const dirty = draft !== null;

  const visibleMembers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.first_name, m.last_name, m.organization, m.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [members, filter]);

  function selectMember(id: string) {
    if (id === selectedId) return;
    if (dirty && !window.confirm("Discard unsaved pick changes?")) return;
    setSelectedId(id);
    setDraft(null);
    setError(null);
  }

  function edit(mutate: (list: DraftPick[]) => DraftPick[]) {
    setSavedFlash(false);
    setDraft(mutate([...current].map((p) => ({ ...p }))));
  }

  function move(index: number, delta: -1 | 1) {
    edit((list) => {
      const to = index + delta;
      if (to < 0 || to >= list.length) return list;
      const [item] = list.splice(index, 1);
      list.splice(to, 0, item);
      return list;
    });
  }

  async function save() {
    if (!selected || !dirty) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/studio/picks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selected.id,
          picks: current.map((p) => ({
            brandId: p.brandId,
            note: p.note.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status}).`);
      }
      setDraft(null);
      setSavedFlash(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const pickedIds = new Set(current.map((p) => p.brandId));
  const addable = brands.filter((b) => !pickedIds.has(b.id));

  return (
    <div className={styles.split}>
      {/* --- Member list ------------------------------------------- */}
      <aside className={styles.memberPane}>
        <input
          type="search"
          className={styles.memberFilter}
          placeholder="Filter members…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <ul className={styles.memberList}>
          {visibleMembers.map((m) => {
            const name =
              `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() ||
              "(unnamed)";
            const count = (picksByMember.get(m.id) ?? []).length;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={[
                    styles.memberRow,
                    m.id === selectedId ? styles.memberRowActive : "",
                  ].join(" ")}
                  onClick={() => selectMember(m.id)}
                >
                  <span className={styles.memberName}>{name}</span>
                  <span className={styles.memberMeta}>
                    {m.organization ?? m.email ?? "—"}
                  </span>
                  <span className={styles.memberBadges}>
                    <Badge variant={typeVariant(m.member_type)}>
                      {m.member_type}
                    </Badge>
                    <Badge variant={count > 0 ? "accent" : "neutral"}>
                      {count}/{TARGET_PICKS}
                    </Badge>
                  </span>
                </button>
              </li>
            );
          })}
          {visibleMembers.length === 0 && (
            <li className={styles.memberListEmpty}>No members match.</li>
          )}
        </ul>
      </aside>

      {/* --- Pick editor ------------------------------------------- */}
      <section className={styles.editorPane}>
        {!selected ? (
          <div className={styles.empty}>
            <strong>Select a member</strong>
            <p>Their pick deck shows here.</p>
          </div>
        ) : (
          <>
            <div className={styles.editorHead}>
              <h2 className={styles.editorTitle}>
                Picks for{" "}
                {`${selected.first_name ?? ""} ${selected.last_name ?? ""}`.trim() ||
                  selected.email ||
                  "(unnamed)"}
              </h2>
              <span className={styles.editorHint}>
                Order is deck order — position 1 leads the roster.
              </span>
            </div>

            {error && <div className={styles.error}>{error}</div>}
            {savedFlash && !dirty && (
              <div className={styles.saved}>Saved — live on next roster load.</div>
            )}

            {current.length === 0 ? (
              <p className={styles.noPicks}>
                No picks yet. Members still see the full roster; picks add the
                “✦ GhostSignal Pick” lead cards.
              </p>
            ) : (
              <ol className={styles.pickList}>
                {current.map((p, i) => (
                  <li key={p.brandId} className={styles.pickRow}>
                    <span className={styles.pickPos}>{i + 1}</span>
                    <span className={styles.pickBrand}>
                      {brandById.get(p.brandId)?.name ?? "(unknown brand)"}
                    </span>
                    <input
                      type="text"
                      className={styles.pickNote}
                      placeholder="Why we picked this (optional, shown to the member)"
                      value={p.note}
                      maxLength={300}
                      onChange={(e) =>
                        edit((list) => {
                          list[i] = { ...list[i], note: e.target.value };
                          return list;
                        })
                      }
                    />
                    <span className={styles.pickActions}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => move(i, 1)}
                        disabled={i === current.length - 1}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={[styles.iconBtn, styles.iconBtnDanger].join(
                          " ",
                        )}
                        onClick={() =>
                          edit((list) => list.filter((_, j) => j !== i))
                        }
                        aria-label="Remove pick"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            <div className={styles.editorFoot}>
              <select
                className={styles.addSelect}
                value=""
                disabled={current.length >= MAX_PICKS || addable.length === 0}
                onChange={(e) => {
                  const brandId = e.target.value;
                  if (!brandId) return;
                  edit((list) => [...list, { brandId, note: "" }]);
                }}
              >
                <option value="">
                  {current.length >= MAX_PICKS
                    ? `Max ${MAX_PICKS} picks`
                    : "+ Add a brand…"}
                </option>
                {addable.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <span className={styles.footSpacer} />

              {dirty && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => {
                    setDraft(null);
                    setError(null);
                  }}
                  disabled={saving}
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                className={styles.saveBtn}
                onClick={save}
                disabled={!dirty || saving || saveDisabled}
                title={
                  saveDisabled
                    ? "Run docs/STUDIO_LITE_RECOMMENDATIONS.sql first"
                    : undefined
                }
              >
                {saving ? "Saving…" : "Save picks"}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
