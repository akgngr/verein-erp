import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
