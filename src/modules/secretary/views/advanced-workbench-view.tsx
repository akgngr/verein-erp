import Link from "next/link";

import { filterAdvancedItems, type AdvancedSecretaryItem, type AdvancedSecretaryKind, type AdvancedSecretaryStatus } from "./advanced-workbench-policy";

export type AdvancedWorkbenchLabels = {
  title: string;
  empty: string;
  openSource: string;
  approvalRequired: string;
  kinds: Record<AdvancedSecretaryKind, string>;
  statuses: Record<AdvancedSecretaryStatus, string>;
};

/**
 * S4/S5 read-only workbench. A server adapter must supply permission-checked and sanitized
 * projections; this view never fetches source modules or triggers any external action.
 * Do not mount mock/demo data in production.
 */
export function SecretaryAdvancedWorkbenchView({
  items,
  labels,
}: {
  items: readonly AdvancedSecretaryItem[];
  labels: AdvancedWorkbenchLabels;
}) {
  const visible = filterAdvancedItems(items);
  return (
    <section aria-label={labels.title} className="space-y-3">
      <h2 className="text-base font-semibold">{labels.title}</h2>
      {visible.length === 0 ? (
        <p className="rounded-xl border border-ink-200/80 p-4 text-sm text-ink-500">{labels.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id} className="min-w-0 rounded-xl border border-ink-200/80 bg-surface p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span>{labels.kinds[item.kind]}</span>
                <span aria-hidden="true">·</span>
                <span>{labels.statuses[item.status]}</span>
              </div>
              <h3 className="break-words text-sm font-semibold">{item.title}</h3>
              {item.description ? <p className="mt-2 break-words text-sm text-ink-500">{item.description}</p> : null}
              {item.requiresApproval ? (
                <p className="mt-3 text-xs font-medium text-warning">{labels.approvalRequired}</p>
              ) : null}
              {item.sourceHref ? (
                <Link
                  className="mt-3 inline-flex rounded-md py-1 text-sm text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2"
                  href={item.sourceHref}
                >
                  {labels.openSource}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
