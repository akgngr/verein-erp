"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/shared/components/kit";
import { notify } from "@/shared/components/ui/notify";

import { dismissItemAction, restoreItemAction, snoozeItemAction } from "../actions/item-state";
import { snoozeTarget } from "./item-action-dates";

export type ItemActionLabels = {
  dismiss: string;
  tomorrow: string;
  nextWeek: string;
  undo: string;
  done: string;
  error: string;
};

type Operation = "dismiss" | "tomorrow" | "nextWeek" | "undo";

export function SecretaryItemActions({ itemId, labels, children }: { itemId: string; labels: ItemActionLabels; children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<Operation | null>(null);
  const [hidden, setHidden] = useState(false);

  async function perform(operation: Operation) {
    if (pending) return;
    setPending(operation);
    try {
      const result = operation === "dismiss" ? await dismissItemAction({ itemId })
        : operation === "undo" ? await restoreItemAction({ itemId })
        : await snoozeItemAction({ itemId, until: snoozeTarget(new Date(), operation === "tomorrow" ? 1 : 7) });
      if (!result.ok) { notify.error(result.error || labels.error); return; }
      if (operation === "undo") {
        setHidden(false);
        notify.success(labels.done);
        router.refresh();
      } else {
        // Keep local Undo visible while navigating this page. Server visibility
        // will be recalculated on the next page navigation / revalidation.
        setHidden(true);
        notify.success(labels.done);
      }
    } catch {
      notify.error(labels.error);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-w-0 w-full space-y-2" aria-busy={pending !== null}>
      {hidden ? (
        <div className="flex flex-wrap items-center gap-2" role="status">
          <span className="text-sm text-ink-500">{labels.done}</span>
          <Button size="sm" variant="secondary" isDisabled={pending !== null} onPress={() => void perform("undo")}>{labels.undo}</Button>
        </div>
      ) : (
        <>
          {children}
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="ghost" isDisabled={pending !== null} onPress={() => void perform("dismiss")}>{labels.dismiss}</Button>
            <Button size="sm" variant="ghost" isDisabled={pending !== null} onPress={() => void perform("tomorrow")}>{labels.tomorrow}</Button>
            <Button size="sm" variant="ghost" isDisabled={pending !== null} onPress={() => void perform("nextWeek")}>{labels.nextWeek}</Button>
          </div>
        </>
      )}
    </div>
  );
}
