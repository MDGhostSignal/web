import styles from "../contracts.module.css";

type Props = {
  contractId: string;
  /** True when our cached `contracts.raw.contract_pdf_url` is set —
   *  i.e. at least one signer has signed at some point and esignatures
   *  has published a PDF. Drives the empty-state vs embed branch
   *  without having to hit the proxy just to discover "no PDF". */
  hasPdf: boolean;
};

/**
 * PDF preview for a signed contract. esignatures.com surfaces a signed
 * PDF URL once at least one signer has acted; until then we render a
 * placeholder.
 *
 * URL strategy: the iframe targets `/api/admin/contracts/:id/pdf`, a
 * thin server-side proxy that re-fetches the contract from esignatures
 * live and 307-redirects to the current signed S3 URL. esignatures'
 * signed URLs have a ~48 h TTL — caching the URL in our DB caused the
 * "AccessDenied / Request has expired" S3 error a couple of days after
 * the contract was synced. The proxy redirect issues a fresh URL on
 * every load.
 *
 * Embed strategy: `<iframe>` (not `<object>`). Modern Chrome / Edge
 * routinely render `<object data="…" type="application/pdf">` as a
 * blank white frame even with a valid URL — their built-in PDF viewer
 * only triggers for top-level navigations and `<iframe>` embeds. The
 * "Open in a new tab" link below the embed is a permanent escape
 * hatch (download, or any case the iframe rendering fails).
 */
export function ContractPdfEmbed({ contractId, hasPdf }: Props) {
  if (!hasPdf) {
    return (
      <div className={styles.pdfEmpty}>
        No signed PDF available yet — esignatures.com publishes the PDF
        after the first signature lands. Hit “Resync now” once you’ve
        confirmed a signer has signed and the URL will appear here.
      </div>
    );
  }
  const proxyUrl = `/api/admin/contracts/${encodeURIComponent(contractId)}/pdf`;
  // #view=FitH is consumed by the in-browser PDF viewer after the
  // 307 redirect resolves — most viewers preserve the URL fragment
  // across redirects.
  return (
    <div className={styles.pdfWrap}>
      <iframe
        src={`${proxyUrl}#view=FitH`}
        title="Signed contract PDF"
        className={styles.pdfFrame}
      />
      <a
        href={proxyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.pdfOpen}
      >
        Open PDF in a new tab ↗
      </a>
    </div>
  );
}
