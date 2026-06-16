import { ContractDetailView } from "./ContractDetailView";

/**
 * /admin/contracts/[id] — thin server shell.
 *
 * Resolves the dynamic param server-side and forwards the id to a
 * client component. Keeping `use(params)` out of the client component
 * sidesteps a Turbopack dev-mode SWC crash that bit this route in
 * Next 16.
 */
export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContractDetailView id={id} />;
}
