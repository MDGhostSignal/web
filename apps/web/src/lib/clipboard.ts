/**
 * Typed wrapper around the Clipboard API with a graceful fallback for
 * environments where `navigator.clipboard` is missing or denied (older
 * browsers, insecure contexts, restrictive iframes).
 *
 * Returns a promise that resolves to true on success, false on failure.
 * Never throws — callers always render the success/failure UI based on
 * the returned boolean.
 */

export async function copyText(text: string): Promise<boolean> {
  // Modern path: Clipboard API. Requires secure context (HTTPS or
  // localhost) and user gesture. Throws on permission denial.
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy path.
    }
  }

  // Legacy path: hidden textarea + document.execCommand("copy"). Works
  // back to IE11. Synchronous — must run inside the user-gesture call
  // stack, which we are (the click handler invoked us).
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  ta.style.top = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    const ok = document.execCommand("copy");
    return ok;
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}
