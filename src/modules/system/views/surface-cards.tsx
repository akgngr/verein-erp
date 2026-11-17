import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/modules/auth/server";
import { SurfaceCard } from "@/shared/components/ui/surface-card";

import { listSurfaceCards } from "../queries/dashboard";

/**
 * Başka modüllerin bu ekrana sunduğu kartlar (DashboardCardDefinition.surfaces). Yüzey sahibi modül kart
 * modüllerini import etmez; modül onayı ve kart yetkisi burada denetlenir. Hata veren kart yalnızca kendini gizler.
 */
export async function SurfaceCards({ surface, placement }: { surface: string; placement: "aside" | "main" }) {
  const user = await requireUser();
  const entries = await listSurfaceCards(surface, placement, user.role);
  if (entries.length === 0) return null;
  const tRoot = await getTranslations();
  const text = (key: string) => (tRoot.has(key) ? tRoot(key) : key);

  const rendered = await Promise.all(entries.map(async (entry) => {
    try {
      const tModule = await getTranslations(entry.moduleKey);
      const body = await entry.card.render({
        user: { id: user.id, role: user.role },
        t: (key, values) => tModule(key as never, values as never),
      });
      return { entry, body };
    } catch (error) {
      console.error(`[surface] Kart yüklenemedi (${entry.id}):`, error instanceof Error ? error.message : error);
      return { entry, body: null };
    }
  }));

  return (
    <>
      {rendered.filter(({ body }) => body !== null).map(({ entry, body }) => {
        const Icon = entry.card.icon;
        const title = text(`${entry.moduleKey}.${entry.card.titleKey}`);
        return (
          <section key={entry.id} aria-label={title}>
          <SurfaceCard className="relative overflow-hidden p-0" contentClassName="p-5">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-success-500 to-accent/40" aria-hidden="true" />
            <header className="mb-4 flex items-start gap-3">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {entry.card.href ? <Link href={entry.card.href} className="hover:underline">{title}</Link> : title}
                </h2>
                <p className="text-xs text-ink-500">{text(`${entry.moduleKey}.${entry.card.descriptionKey}`)}</p>
              </div>
            </header>
            {body}
          </SurfaceCard>
          </section>
        );
      })}
    </>
  );
}
