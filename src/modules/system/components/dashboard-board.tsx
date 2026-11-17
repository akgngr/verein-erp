"use client";
import { Button, toast } from "@heroui/react";
import { StatusChip, Tooltip } from "@/shared/components/kit";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";

import { PageHeader } from "@/shared/components/ui/page-header";
import type { DashboardCardSize } from "@/shared/types/dashboard";
import { cn } from "@/shared/utils";

import {
  resetDashboardLayoutAction,
  saveDashboardLayoutAction,
} from "../actions/dashboard-layout";

export type DashboardBoardCard = {
  id: string;
  title: string;
  description: string;
  moduleLabel: string;
  size: DashboardCardSize;
  href?: string;
  icon: ReactNode;
};

type PlacedCard = DashboardBoardCard & {
  body: ReactNode | null;
  failed: boolean;
};

const SIZE_CLASS: Record<DashboardCardSize, string> = {
  sm: "",
  md: "sm:col-span-2",
  lg: "sm:col-span-2 lg:col-span-3",
};

/**
 * Panel ızgarası + düzenleme modu. Kart gövdeleri sunucuda üretilir; burada yalnızca sıra,
 * ekleme ve kaldırma yönetilir. Her değişiklik hemen kaydedilir; eklenen kart sunucuda çizilsin
 * diye sayfa yenilenir.
 */
