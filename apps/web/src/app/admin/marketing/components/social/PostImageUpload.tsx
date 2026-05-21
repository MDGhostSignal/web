"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/components/admin";
import { MAX_PROXY_UPLOAD_BYTES, MAX_UPLOAD_BYTES } from "@/lib/marketing-assets";

import styles from "../../marketing.module.css";

type Props = {
  postId: string;
  onUploaded: () => void;
};

type Mode = "idle" | "uploading" | "error";

/**
 * Image attach widget on the post detail modal. Mirrors the asset
 * library's VariantUpload pattern — proxy for ≤4 MB, signed-PUT for
 * larger — but tailored for social-post images (no per-platform label
 * dance, no Drive-URL path, no variant primary flag).
 */
export function PostImageUpload({ postId, onUploaded }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function uploadOne(file: File): Promise<void> {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`${file.name} exceeds 50 MB.`);
    }
    if (file.size <= MAX_PROXY_UPLOAD_BYTES) {
      setStatus(`Uploading ${file.name}…`);
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/admin/marketing-social/${postId}/images`,
        { method: "POST", body: form },
      );
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(`Upload failed (${res.status}): ${detail.slice(0, 200)}`);
      }
    } else {
      setStatus(`Requesting signed URL for ${file.name}…`);
      const r1 = await fetch(
        `/api/admin/marketing-social/${postId}/images`,
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
      const j1 = (await r1.json()) as {
        signedUrl: string;
        storagePath: string;
      };

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

      setStatus(`Confirming ${file.name}…`);
      const r3 = await fetch(
        `/api/admin/marketing-social/${postId}/images`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "confirm-upload",
            storagePath: j1.storagePath,
            mime: file.type || "application/octet-stream",
            sizeBytes: file.size,
          }),
        },
      );
      if (!r3.ok) {
        const detail = await r3.text();
        throw new Error(`Confirm failed (${r3.status}): ${detail.slice(0, 200)}`);
      }
    }
  }

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    setMode("uploading");
    setError(null);
    try {
      for (const f of Array.from(files)) {
        await uploadOne(f);
      }
      setMode("idle");
      setStatus("");
      onUploaded();
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>): void {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    void handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={styles.postImageUpload}>
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
          accept="image/*,video/mp4,video/webm"
          className={styles.fileInput}
          onChange={handleChange}
        />
        <div className={styles.dropZoneLabel}>
          {mode === "uploading" ? status : "Drop images here or click to choose"}
        </div>
        <div className={styles.dropZoneHint}>
          Up to 50 MB · PNG, JPG, WebP, GIF, MP4, WebM
        </div>
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {mode === "error" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMode("idle");
            setError(null);
          }}
        >
          Dismiss
        </Button>
      )}
    </div>
  );
}
