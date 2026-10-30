"use client";

import { Button, Chip, Tooltip, addToast } from "@heroui/react";
import { ArrowLeft, ArrowRight, Check, GripVertical, LayoutGrid, Plus, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition, type ReactNode } from "react";

import { PageHeader } from "@/shared/components/ui/page-header";
import type { DashboardCardSize } from "@/shared/types/dashboard";
import { cn } from "@/shared/utils";

import { resetDashboardLayoutAction, saveDashboardLayoutAction } from "../actions/dashboard-layout";

export type DashboardBoardCard = {
  id: string;
  title: string;
  description: string;
  moduleLabel: string;
  size: DashboardCardSize;
  href?: string;
  icon: ReactNode;
};

type PlacedCard = DashboardBoardCard & { body: ReactNode | null; failed: boolean };

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
        addToast({ title: t("saveError"), description: result.error, color: "danger" });
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
      next.splice(next.indexOf(overId) + (current.indexOf(dragId) < current.indexOf(overId) ? 1 : 0), 0, dragId);
      return next;
    });
  };

  const finishDrag = () => {
    const changed = dragStartOrder !== null && dragStartOrder.join() !== order.join();
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
        addToast({ title: t("saveError"), description: result.error, color: "danger" });
        return;
      }
      router.refresh();
    });

  // Görüntüleme modunda gösterecek bir şeyi olmayan (null) kartlar gizlenir.
  const visibleCards = editing ? cards : cards.filter((card) => card.body !== null || card.failed);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          editing ? (
            <div className="flex gap-2">
              <Button variant="light" startContent={<RotateCcw className="h-4 w-4" aria-hidden />} onPress={reset} isDisabled={pending}>
                {t("reset")}
              </Button>
              <Button color="primary" startContent={<Check className="h-4 w-4" aria-hidden />} onPress={() => setEditing(false)}>
                {t("done")}
              </Button>
            </div>
          ) : (
            <Button variant="flat" startContent={<LayoutGrid className="h-4 w-4" aria-hidden />} onPress={() => setEditing(true)}>
              {t("edit")}
            </Button>
          )
        }
      />

      {editing ? (
        <p className="rounded-xl border border-primary-200 bg-primary-50/60 p-3 text-small text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300">
          {t("editHint")}
        </p>
      ) : null}

      {visibleCards.length === 0 && !editing ? (
        <p className="rounded-xl border border-dashed border-default-300 p-8 text-center text-small text-default-500">
          {t("empty")}
        </p>
      ) : (
        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", pending && "opacity-70")}>
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
                  "flex flex-col gap-3 rounded-xl border bg-content1 p-5 shadow-xs transition-opacity",
                  editing ? "cursor-grab border-dashed border-primary-300 active:cursor-grabbing" : "border-default-200/80",
                  dragId === card.id && "opacity-40",
                  SIZE_CLASS[card.size],
                )}
              >
                <header className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {editing ? <GripVertical className="h-4 w-4 shrink-0 text-default-400" aria-hidden /> : null}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                      {card.icon}
                    </span>
                    {card.href && !editing ? (
                      <Link href={card.href} className="truncate text-small font-semibold text-foreground/80 hover:text-primary">
                        {card.title}
                      </Link>
                    ) : (
                      <span className="truncate text-small font-semibold text-foreground/80">{card.title}</span>
                    )}
                  </div>
                  {editing ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Tooltip content={t("moveUp")} delay={300}>
                        <Button isIconOnly size="sm" variant="light" aria-label={t("moveUp")} isDisabled={index === 0 || pending} onPress={() => move(index, -1)}>
                          <ArrowLeft className="h-4 w-4" aria-hidden />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t("moveDown")} delay={300}>
                        <Button isIconOnly size="sm" variant="light" aria-label={t("moveDown")} isDisabled={index === order.length - 1 || pending} onPress={() => move(index, 1)}>
                          <ArrowRight className="h-4 w-4" aria-hidden />
                        </Button>
                      </Tooltip>
                      <Tooltip content={t("remove")} delay={300}>
                        <Button isIconOnly size="sm" variant="light" color="danger" aria-label={t("remove")} isDisabled={pending} onPress={() => save(order.filter((id) => id !== card.id))}>
                          <X className="h-4 w-4" aria-hidden />
                        </Button>
                      </Tooltip>
                    </div>
                  ) : null}
                </header>
                {card.failed ? (
                  <p className="text-small text-danger">{t("cardError")}</p>
                ) : card.body === null ? (
                  <p className="text-small text-default-500">{t("nothingNow")}</p>
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
          <h2 className="text-medium font-semibold text-foreground">{t("available")}</h2>
          {available.length === 0 ? (
            <p className="text-small text-default-500">{t("noneAvailable")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((card) => (
                <div key={card.id} className="flex flex-col gap-3 rounded-xl border border-default-200/80 bg-default-50/60 p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-default-100 text-default-600">
                      {card.icon}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-small font-semibold text-foreground">{card.title}</span>
                      <span className="text-tiny text-default-500">{card.description}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <Chip size="sm" variant="flat">{card.moduleLabel}</Chip>
                      <Chip size="sm" variant="flat">{t(`sizes.${card.size}`)}</Chip>
                    </div>
                    <Button size="sm" color="primary" variant="flat" startContent={<Plus className="h-4 w-4" aria-hidden />} isDisabled={pending} onPress={() => save([...order, card.id])}>
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
