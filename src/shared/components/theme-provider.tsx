"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Minimal tema sağlayıcı (Verein oturumu düzeltmesi).
 *
 * KARAR: next-themes 0.4.6, React 19 altında her yüklemede şu konsol hatasını
 * üretiyor: "Encountered a script tag while rendering React component. Scripts
 * inside React components are never executed when rendering on the client."
 * (next-themes, FOUC engellemek için ThemeProvider ağacına inline <script>
 * render ediyor; React 19 istemci render'ında bunu uyarıyla işaretliyor.)
 *
 * Paketin en güncel sürümü (0.4.6) sorunu çözmediği için next-themes'ten
 * çıkıldı ve bu modül yazıldı. Davranış birebir korunur:
 *   - localStorage anahtarı "theme" (next-themes varsayılanı ile aynı →
 *     kullanıcıların mevcut tercihi korunur)
 *   - "light" | "dark" | "system" üçlüsü, system takibi (matchMedia)
 *   - <html> üzerine class + style.colorScheme
 *   - FOUC engelleme: init script'i React DIŞINDA, root layout'ta
 *     next/script strategy="beforeInteractive" ile koşulur (React 19
 *     script uyarısı üretmez; hidrasyon öncesi çalışır)
 *   - disableTransitionOnChange: tema değişiminde geçişler kısa süre kapatılır
 *
 * React 19 uyumu: tema durumu useSyncExternalStore ile okunur (localStorage =
 * dışsal store); böylece "setState in effect" lint kuralı da ihlal edilmez.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

type ThemeContextValue = {
  /** Depolanmış tercih; "system" olabilir. Sunucuda varsayılan "system". */
  theme: Theme;
  /** Uygulanmış tema (system çözümlenmiş halde). Sunucuda "light". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Hidrasyon ÖNCESİ çalışan tema başlatma betiği (root layout'ta
 * beforeInteractive ile yüklenir). localStorage'daki tercihi okur,
 * system tercihini çözümler ve <html> elemanına class/colorScheme yazar.
 * try/catch: localStorage erişilemezse (gizli mod vb.) sessizce geçer.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var r=t==="system"?(m?"dark":"light"):t;var c=document.documentElement.classList;c.remove("light","dark");c.add(r);document.documentElement.style.colorScheme=r;}catch(e){}})();`;

/* ------------------------------------------------------------------ */
/* Dışsal store (localStorage + prefers-color-scheme)                  */
/* ------------------------------------------------------------------ */

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : "system";
  } catch {
    return "system";
  }
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // System teması değişirse ve tercih "system" ise bildir.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (readStoredTheme() === "system") emit();
  };
  media.addEventListener("change", onSystemChange);
  // Diğer sekmelerdeki tema değişikliklerini de takip et.
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** İstemci snapshot'ı: depolanmış tercih (primitive — referans kararlılığı sorunu yok). */
function getThemeSnapshot(): Theme {
  return readStoredTheme();
}

/** Sunucu snapshot'ı: localStorage yok; "system" varsayımı yapılır. */
function getServerThemeSnapshot(): Theme {
  return "system";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** İstemci snapshot'ı: çözümlenmiş tema. */
function getResolvedSnapshot(): ResolvedTheme {
  return resolveTheme(readStoredTheme());
}

function getServerResolvedSnapshot(): ResolvedTheme {
  return "light";
}

/* ------------------------------------------------------------------ */
/* DOM uygulama                                                        */
/* ------------------------------------------------------------------ */

/** Geçiş animasyonlarını kısa süreyle kapatır (disableTransitionOnChange muadili). */
function disableTransitionsTemporarily(): void {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      `*,*::before,*::after{transition-property:none!important;animation-duration:0.01ms!important;}`,
    ),
  );
  document.head.appendChild(style);
  // Zorla reflow; ardından bir sonraki karede stili kaldır.
  void window.getComputedStyle(document.documentElement).backgroundColor;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      style.remove();
    });
  });
}

function applyThemeToDom(theme: Theme): void {
  const resolved = resolveTheme(theme);
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getResolvedSnapshot,
    getServerResolvedSnapshot,
  );

  // KARAR: <html> class'ını senkronize etme bir DOM yan etkisidir (setState değil);
  // init script hidrasyon öncesi zaten doğru class'ı koymuştur, bu efekt yalnızca
  // tercih değiştiğinde (veya hydrate sonrası ilk eşitleme için) çalışır.
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage yazılamıyorsa yalnızca bu oturum için uygula.
    }
    disableTransitionsTemporarily();
    applyThemeToDom(next);
    emit();
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tema bağlamına erişim; ThemeProvider dışında kullanılırsa hata fırlatır. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme, ThemeProvider içinde kullanılmalıdır.");
  return ctx;
}
