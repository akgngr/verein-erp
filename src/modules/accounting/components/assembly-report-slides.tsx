"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  FileText,
  TrendingUp,
  TrendingDown,
  Layers,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { ActionButton } from "@/shared/components/ui/action-button";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { formatMoney } from "@/shared/money";

import type { TreasurerReportResult } from "../services/treasurer-report";

interface AssemblyReportSlidesProps {
  report: TreasurerReportResult;
  initialLang?: "tr" | "de";
  onClose?: () => void;
}

export function AssemblyReportSlides({
  report,
  initialLang = "tr",
  onClose,
}: AssemblyReportSlidesProps) {
  const t = useTranslations("accounting.reports.treasurer");
  const [slide, setSlide] = useState(0);
  const [displayLang, setDisplayLang] = useState<"tr" | "de">(initialLang);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalSlides = 5;

  const nextSlide = useCallback(() => {
    setSlide((s) => (s < totalSlides - 1 ? s + 1 : s));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setSlide((s) => (s > 0 ? s - 1 : s));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp" || e.key === "Backspace") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && onClose && !document.fullscreenElement) {
        onClose();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [nextSlide, prevSlide, onClose]);

  const money = (cents: number) => formatMoney(cents, displayLang === "tr" ? "tr-TR" : "de-DE");

  const sphereTitles: Record<string, string> = {
    IDEELL: t("spheres.ideell"),
    ASSET_MANAGEMENT: t("spheres.assetManagement"),
    PURPOSE_OPERATION: t("spheres.purposeOperation"),
    ECONOMIC_OPERATION: t("spheres.economicOperation"),
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between overflow-hidden rounded-xl border border-ink-200 bg-surface text-ink transition-colors ${
        isFullscreen ? "h-screen w-screen p-8" : "min-h-[580px] p-6 shadow-lg"
      }`}
      role="region"
      aria-label={t("title", { year: report.year })}
    >
      {/* Üst Çubuk: Başlık, Dil, Tam Ekran & Kapat */}
      <header className="flex items-center justify-between border-b border-ink-200 pb-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {t("fiscalYear", { year: report.year })}
          </span>
          <span className="text-xs font-medium text-ink-500">
            {t("slideLabel")} {slide + 1} / {totalSlides}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dil Değiştirici */}
          <div className="flex rounded-lg border border-ink-200 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setDisplayLang("tr")}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                displayLang === "tr" ? "bg-accent text-white" : "text-ink-600 hover:text-ink-900"
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setDisplayLang("de")}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                displayLang === "de" ? "bg-accent text-white" : "text-ink-600 hover:text-ink-900"
              }`}
            >
              DE
            </button>
          </div>

          <ActionButton
            onClick={toggleFullscreen}
            emphasis="low"
            size="sm"
            iconOnly
            icon={
              isFullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {t("fullscreen")}
          </ActionButton>

          {onClose ? (
            <ActionButton
              onClick={onClose}
              emphasis="low"
              size="sm"
              iconOnly
              icon={<X className="h-4 w-4" aria-hidden="true" />}
            >
              {t("close")}
            </ActionButton>
          ) : null}
        </div>
      </header>

      {/* Slayt İçerik Alanı */}
      <main className="my-auto flex-1 py-6">
        {/* SLAYT 1: Genel Mali Tablo */}
        {slide === 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("title", { year: report.year })}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t("slide1Subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SurfaceCard className="p-4 border-l-4 border-l-blue-500">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {t("totalIncome")}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {money(report.totals.totalIncomeCents)}
                </p>
                {report.totals.incomeChangePercent !== null && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ink-600">
                    {report.totals.incomeChangePercent >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-600" aria-hidden="true" />
                    )}
                    {report.totals.incomeChangePercent >= 0 ? "+" : ""}
                    {report.totals.incomeChangePercent}% {t("yoy")}
                  </p>
                )}
              </SurfaceCard>

              <SurfaceCard className="p-4 border-l-4 border-l-amber-500">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {t("totalExpense")}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {money(report.totals.totalExpenseCents)}
                </p>
                {report.totals.expenseChangePercent !== null && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ink-600">
                    {report.totals.expenseChangePercent <= 0 ? (
                      <TrendingDown className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-rose-600" aria-hidden="true" />
                    )}
                    {report.totals.expenseChangePercent >= 0 ? "+" : ""}
                    {report.totals.expenseChangePercent}% {t("yoy")}
                  </p>
                )}
              </SurfaceCard>

              <SurfaceCard
                className={`p-4 border-l-4 ${
                  report.totals.netAnnualSurplusCents >= 0
                    ? "border-l-emerald-500 bg-emerald-50/20"
                    : "border-l-rose-500 bg-rose-50/20"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {t("netSurplus")}
                </p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    report.totals.netAnnualSurplusCents >= 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-700 dark:text-rose-400"
                  }`}
                >
                  {money(report.totals.netAnnualSurplusCents)}
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  {report.totals.netAnnualSurplusCents >= 0 ? t("surplusDesc") : t("deficitDesc")}
                </p>
              </SurfaceCard>

              <SurfaceCard className="p-4 border-l-4 border-l-purple-500">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {t("closingReserves")}
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {money(report.reserves.closingReservesCents)}
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  {t("freeReserves")}: {money(report.reserves.freeReservesCents)}
                </p>
              </SurfaceCard>
            </div>

            <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4 dark:bg-ink-900/30">
              <p className="text-sm font-medium leading-relaxed text-ink-800 dark:text-ink-200">
                • {report.plainSummary[displayLang][0]}
              </p>
            </div>
          </div>
        )}

        {/* SLAYT 2: 4 Faaliyet Alanı */}
        {slide === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("spheresTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t("slide2Subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.spheres.map((s) => (
                <SurfaceCard key={s.sphere} className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                    <span className="font-semibold text-sm text-foreground">
                      {sphereTitles[s.sphere] ?? s.sphere}
                    </span>
                    {s.yearOnYearChangePercent !== null && (
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          s.yearOnYearChangePercent >= 0
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {s.yearOnYearChangePercent >= 0 ? "+" : ""}
                        {s.yearOnYearChangePercent}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[11px] text-ink-500">{t("incomeHeader")}</p>
                      <p className="font-medium text-xs sm:text-sm text-foreground">
                        {money(s.incomeCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-500">{t("expenseHeader")}</p>
                      <p className="font-medium text-xs sm:text-sm text-foreground">
                        {money(s.expenseCents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-ink-500">{t("netHeader")}</p>
                      <p
                        className={`font-semibold text-xs sm:text-sm ${
                          s.netCents >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {money(s.netCents)}
                      </p>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>

            <p className="text-xs text-ink-500">
              • {report.plainSummary[displayLang][1]}
            </p>
          </div>
        )}

        {/* SLAYT 3: Projeler & Earmarked Funds */}
        {slide === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("projectsTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t("slide3Subtitle")}</p>
            </div>

            {report.projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ink-200 p-8 text-center text-ink-500">
                <Briefcase className="mx-auto mb-2 h-8 w-8 text-ink-400" aria-hidden="true" />
                <p className="text-sm">{t("noProjects")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {report.projects.map((p) => (
                  <SurfaceCard key={p.projectId} className="p-4 space-y-2">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {p.projectName}
                    </p>
                    <div className="flex justify-between text-xs text-ink-600">
                      <span>{t("incomeHeader")}:</span>
                      <span className="font-medium">{money(p.incomeCents)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-ink-600">
                      <span>{t("expenseHeader")}:</span>
                      <span className="font-medium">{money(p.expenseCents)}</span>
                    </div>
                    <div className="flex justify-between border-t border-ink-100 pt-1 text-xs">
                      <span className="font-medium">{t("netHeader")}:</span>
                      <span
                        className={`font-bold ${
                          p.netCents >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {money(p.netCents)}
                      </span>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-accent/5 p-4 border border-accent/20">
              <p className="text-sm font-medium text-foreground">
                {t("earmarkedFunds")}:{" "}
                <span className="font-bold text-accent">
                  {money(report.reserves.earmarkedFundsCents)}
                </span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                {report.plainSummary[displayLang][2]}
              </p>
            </div>
          </div>
        )}

        {/* SLAYT 4: Rezervler (§ 62 AO) */}
        {slide === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("closingReserves")}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t("slide4Subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SurfaceCard className="p-5 text-center">
                <Layers className="mx-auto mb-2 h-6 w-6 text-purple-600" aria-hidden="true" />
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("freeReserves")}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {money(report.reserves.freeReservesCents)}
                </p>
                <p className="mt-1 text-xs text-ink-400">{t("statuteFreeReserves")}</p>
              </SurfaceCard>

              <SurfaceCard className="p-5 text-center">
                <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-indigo-600" aria-hidden="true" />
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("earmarkedFunds")}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {money(report.reserves.earmarkedFundsCents)}
                </p>
                <p className="mt-1 text-xs text-ink-400">{t("statuteEarmarked")}</p>
              </SurfaceCard>

              <SurfaceCard className="p-5 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-600" aria-hidden="true" />
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("closingReserves")}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {money(report.reserves.closingReservesCents)}
                </p>
                <p className="mt-1 text-xs text-ink-400">{t("bankAndCash")}</p>
              </SurfaceCard>
            </div>

            <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4 dark:bg-ink-900/30">
              <p className="text-sm font-medium leading-relaxed text-ink-800 dark:text-ink-200">
                • {report.plainSummary[displayLang][3]}
              </p>
            </div>
          </div>
        )}

        {/* SLAYT 5: Sayman Değerlendirmesi & İbra Tavsiyesi */}
        {slide === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {t("summaryTitle")}
              </h2>
              <p className="mt-1 text-sm text-ink-500">{t("slide5Subtitle")}</p>
            </div>

            <div className="space-y-2 rounded-lg border border-ink-200 bg-surface p-4">
              {report.plainSummary[displayLang].map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-300">
                  <span className="text-accent mt-0.5">•</span>
                  <p className="leading-relaxed">{item}</p>
                </div>
              ))}
            </div>

            {/* İbra Tavsiyesi Vurgusu */}
            <div className="rounded-xl border-2 border-emerald-500/40 bg-emerald-50/30 p-5 dark:bg-emerald-950/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-200">
                    {t("recommendationHeader")}
                  </h3>
                  <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                    {report.plainSummary.recommendation[displayLang]}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Alt Kontrol Çubuğu: Geri, İleri ve Nokta Göstergeleri */}
      <footer className="flex items-center justify-between border-t border-ink-200 pt-4">
        <ActionButton
          onClick={prevSlide}
          disabled={slide === 0}
          emphasis="medium"
          size="sm"
          icon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        >
          {t("prevSlide")}
        </ActionButton>

        {/* Slayt Noktaları */}
        <div className="flex items-center gap-1.5" role="tablist">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSlide(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === slide ? "w-6 bg-accent" : "w-2 bg-ink-300 hover:bg-ink-400"
              }`}
              aria-label={`${t("slideLabel")} ${idx + 1}`}
              role="tab"
              aria-selected={idx === slide}
            />
          ))}
        </div>

        <ActionButton
          onClick={nextSlide}
          disabled={slide === totalSlides - 1}
          emphasis="high"
          size="sm"
          icon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
        >
          {t("nextSlide")}
        </ActionButton>
      </footer>
    </div>
  );
}
