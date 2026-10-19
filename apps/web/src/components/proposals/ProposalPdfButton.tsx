"use client";

import styles from "./ProposalPdfButton.module.css";

type Props = {
  filename: string;
  tone?: "dark" | "light";
};

export function ProposalPdfButton({ filename, tone = "dark" }: Props) {
  async function onClick() {
    const slides = document.querySelectorAll("[data-proposal-viewport]");
    for (const slide of slides) {
      slide.scrollIntoView({ block: "start" });
    }
    const images = [...document.images];
    for (const img of images) {
      img.loading = "eager";
    }
    const decoded = Promise.all(
      images.map(async (img) => {
        if (img.complete && img.naturalWidth > 0) return;
        try {
          await img.decode();
        } catch {
          await new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        }
      }),
    );
    await Promise.race([
      decoded,
      new Promise((resolve) => window.setTimeout(resolve, 8000)),
    ]);
    slides[0]?.scrollIntoView({ block: "start" });
    const previous = document.title;
    document.title = filename;
    const restore = () => {
      document.title = previous;
    };
    window.addEventListener("afterprint", restore, { once: true });
    window.print();
  }

  return (
    <button
      type="button"
      className={tone === "light" ? styles.buttonLight : styles.button}
      onClick={onClick}
    >
      Download PDF
    </button>
  );
}
