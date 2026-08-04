"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { MemberIntake, StudioOrgProfile } from "@/lib/studio-data";

import styles from "../studio.module.css";

/** Client form for /studio/profile — the member-facing onboarding
 *  questionnaire. Sends only field values; the server derives which
 *  rows to write from the session. The image uploads separately (its
 *  own route) so a failed save never orphans a stored blob. */
export function ProfileForm({
  member,
  org,
  intake,
}: {
  member: {
    kind: "brand" | "creator" | "other";
    firstName: string | null;
    lastName: string | null;
  };
  org: StudioOrgProfile | null;
  intake: MemberIntake | null;
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
  const [rssUrl, setRssUrl] = useState(org?.rssUrl ?? "");
  const [podProvider, setPodProvider] = useState(intake?.podProvider ?? "");
  const [podMonthlyListens, setPodMonthlyListens] = useState(
    intake?.podMonthlyListens ?? "",
  );
  const [podFrequency, setPodFrequency] = useState(intake?.podFrequency ?? "");
  const [nlInterest, setNlInterest] = useState(intake?.nlInterest ?? false);
  const [nlProvider, setNlProvider] = useState(intake?.nlProvider ?? "");
  const [nlOpenRate, setNlOpenRate] = useState(intake?.nlOpenRate ?? "");
  const [nlFrequency, setNlFrequency] = useState(intake?.nlFrequency ?? "");
  const [nlSubscribers, setNlSubscribers] = useState(intake?.nlSubscribers ?? "");
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
      const body: Record<string, unknown> = { firstName, lastName };
      // Newsletter-ads block — always sent, so unticking or clearing
      // a field persists (docs/STUDIO_NL_ADVERTISING.sql columns).
      body.nlAdsInterest = nlInterest;
      body.nlProvider = nlProvider;
      body.nlOpenRate = nlOpenRate;
      body.nlFrequency = nlFrequency;
      body.nlSubscribers = nlSubscribers;
      // Podcast info (docs/STUDIO_POD_INFO.sql) — creator-kind only;
      // always sent so clears persist.
      if (member.kind === "creator" || org?.kind === "creator") {
        body.podProvider = podProvider;
        body.podMonthlyListens = podMonthlyListens;
        body.podFrequency = podFrequency;
      }
      if (org) {
        body.tagline = tagline;
        body.description = description;
        if (org.kind === "creator") {
          body.orgName = orgName;
          body.podcastUrl = podcastUrl;
          body.rssUrl = rssUrl;
        } else if (org.kind === "brand") {
          body.orgName = orgName;
          body.website = website;
        }
      }
      if (member.kind === "creator" && org?.kind !== "creator") {
        // Creator without a linked creators row yet (fresh invite):
        // send the feed anyway — the API lazy-creates the row so the
        // RSS lands on record either way.
        body.rssUrl = rssUrl;
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
  const isCreator = org?.kind === "creator";
  const isBrand = org?.kind === "brand";
  const isPersonal = org?.kind === "member";

  return (
    <div className={styles.profileFormWrap}>
      <form className={styles.formGrid} onSubmit={onSubmit}>
        {(isCreator || isBrand) && (
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
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>
              {isCreator
                ? "Show image"
                : isPersonal
                  ? "Profile image"
                  : "Brand logo"}
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
          <div className={`${styles.field} ${styles.fieldWide}`}>
            <label className={styles.label} htmlFor="profile-description">
              {isCreator
                ? "What is your show about, and who listens?"
                : isPersonal
                  ? "Descriptive text — who are you?"
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
                  : isPersonal
                    ? "Who you are and what you do in the network. This is the description others read on your card."
                    : "Your values, your products, and the partnerships you're looking for. This is the description creators read on your card."
              }
            />
            <span className={styles.fieldHint}>
              This is the main text on your roster card — write it for
              the partner you want to attract.
            </span>
          </div>
        )}

        {isBrand && (
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

        {/* RSS is asked of every creator-kind member, even before a
            creators row exists (fresh invites) — the save lazy-creates
            the row. Operationally important: this feed is what the
            team imports into ART19. */}
        {(isCreator || member.kind === "creator") && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="profile-rss-url">
              Your show&apos;s RSS feed URL
            </label>
            <input
              id="profile-rss-url"
              className={styles.input}
              value={rssUrl}
              onChange={(e) => setRssUrl(e.target.value)}
              placeholder="https://feeds.example.com/your-show"
              inputMode="url"
            />
            <span className={styles.fieldHint}>
              The feed your current host publishes — the team needs it
              on record for the ART19 move.
            </span>
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
          </>
        )}

        {/* Podcast info — the NL questions, podcast flavor; values
            live on the CRM member row (docs/STUDIO_POD_INFO.sql). */}
        {(isCreator || member.kind === "creator") && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-pod-provider">
                Current podcast host
              </label>
              <input
                id="profile-pod-provider"
                className={styles.input}
                value={podProvider}
                onChange={(e) => setPodProvider(e.target.value)}
                placeholder="e.g. Buzzsprout, Libsyn, Spotify for Creators"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-pod-listens">
                Average listens per month
              </label>
              <input
                id="profile-pod-listens"
                className={styles.input}
                value={podMonthlyListens}
                onChange={(e) => setPodMonthlyListens(e.target.value)}
                placeholder="e.g. 25,000"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="profile-pod-frequency">
                Podcast frequency
              </label>
              <input
                id="profile-pod-frequency"
                className={styles.input}
                value={podFrequency}
                onChange={(e) => setPodFrequency(e.target.value)}
                placeholder="e.g. weekly"
              />
            </div>
          </>
        )}

        {/* Newsletter-advertising opt-in — same block as the register
            page; values live on the CRM member row. */}
        <div className={`${styles.optInField} ${styles.fieldWide}`}>
          <label className={styles.optInRow} htmlFor="profile-nl-interest">
            <input
              id="profile-nl-interest"
              type="checkbox"
              className={styles.optInCheckbox}
              checked={nlInterest}
              onChange={(e) => setNlInterest(e.target.checked)}
            />
            <span className={styles.optInText}>
              I am interested in Email Newsletter Advertising
            </span>
          </label>
          {nlInterest && (
            <div className={styles.optInFields}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="profile-nl-provider">
                  Current newsletter provider
                </label>
                <input
                  id="profile-nl-provider"
                  className={styles.input}
                  value={nlProvider}
                  onChange={(e) => setNlProvider(e.target.value)}
                  placeholder="e.g. Substack, beehiiv, Mailchimp"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="profile-nl-open-rate">
                  Current NL open rate
                </label>
                <input
                  id="profile-nl-open-rate"
                  className={styles.input}
                  value={nlOpenRate}
                  onChange={(e) => setNlOpenRate(e.target.value)}
                  placeholder="e.g. 45%"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="profile-nl-frequency">
                  NL frequency
                </label>
                <input
                  id="profile-nl-frequency"
                  className={styles.input}
                  value={nlFrequency}
                  onChange={(e) => setNlFrequency(e.target.value)}
                  placeholder="e.g. weekly"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="profile-nl-subscribers">
                  Current subscriber size
                </label>
                <input
                  id="profile-nl-subscribers"
                  className={styles.input}
                  value={nlSubscribers}
                  onChange={(e) => setNlSubscribers(e.target.value)}
                  placeholder="e.g. 12,000"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className={`${styles.error} ${styles.fieldWide}`}>{error}</div>
        )}
        {saved && !error && (
          <div className={`${styles.formSaved} ${styles.fieldWide}`}>
            Profile saved.
          </div>
        )}

        <button
          className={`${styles.submit} ${styles.fieldWide} ${styles.submitStart}`}
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
