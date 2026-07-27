"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { StudioOrgProfile } from "@/lib/studio-data";

import styles from "../studio.module.css";

/** Client form for /studio/profile. Sends only field values — the
 *  server derives which rows to write from the session. */
export function ProfileForm({
  member,
  org,
}: {
  member: {
    kind: "brand" | "creator" | "other";
    firstName: string | null;
    lastName: string | null;
  };
  org: StudioOrgProfile | null;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(member.firstName ?? "");
  const [lastName, setLastName] = useState(member.lastName ?? "");
  const [description, setDescription] = useState(org?.description ?? "");
  const [website, setWebsite] = useState(org?.website ?? "");
  const [podcastUrl, setPodcastUrl] = useState(org?.podcastUrl ?? "");
  const [newsletterUrl, setNewsletterUrl] = useState(org?.newsletterUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const body: Record<string, string> = { firstName, lastName };
      if (member.kind === "creator") {
        body.description = description;
        body.podcastUrl = podcastUrl;
        body.newsletterUrl = newsletterUrl;
      } else if (member.kind === "brand") {
        body.description = description;
        body.website = website;
      }
      const res = await fetch("/api/studio/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `Save failed (${res.status}).`);
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const hasOrg = org !== null;

  return (
    <div className={styles.profileFormWrap}>
      <form className={styles.form} onSubmit={onSubmit}>
        {hasOrg && (
          <div className={styles.field}>
            <span className={styles.label}>
              {org.kind === "creator" ? "Show" : "Brand"}
            </span>
            <div className={styles.orgNameRow}>
              <strong>{org.name}</strong>
              <span className={styles.orgNameHint}>
                Name changes go through the GhostSignal team.
              </span>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-first-name">
            First name
          </label>
          <input
            id="profile-first-name"
            className={styles.input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-last-name">
            Last name
          </label>
          <input
            id="profile-last-name"
            className={styles.input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            maxLength={80}
          />
        </div>

        {hasOrg && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-description">
              {org.kind === "creator" ? "Show description" : "Brand description"}
            </label>
            <textarea
              id="profile-description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder={
                org.kind === "creator"
                  ? "What your show is about, who listens, and what makes it distinct."
                  : "What your brand stands for and what partnerships you're looking for."
              }
            />
          </div>
        )}

        {hasOrg && org.kind === "brand" && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-website">
              Website
            </label>
            <input
              id="profile-website"
              className={styles.input}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourbrand.com"
              inputMode="url"
            />
          </div>
        )}

        {hasOrg && org.kind === "creator" && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-podcast-url">
                Podcast URL
              </label>
              <input
                id="profile-podcast-url"
                className={styles.input}
                value={podcastUrl}
                onChange={(e) => setPodcastUrl(e.target.value)}
                placeholder="Where your show lives today (host page or feed)"
                inputMode="url"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-newsletter-url">
                Newsletter URL
              </label>
              <input
                id="profile-newsletter-url"
                className={styles.input}
                value={newsletterUrl}
                onChange={(e) => setNewsletterUrl(e.target.value)}
                placeholder="Optional — if you run a newsletter"
                inputMode="url"
              />
            </div>
          </>
        )}

        {error && <div className={styles.error}>{error}</div>}
        {saved && !error && (
          <div className={styles.formSaved}>Profile saved.</div>
        )}

        <button className={styles.submit} type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
