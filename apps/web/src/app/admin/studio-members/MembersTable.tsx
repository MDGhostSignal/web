"use client";

import { useEffect, useState } from "react";

import { Badge, Modal, typeVariant } from "@/components/admin";
import type { StudioOrgProfile, StudioRqSummary, StudioXqSummary } from "@/lib/studio-data";

import type { StudioMemberRow } from "./page";
import styles from "./page.module.css";

/* ============================================================
 * List table
 * ============================================================ */

export function MembersTable({ rows }: { rows: StudioMemberRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRow = rows.find((r) => r.id === openId) ?? null;

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Organization</th>
              <th>Kind</th>
              <th>Joined</th>
              <th>XQ</th>
              <th>RQ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={styles.clickableRow}
                onClick={() => setOpenId(r.id)}
              >
                <td>
                  <button
                    type="button"
                    className={styles.memberBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenId(r.id);
                    }}
                  >
                    {displayName(r)}
                  </button>
                  <span className={styles.dimSmall}>{r.email ?? "—"}</span>
                </td>
                <td>{r.organization ?? "—"}</td>
                <td>
                  <Badge variant={typeVariant(r.member_type)}>
                    {r.member_type}
                  </Badge>
                </td>
                <td className={styles.dim}>
                  {formatDate(r.activated_at ?? r.created_at)}
                </td>
                <td>
                  {r.xq_submission_id ? (
                    <Badge variant="success">
                      {r.xq_archetype ? `✓ ${r.xq_archetype}` : "✓ done"}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">not yet</Badge>
                  )}
                </td>
                <td>
                  {r.rq_submission_id ? (
                    <Badge variant="success">
                      {r.rq_code ? `✓ ${r.rq_code}` : "✓ done"}
                    </Badge>
                  ) : (
                    <Badge variant="neutral">not yet</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openRow && (
        <MemberDetailModal row={openRow} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}

function displayName(r: StudioMemberRow): string {
  return (
    `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() ||
    r.email ||
    "(unnamed)"
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ============================================================
 * Detail modal — full dossier
 * ============================================================ */

type Dossier = {
  member: {
    email: string | null;
    phase: string | null;
    created_at: string | null;
    activated_at: string | null;
    avatar_url: string | null;
    tagline: string | null;
    bio: string | null;
  };
  org: StudioOrgProfile | null;
  xq: StudioXqSummary | null;
  rq: StudioRqSummary | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; data: Dossier }
  | { kind: "error"; message: string };

const XQ_AXIS_LABEL: Record<string, string> = {
  C: "Continuity / Craft",
  X: "Change",
  P: "Person",
  S: "System",
  L: "Leverage",
};

function MemberDetailModal({
  row,
  onClose,
}: {
  row: StudioMemberRow;
  onClose: () => void;
}) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/studio/members/${row.id}`, {
          cache: "no-store",
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setState({ kind: "error", message: body.error ?? `HTTP ${res.status}` });
          return;
        }
        setState({ kind: "ready", data: body as Dossier });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.id]);

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={displayName(row)}
      subtitle={
        <>
          <Badge variant={typeVariant(row.member_type)}>{row.member_type}</Badge>{" "}
          {row.organization ?? row.email ?? ""}
        </>
      }
    >
      {state.kind === "loading" && (
        <div className={styles.detailLoading}>Loading dossier…</div>
      )}
      {state.kind === "error" && (
        <div className={styles.error}>Couldn&apos;t load: {state.message}</div>
      )}
      {state.kind === "ready" && <DossierBody row={row} d={state.data} />}
    </Modal>
  );
}

function DossierBody({ row, d }: { row: StudioMemberRow; d: Dossier }) {
  const m = d.member;
  return (
    <div className={styles.detail}>
      {/* --- Contact ------------------------------------------- */}
      <section className={styles.detailSection}>
        <h3 className={styles.detailHeading}>Contact</h3>
        <dl className={styles.factGrid}>
          <Fact label="Email" value={m.email} />
          <Fact label="Registered" value={formatDate(m.created_at)} />
          <Fact label="Joined Studio" value={formatDate(m.activated_at)} />
          <Fact label="CRM phase" value={m.phase} />
          {m.tagline && <Fact label="Card tagline" value={m.tagline} wide />}
          {m.bio && <Fact label="Bio" value={m.bio} wide />}
        </dl>
      </section>

      {/* --- Org card ------------------------------------------ */}
      <section className={styles.detailSection}>
        <h3 className={styles.detailHeading}>
          {d.org?.kind === "creator"
            ? "Show / creator card"
            : d.org?.kind === "brand"
              ? "Brand card"
              : "Personal card"}
        </h3>
        {d.org ? (
          <div className={styles.orgCard}>
            {d.org.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- external Storage URL, tiny thumb, no optimizer needed
              <img
                src={d.org.imageUrl}
                alt=""
                className={styles.orgLogo}
              />
            )}
            <div className={styles.orgBody}>
              <div className={styles.orgName}>
                {d.org.name}
                {d.org.sinceYear && (
                  <span className={styles.dimSmall}> · since {d.org.sinceYear}</span>
                )}
              </div>
              {d.org.tagline && <p className={styles.orgTagline}>{d.org.tagline}</p>}
              {d.org.description && (
                <p className={styles.orgDesc}>{d.org.description}</p>
              )}
              <div className={styles.orgLinks}>
                {d.org.website && <ExtLink href={d.org.website} label="Website" />}
                {d.org.podcastUrl && <ExtLink href={d.org.podcastUrl} label="Podcast" />}
                {d.org.newsletterUrl && (
                  <ExtLink href={d.org.newsletterUrl} label="Newsletter" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className={styles.notTaken}>No card data yet.</p>
        )}
      </section>

      {/* --- XQ ------------------------------------------------ */}
      <section className={styles.detailSection}>
        <h3 className={styles.detailHeading}>XQ — Conviction Quotient</h3>
        {d.xq?.code ? (
          <div className={styles.quizBlock}>
            <div className={styles.quizHead}>
              <span className={styles.quizCode}>{d.xq.code}</span>
              <span className={styles.quizName}>{d.xq.archetypeName ?? "—"}</span>
              {d.xq.submittedAt && (
                <span className={styles.dimSmall}>
                  submitted {formatDate(d.xq.submittedAt)}
                </span>
              )}
            </div>
            {d.xq.tagline && (
              <p className={styles.quizTagline}>&ldquo;{d.xq.tagline}&rdquo;</p>
            )}
            <dl className={styles.factGrid}>
              <Fact
                label="Continuity ↔ Change"
                value={axisLabel(d.xq.axes.continuityChange)}
              />
              <Fact
                label="Person ↔ System"
                value={axisLabel(d.xq.axes.personSystem)}
              />
              <Fact
                label="Craft ↔ Leverage"
                value={axisLabel(d.xq.axes.craftLeverage)}
              />
            </dl>
            <ValueRow label="Non-negotiables" values={d.xq.values.nonNegotiables} />
            <ValueRow label="Core values" values={d.xq.values.core} />
            <ValueRow label="Aspirational" values={d.xq.values.aspirational} />
          </div>
        ) : (
          <p className={styles.notTaken}>Not taken yet.</p>
        )}
      </section>

      {/* --- RQ ------------------------------------------------ */}
      <section className={styles.detailSection}>
        <h3 className={styles.detailHeading}>RQ — Resonance Quotient</h3>
        {d.rq?.code ? (
          <div className={styles.quizBlock}>
            <div className={styles.quizHead}>
              <span className={styles.quizCode}>{d.rq.code}</span>
              <span className={styles.quizName}>{d.rq.name ?? "—"}</span>
              {d.rq.submittedAt && (
                <span className={styles.dimSmall}>
                  submitted {formatDate(d.rq.submittedAt)}
                </span>
              )}
            </div>
            <dl className={styles.factGrid}>
              <Fact label="Signal clarity" value={d.rq.clarityLabel} />
              <Fact label="Undertone" value={d.rq.undertone} />
            </dl>
            {d.rq.clarityNote && <p className={styles.quizTagline}>{d.rq.clarityNote}</p>}
            {(["values", "authenticity", "horizon"] as const).map((axis) => {
              const detail = d.rq!.details[axis];
              const prose = d.rq!.profile[axis];
              if (!detail && !prose) return null;
              return (
                <div key={axis} className={styles.rqAxis}>
                  <div className={styles.rqAxisHead}>
                    <span className={styles.rqAxisName}>{axis}</span>
                    {detail && (
                      <span className={styles.dimSmall}>
                        {detail.letter} · {detail.score} · {detail.band}
                      </span>
                    )}
                  </div>
                  {prose && <p className={styles.rqAxisProse}>{prose}</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.notTaken}>Not taken yet.</p>
        )}
      </section>

      <p className={styles.detailFootnote}>
        Member id: <code>{row.id}</code>
      </p>
    </div>
  );
}

/* --- Small pieces -------------------------------------------- */

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
}) {
  return (
    <div className={wide ? styles.factWide : undefined}>
      <dt className={styles.factLabel}>{label}</dt>
      <dd className={styles.factValue}>{value?.trim() || "—"}</dd>
    </div>
  );
}

function ValueRow({ label, values }: { label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className={styles.valueRow}>
      <span className={styles.factLabel}>{label}</span>
      <span className={styles.valuePills}>
        {values.map((v) => (
          <span key={v} className={styles.valuePill}>
            {v}
          </span>
        ))}
      </span>
    </div>
  );
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={styles.extLink}>
      {label} ↗
    </a>
  );
}

function axisLabel(letter: string | null): string {
  if (!letter) return "—";
  return XQ_AXIS_LABEL[letter] ?? letter;
}
