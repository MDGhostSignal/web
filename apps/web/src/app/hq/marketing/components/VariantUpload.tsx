"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/components/admin";
import { MAX_PROXY_UPLOAD_BYTES, MAX_UPLOAD_BYTES } from "@/lib/marketing-assets";

import styles from "../marketing.module.css";

type Props = {
  assetId: string;
  /** Called after a successful upload or Drive-URL save. */
  onUploaded: () => void;
};

type Mode = "idle" | "uploading" | "error";

/**
 * Variant upload UI:
 *  - Drag-and-drop / file picker for file uploads.
 *  - Below the drop zone: a Drive URL paste-and-save row.
 *
 * Routing:
 *  - file.size ≤ MAX_PROXY_UPLOAD_BYTES → multipart proxy POST.
 *  - file.size  > MAX_PROXY_UPLOAD_BYTES → request signed URL, PUT
 *    directly to Supabase, then POST a confirm-upload back.
 *
 * Drive-URL paste → single JSON POST with kind: "drive-url".
 *
 * After any success we call onUploaded() so the parent can re-fetch.
 */
export function VariantUpload({ assetId, onUploaded }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState<string>("");
  const [driveLabel, setDriveLabel] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File): Promise<void> {
    if (file.size > MAX_UPLOAD_BYTES) {
      setMode("error");
      setError(`File exceeds 50 MB limit.`);
      return;
    }
    setMode("uploading");
    setError(null);
    setStatus("Preparing…");

    try {
      if (file.size <= MAX_PROXY_UPLOAD_BYTES) {
        setStatus("Uploading…");
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(
          `/api/admin/marketing-assets/${assetId}/files`,
          { method: "POST", body: form },
        );
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(`Upload failed (${res.status}): ${detail.slice(0, 200)}`);
        }
      } else {
        // Large-file path: signed URL → PUT → confirm.
        setStatus("Requesting signed URL…");
        const r1 = await fetch(
          `/api/admin/marketing-assets/${assetId}/files`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "request-upload",
              filename: file.name,
              size: file.size,
              mime: file.type || "application/octet-stream",
            }),
          },
        );
        if (!r1.ok) {
          const detail = await r1.text();
          throw new Error(
            `Signed-URL request failed (${r1.status}): ${detail.slice(0, 200)}`,
          );
        }
        const j1 = (await r1.json()) as { signedUrl: string; storagePath: string };

        setStatus(`Uploading ${file.name}…`);
        const r2 = await fetch(j1.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });
        if (!r2.ok) {
          const detail = await r2.text();
          throw new Error(
            `Direct upload failed (${r2.status}): ${detail.slice(0, 200)}`,
          );
        }

        setStatus("Confirming…");
        const r3 = await fetch(
          `/api/admin/marketing-assets/${assetId}/files`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "confirm-upload",
              storagePath: j1.storagePath,
              mime: file.type || "application/octet-stream",
              sizeBytes: file.size,
              variantLabel: file.name,
            }),
          },
        );
        if (!r3.ok) {
          const detail = await r3.text();
          throw new Error(
            `Confirm failed (${r3.status}): ${detail.slice(0, 200)}`,
          );
        }
      }

      setMode("idle");
      setStatus("");
      onUploaded();
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveDriveUrl(): Promise<void> {
    const trimmed = driveUrl.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setError("Enter a valid http(s) URL.");
      return;
    }
    setMode("uploading");
    setError(null);
    setStatus("Saving Drive URL…");
    try {
      const res = await fetch(
        `/api/admin/marketing-assets/${assetId}/files`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "drive-url",
            externalUrl: trimmed,
            variantLabel: driveLabel.trim() || null,
            mime: "text/uri-list",
          }),
        },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(
          `Drive URL save failed (${res.status}): ${detail.slice(0, 200)}`,
        );
      }
      setMode("idle");
      setStatus("");
      setDriveUrl("");
      setDriveLabel("");
      onUploaded();
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleFiles(files: FileList | null): void {
    if (!files || files.length === 0) return;
    // For v1, upload sequentially. UX is fine for the 1–10 files
    // someone usually adds at once.
    void (async () => {
      for (const file of Array.from(files)) {
        await uploadFile(file);
      }
    })();
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={styles.variantUpload}>
      <div
        className={[
          styles.dropZone,
          dragOver ? styles.dropZoneActive : "",
          mode === "uploading" ? styles.dropZoneBusy : "",
        ].join(" ")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className={styles.fileInput}
          onChange={handleChange}
        />
        <div className={styles.dropZoneLabel}>
          {mode === "uploading"
            ? status
            : "Drop files here or click to choose"}
        </div>
        <div className={styles.dropZoneHint}>
          Up to 50 MB · PNG, JPG, WebP, SVG, GIF, MP4, WebM, PDF, EPS, MD
        </div>
      </div>

      <div className={styles.driveRow}>
        <label className={styles.formLabel}>Or paste a Google Drive URL</label>
        <input
          type="text"
          className={styles.formInput}
          placeholder="Label (optional, e.g. 'Pitch Deck v3')"
          value={driveLabel}
          onChange={(e) => setDriveLabel(e.target.value)}
        />
        <div className={styles.driveRowInputRow}>
          <input
            type="url"
            className={styles.formInput}
            placeholder="https://drive.google.com/…"
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
          />
          <Button
            variant="secondary"
            type="button"
            onClick={saveDriveUrl}
            disabled={mode === "uploading" || driveUrl.trim().length === 0}
          >
            Save link
          </Button>
        </div>
      </div>

      {error && <div className={styles.formError}>{error}</div>}
    </div>
  );
}