export function DashboardBoard({
  title,
  description,
  placed,
  available,
}: {
  title: string;
  description: string;
  placed: PlacedCard[];
  available: DashboardBoardCard[];
}) {
  const t = useTranslations("panel");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  // Sıra değişikliği anında görünsün diye yerel kopya; sunucudan yeni liste gelince ona uyar.
  const [order, setOrder] = useState(placed.map((card) => card.id));
  const [source, setSource] = useState(placed);
  if (source !== placed) {
    setSource(placed);
    setOrder(placed.map((card) => card.id));
  }

  const byId = new Map(placed.map((card) => [card.id, card]));
  const cards = order.flatMap((id) => {
    const card = byId.get(id);
    return card ? [card] : [];
  });

  const save = (next: string[]) => {
    setOrder(next);
    startTransition(async () => {
      const result = await saveDashboardLayoutAction({ cards: next });
      if (!result.ok) {
        toast(t("saveError"), { description: result.error, variant: "danger" });
        setOrder(placed.map((card) => card.id));
        return;
      }
      router.refresh();
    });
  };

  // Sürükle-bırak (düzenleme modu): sürüklerken sıra yerelde canlı değişir, bırakınca kaydedilir.
  // Ok düğmeleri klavye ve dokunmatik ekranlar için kalır.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragStartOrder, setDragStartOrder] = useState<string[] | null>(null);

  const dragOver = (overId: string) => {
    if (!dragId || dragId === overId) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== dragId);
      next.splice(
        next.indexOf(overId) +
          (current.indexOf(dragId) < current.indexOf(overId) ? 1 : 0),
        0,
        dragId,
      );
      return next;
    });
  };

  const finishDrag = () => {
    const changed =
      dragStartOrder !== null && dragStartOrder.join() !== order.join();
    setDragId(null);
    setDragStartOrder(null);
    if (changed) save(order);
  };

  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    save(next);
  };

  const reset = () =>
    startTransition(async () => {
      const result = await resetDashboardLayoutAction();
      if (!result.ok) {
        toast(t("saveError"), { description: result.error, variant: "danger" });
        return;
      }
      router.refresh();
    });

  // Görüntüleme modunda gösterecek bir şeyi olmayan (null) kartlar gizlenir.
  const visibleCards = editing
    ? cards
    : cards.filter((card) => card.body !== null || card.failed);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={title}
        description={description}
        actions={
          editing ? (
            <div className="flex gap-2">
              <Button variant="tertiary" onPress={reset} isDisabled={pending}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                {t("reset")}
              </Button>
              <Button onPress={() => setEditing(false)}>
                <Check className="h-4 w-4" aria-hidden />
                {t("done")}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onPress={() => setEditing(true)}>
              <LayoutGrid className="h-4 w-4" aria-hidden />
              {t("edit")}
            </Button>
          )
        }
      />

      {editing ? (
        <p className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          {t("editHint")}
        </p>
      ) : null}

      {visibleCards.length === 0 && !editing ? (
        <p className="rounded-xl border border-dashed border-ink-300 p-8 text-center text-sm text-ink-500">
          {t("empty")}
        </p>
      ) : (
        <div
          className={cn(
            "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
            pending && "opacity-70",
          )}
        >
          {visibleCards.map((card) => {
            const index = order.indexOf(card.id);
            return (
              <section
                key={card.id}
                aria-label={card.title}
                draggable={editing && !pending}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", card.id);
                  setDragId(card.id);
                  setDragStartOrder(order);
                }}
                onDragOver={(event) => {
                  if (!dragId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  dragOver(card.id);
                }}
                onDrop={(event) => event.preventDefault()}
                onDragEnd={finishDrag}
                className={cn(
                  "erp-motion-enter erp-motion-interactive flex flex-col gap-3 rounded-xl border bg-surface p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md",
                  editing
                    ? "cursor-grab border-dashed border-brand-300 active:cursor-grabbing"
                    : "border-ink-200/80",
                  dragId === card.id && "opacity-40",
                  SIZE_CLASS[card.size],
                )}
              >
                <header className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {editing ? (
                      <GripVertical
                        className="h-4 w-4 shrink-0 text-ink-400"
                        aria-hidden
                      />
                    ) : null}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-ink-200/70 bg-surface-secondary text-ink-600 dark:text-accent">
                      {card.icon}
                    </span>
                    {card.href && !editing ? (
                      <Link
                        href={card.href}
                        className="truncate text-[13px] font-semibold text-foreground hover:text-accent"
                      >
                        {card.title}
                      </Link>
                    ) : (
                      <span className="truncate text-[13px] font-semibold text-foreground">
                        {card.title}
                      </span>
                    )}
                  </div>
                  {editing ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Tooltip delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="tertiary"
                          aria-label={t("moveUp")}
                          isDisabled={index === 0 || pending}
                          onPress={() => move(index, -1)}
                        >
                          <ArrowLeft className="h-4 w-4" aria-hidden />
                        </Button>

                        <Tooltip.Content>{t("moveUp")}</Tooltip.Content>
                      </Tooltip>
                      <Tooltip delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="tertiary"
                          aria-label={t("moveDown")}
                          isDisabled={index === order.length - 1 || pending}
                          onPress={() => move(index, 1)}
                        >
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Button>

                        <Tooltip.Content>{t("moveDown")}</Tooltip.Content>
                      </Tooltip>
                      <Tooltip delay={300}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="danger-soft"
                          aria-label={t("remove")}
                          isDisabled={pending}
                          onPress={() =>
                            save(order.filter((id) => id !== card.id))
                          }
                        >
                          <X className="h-4 w-4" aria-hidden />
                        </Button>

                        <Tooltip.Content>{t("remove")}</Tooltip.Content>
                      </Tooltip>
                    </div>
                  ) : null}
                </header>
                {card.failed ? (
                  <p className="text-sm text-danger">{t("cardError")}</p>
                ) : card.body === null ? (
                  <p className="text-sm text-ink-500">{t("nothingNow")}</p>
                ) : (
                  <div className="flex-1">{card.body}</div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {t("available")}
          </h2>
          {available.length === 0 ? (
            <p className="text-sm text-ink-500">{t("noneAvailable")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((card) => (
                <div
                  key={card.id}
                  className="erp-motion-enter erp-motion-interactive flex flex-col gap-3 rounded-xl border border-ink-200/80 bg-ink-50/60 p-4 hover:border-ink-300 hover:bg-surface"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-600">
                      {card.icon}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {card.title}
                      </span>
                      <span className="text-xs text-ink-500">
                        {card.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <StatusChip>
                        {card.moduleLabel}
                      </StatusChip>
                      <StatusChip>
                        {t(`sizes.${card.size}`)}
                      </StatusChip>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={pending}
                      onPress={() => save([...order, card.id])}
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                      {t("add")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
