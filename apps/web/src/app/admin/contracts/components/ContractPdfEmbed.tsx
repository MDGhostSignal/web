import styles from "../contracts.module.css";

type Props = {
  url: string | null | undefined;
};

/**
 * PDF preview for a signed contract. esignatures.com surfaces a signed
 * PDF URL once at least one signer has acted; until then `url` is null
 * and we render a placeholder instead of an empty <object> that browsers
 * paint as a blank white frame.
 *
 * Mirrors the asset library's PDF embed pattern (object tag, no
 * sandboxed iframe — these URLs are first-party esignatures CDN).
 */
export function ContractPdfEmbed({ url }: Props) {
  if (!url) {
    return (
      <div className={styles.pdfEmpty}>
        No signed PDF available yet — esignatures.com publishes the PDF
        after the first signature lands. Hit “Resync now” once you’ve
        confirmed a signer has signed and the URL will appear here.
      </div>
    );
  }
  return (
    <object data={url} type="application/pdf" className={styles.pdfFrame}>
      <div className={styles.pdfEmpty}>
        Your browser can’t embed PDFs.{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Open in a new tab.
        </a>
      </div>
    </object>
  );
}
