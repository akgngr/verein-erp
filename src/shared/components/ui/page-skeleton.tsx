/**
 * Sayfa yüklenirken içerik alanının iskeleti (kabuk ve menü yerinde kalır). Sunucu bileşeni;
 * HeroUI kullanmaz. Ekran okuyucular için aria-busy ve görünmeyen durum metni taşır.
 */
const bar = "animate-pulse rounded-medium bg-default-200/70 dark:bg-default-100/60";

export function PageSkeleton({ label, cards = 6 }: { label: string; cards?: number }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2">
        <div className={`${bar} h-7 w-56`} />
        <div className={`${bar} h-4 w-full max-w-xl`} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 rounded-large border border-default-200 bg-content1 p-4">
            <div className="flex items-start gap-3">
              <div className={`${bar} h-9 w-9 shrink-0`} />
              <div className="flex flex-1 flex-col gap-2">
                <div className={`${bar} h-4 w-2/5`} />
                <div className={`${bar} h-3 w-4/5`} />
              </div>
            </div>
            <div className="flex gap-1.5">
              {[14, 18, 16].map((width) => (
                <div key={width} className={`${bar} h-6 rounded-full`} style={{ width: `${width * 4}px` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-large border border-default-200 bg-content1 p-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={`${bar} h-8 w-full`} />
        ))}
      </div>
    </div>
  );
}
