/**
 * esignatures.com template registry — the templates the admin
 * "+ New X Contract" buttons jump to. These are full edit-URLs (require
 * an esignatures.com login). Not secrets — just the same URLs the user
 * would bookmark.
 *
 * To add a new template: drop in a new entry here, then add a matching
 * <Button href={...} target="_blank"> in
 * apps/web/src/app/admin/contracts/page.tsx's header `actions`.
 */
export type EsignaturesTemplate = {
  /** Display label used in the button copy. */
  label: string;
  /** Full URL to the template's edit page on esignatures.com. */
  editUrl: string;
};

export const ESIGNATURES_TEMPLATES = {
  creator: {
    label: "Creator",
    editUrl:
      "https://esignatures.com/contract_templates/2496e02a-b352-4502-8a61-b2e524452ccf/edit",
  },
  // brand: { label: "Brand", editUrl: "https://esignatures.com/contract_templates/<id>/edit" },
} as const satisfies Record<string, EsignaturesTemplate>;
