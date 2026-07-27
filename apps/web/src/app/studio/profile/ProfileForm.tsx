"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { StudioOrgProfile } from "@/lib/studio-data";

import styles from "../studio.module.css";

/** Client form for /studio/profile — the member-facing onboarding
 *  questionnaire. Sends only field values; the server derives which
 *  rows to write from the session. The image uploads separately (its
 *  own route) so a failed save never orphans a stored blob. */
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(member.firstName ?? "");
  const [lastName, setLastName] = useState(member.lastName ?? "");
  const [orgName, setOrgName] = useState(org?.name ?? "");
  const [tagline, setTagline] = useState(org?.tagline ?? "");
  const [description, setDescription] = useState(org?.description ?? "");
  const [website, setWebsite] = useState(org?.website ?? "");
  const [podcastUrl, setPodcastUrl] = useState(org?.podcastUrl ?? "");
  const [newsletterUrl, setNewsletterUrl] = useState(org?.newsletterUrl ?? "");
  const [imageUrl, setImageUrl] = useState(org?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/studio/profile/image", {
        method: "POST",
        body: form,
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.imageUrl) {
        throw new Error(json?.error ?? `Upload failed (${res.status}).`);
      }
      setImageUrl(json.imageUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const body: Record<string, string> = { firstName, lastName };
      if (member.kind === "creator") {
        body.orgName = orgName;
        body.tagline = tagline;
        body.description = description;
        body.podcastUrl = podcastUrl;
        body.newsletterUrl = newsletterUrl;
      } else if (member.kind === "brand") {
        body.orgName = orgName;
        body.tagline = tagline;
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
  const isCreator = hasOrg && org.kind === "creator";

  return (
    <div className={styles.profileFormWrap}>
      <form className={styles.form} onSubmit={onSubmit}>
        {hasOrg && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-org-name">
              {isCreator ? "Show name" : "Brand name"}
            </label>
            <input
              id="profile-org-name"
              className={styles.input}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              maxLength={120}
            />
            <span className={styles.fieldHint}>
              The name on your card, as the network sees it.
            </span>
          </div>
        )}

        {hasOrg && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-tagline">
              Short description
            </label>
            <input
              id="profile-tagline"
              className={styles.input}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={140}
              placeholder={
                isCreator
                  ? "One line that sells the show — shown on your card."
                  : "One line on what you do — shown on your card."
              }
            />
            <span className={styles.fieldHint}>
              The one-liner on your roster card. Keep it sharp — 140
              characters max.
            </span>
          </div>
        )}

        {/* Image / logo ------------------------------------------- */}
        {hasOrg && (
          <div className={styles.field}>
            <span className={styles.label}>
              {isCreator ? "Show image" : "Brand logo"}
            </span>
            <div className={styles.uploadRow}>
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={org.name}
                  width={72}
                  height={72}
                  className={styles.uploadPreview}
                  unoptimized
                />
              ) : (
                <div className={styles.uploadPlaceholder} aria-hidden>
                  {org.name.trim().charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div className={styles.uploadControls}>
                <button
                  type="button"
                  className={styles.uploadBtn}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading
                    ? "Uploading…"
                    : imageUrl
                      ? "Replace image"
                      : "Upload image"}
                </button>
                <span className={styles.fieldHint}>
                  PNG, JPG, WebP, or SVG · up to 4 MB. Shown on your
                  roster card.
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onPickImage}
                hidden
              />
            </div>
          </div>
        )}

        {/* Contact ------------------------------------------------- */}
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

        {/* Story ---------------------------------------------------- */}
        {hasOrg && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-description">
              {isCreator
                ? "What is your show about, and who listens?"
                : "What does your brand stand for?"}
            </label>
            <textarea
              id="profile-description"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder={
                isCreator
                  ? "Your show's premise, your audience, and what makes it distinct. This is the description partners read on your card."
                  : "Your values, your products, and the partnerships you're looking for. This is the description creators read on your card."
              }
            />
            <span className={styles.fieldHint}>
              This is the main text on your roster card — write it for
              the partner you want to attract.
            </span>
          </div>
        )}

        {hasOrg && !isCreator && (
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

        {isCreator && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-podcast-url">
                Where does your show live today?
              </label>
              <input
                id="profile-podcast-url"
                className={styles.input}
                value={podcastUrl}
                onChange={(e) => setPodcastUrl(e.target.value)}
                placeholder="Host page, Apple/Spotify link, or RSS feed"
                inputMode="url"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-newsletter-url">
                Do you run a newsletter?
              </label>
              <input
                id="profile-newsletter-url"
                className={styles.input}
                value={newsletterUrl}
                onChange={(e) => setNewsletterUrl(e.target.value)}
                placeholder="Optional — paste the link if you do"
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
