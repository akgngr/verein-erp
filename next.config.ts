import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // KARAR: Next.js 16, dev kaynaklarımıza (/_next/hmr vb.) yalnızca izinli
  // kaynaklardan (allowedDevOrigins) gelen isteklere yanıt verir. Bu listede
  // eksik bir host, tarayıcıda hidrasyonun hiç tamamlanmamasına yol açar.
  // Sandbox içi erişim (127.0.0.1/localhost) ve önizleme alan adı burada izinlidir.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "preview-chat-f44dc199-3def-4ec9-82a1-f073394f8be0.space-z.ai",
    "*.space-z.ai",
  ],
  // KARAR: distDir yalnızca ortam değişkeniyle geçici olarak değiştirilebilir;
  // varsayılan ".next" aynen korunur. (Sandbox'ta çalışan dev sunucusunu bozmadan
  // `pnpm build` doğrulaması için kullanılır; kullanıcı tarafında etkisi yoktur.)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Prisma sorgu motorunun standalone çıktıya dahil edilmesi için
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**", "./node_modules/@prisma/client/**"],
  },
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

export default nextConfig;
