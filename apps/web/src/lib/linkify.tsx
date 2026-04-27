import { Fragment, type ReactNode } from "react";

/**
 * Renders a plain string with any http(s) URL turned into a clickable
 * anchor. Splits the input on URL matches and intersperses anchor
 * elements; non-URL runs pass through as plain text.
 *
 * Anchors stop click propagation so the surrounding clickable
 * surface (e.g. a task tile that opens a detail panel) doesn't fire
 * when the user actually wants to follow the link.
 */
export function LinkifiedText({ text }: { text: string }) {
  // Fresh regex per call so `lastIndex` mutation stays scoped to this
  // invocation (avoids cross-call state leak with /g, and avoids the
  // react-hooks/immutability rule on a module-scoped const).
  const urlRe = /(https?:\/\/[^\s)<>"]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = urlRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`t-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>,
      );
    }
    const url = match[0];
    parts.push(
      <a
        key={`l-${match.index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = match.index + url.length;
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={`t-end`}>{text.slice(lastIndex)}</Fragment>);
  }
  return <>{parts}</>;
}
