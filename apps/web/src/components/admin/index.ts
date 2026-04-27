/**
 * Admin design-system barrel. Import everything from
 * `@/components/admin` so consumers never reference individual files —
 * this lets us reorganise internals later without touching callers.
 *
 * Tokens are side-effect CSS: import "@/components/admin/tokens.css"
 * once in the root layout (or admin layout) so the variables are
 * available everywhere.
 */

export { AdminShell } from "./AdminShell";
export type { AdminTab } from "./AdminShell";

export { ThemeToggle } from "./ThemeToggle";
export type { AdminTheme } from "./ThemeToggle";

export { Button } from "./Button";
export type { Props as ButtonProps } from "./Button";

export { Badge, clarityVariant, typeVariant } from "./Badge";
export type { BadgeVariant } from "./Badge";

export { Modal } from "./Modal";

export {
  DataTable,
  DetailsGrid,
  DetailsSection,
  DetailsActions,
} from "./DataTable";
export type { Column, ColumnVariant } from "./DataTable";

export { SearchInput } from "./SearchInput";

export { PageHeader } from "./PageHeader";

export {
  Spinner,
  Loading,
  EmptyState,
  ErrorCard,
  ErrorPage,
} from "./StateViews";
