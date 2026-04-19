"use client";

import Lottie from "lottie-react";
import { useEffect, useState } from "react";

type LazyLottieProps = {
  /** Public path to the Lottie JSON file. */
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
};

/**
 * Renders a Lottie animation whose JSON is fetched at runtime from the
 * given public URL, keeping the (often large) animation data out of the
 * initial page JS bundle. Falls back silently if the fetch fails — this
 * is decorative.
 */
export function LazyLottie({
  src,
  loop = true,
  autoplay = true,
  className,
}: LazyLottieProps) {
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        /* decorative — ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!data) return null;

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  );
}
