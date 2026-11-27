import type { NextConfig } from "next";

import createNextIntlPlugin from "next-intl/plugin";

// Faz 3 eklemeleri düzeltmesi: members modülünün RSC/client bileşenleri
// getTranslations/useTranslations kullanır; src/i18n/request.ts hazırdı ama
// plugin next.config.ts'e hiç bağlanmamıştı (Verein pivotu esnasında atlanmış).
// Non-routing mod (URL'de dil öneki yok) — bkz. src/i18n/request.ts karar notu.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Virgülle ayrılmış ortam değişkenini listeye çevirir (boşlukları ve boş öğeleri atar).
 * KARAR (A-2): next.config değerleri standalone derlemede server.js'e DERLEME ANINDA
 * gömülür; bu değişkenler imaj derlenirken (build arg) verilmelidir.
 */
function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const isProduction = process.env.NODE_ENV === "production";

/** Evrak OCR (docs/specs/DOCUMENTS_AI.md): tesseract.js çalışanı, WASM çekirdeği ve dil paketleri çalışma anında
 * dosya sisteminden yüklenir; standalone çıktıya açıkça dahil edilir. */
const OCR_RUNTIME_FILES = [
  // PDF sayfasını görüntüye çevirme (taranmış/vektör sayfalar): yerel ikili dosyalar.
  "./node_modules/@napi-rs/**",
  "./node_modules/.pnpm/@napi-rs+canvas*/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/@tesseract.js-data/**",
      "./node_modules/.pnpm/tesseract.js*/**",
      "./node_modules/.pnpm/@tesseract.js-data*/**",
      // Worker betiği (worker_threads) çalışma anında yüklenir; bağımlılıkları tracing'e açıkça eklenir.
      "./node_modules/.pnpm/wasm-feature-detect*/**",
      "./node_modules/.pnpm/regenerator-runtime*/**",
      "./node_modules/.pnpm/is-url*/**",
      "./node_modules/.pnpm/bmp-js*/**",
      "./node_modules/.pnpm/zlibjs*/**",
      "./node_modules/.pnpm/idb-keyval*/**",
      "./node_modules/.pnpm/node-fetch@2*/**",
    ];

const nextConfig: NextConfig = {
  output: "standalone",
  // KARAR (A-2): Next.js 16 dev kaynaklarına (/_next/hmr vb.) yalnızca izinli
  // kaynaklardan erişilir. Yerel geliştirme için localhost/127.0.0.1 yeterlidir;
  // başka bir host (örn. LAN IP, tünel) gerekiyorsa DEV_ALLOWED_ORIGINS ile eklenir.
  // Üretimde bu liste kullanılmaz.
  allowedDevOrigins: isProduction ? [] : ["localhost", "127.0.0.1", ...envList("DEV_ALLOWED_ORIGINS")],
  // KARAR (A-2): Server Actions yalnızca AYNI KAYNAKTAN kabul edilir (CSRF koruması).
  // Standart reverse proxy (Caddy/nginx Host başlığını korur) ile ek ayar gerekmez.
  // Proxy Host başlığını değiştiriyorsa izinli kaynaklar SERVER_ACTIONS_ALLOWED_ORIGINS
  // ile açıkça verilir (örn. "verein.example.de"). Eski sandbox önizleme alan adları
  // güvenlik nedeniyle kaldırıldı.
  experimental: {
    serverActions: {
      allowedOrigins: envList("SERVER_ACTIONS_ALLOWED_ORIGINS"),
    },
  },
  // KARAR: Next.js 16 geliştirme modunda server action ARGÜMANLARINI terminale yazar
  // (varsayılan true). Bu, giriş parolalarını ve formlardaki kişisel verileri (adres,
  // IBAN, kimlik no) düz metin olarak log'a döker; DSGVO ve güvenlik gereği kapatılır.
  logging: {
    serverFunctions: false,
  },
  // KARAR: distDir yalnızca ortam değişkeniyle geçici olarak değiştirilebilir;
  // varsayılan ".next" aynen korunur. (Sandbox'ta çalışan dev sunucusunu bozmadan
  // `pnpm build` doğrulaması için kullanılır; kullanıcı tarafında etkisi yoktur.)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // KARAR (#587): Çalışma anında dosya sisteminden okunan HER varlık burada açıkça listelenir.
  // Depolama yollarındaki `turbopackIgnore` (shared/files/storage.ts) projenin tamamının izlenmesini
  // kapattığı için standalone çıktı artık yalnız bu listeyi ve import edilen kodu içerir.
  outputFileTracingIncludes: {
    "/**": [
      // Prisma sorgu motoru
      "./node_modules/.prisma/client/**",
      "./node_modules/@prisma/client/**",
      // PDF fontları (#577, #587): @react-pdf/renderer dosyayı process.cwd() üzerinden okur. Makbuz, bağış bildirimi,
      // fatura, rapor ve tutanak PDF'leri rota handler'larında ve server action'larda üretildiği için
      // tüm rotalara eklenir (birkaç MB).
      "./src/shared/pdf/fonts/**",
      "./src/modules/meetings/assets/fonts/**",
      // Modül durumu, lisans yayıncıları ve güvenilen yayıncılar çalışma anında okunur.
      "./src/config/**",
    ],
    // Evrak OCR (docs/specs/DOCUMENTS_AI.md): tesseract.js çalışanı, WASM çekirdeği ve dil paketleri
    // çalışma anında dosya sisteminden yüklenir; standalone çıktıya açıkça dahil edilir.
    "/api/documents/analyze": OCR_RUNTIME_FILES,
    // Asistan sohbet ekleri (resim/taranmış PDF için aynı OCR çalışma zamanı).
    "/api/ai/attachments": OCR_RUNTIME_FILES,
  },
  // KARAR (Faz 2, 9. bölüm): @react-pdf/renderer Next bundler'ıyla sorun
  // çıkarabildiği için sunucu paketinin dışında tutulur (serverExternalPackages).
  serverExternalPackages: ["@react-pdf/renderer", "tesseract.js", "@napi-rs/canvas"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
