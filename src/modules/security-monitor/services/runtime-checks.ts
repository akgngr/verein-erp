import path from "node:path";

/**
 * #585: Güvenlik izleme artık alt süreçte test paketi çalıştırmaz. Önceki `pnpm exec tsx --test
 * --test-reporter=json tests/security/*.test.ts` çağrısı geçersiz raporlayıcı, genişletilmemiş glob ve
 * standalone konteynerde bulunmayan kaynak/test dosyaları nedeniyle her zaman hata veriyordu.
 *
 * Bunun yerine çalışan kurulumun güvenlik ve bütünlük ayarları süreç içinde denetlenir. Her denetim saf bir
 * fonksiyondur (girdi: ortam ve veritabanı yoklamalarının anlık görüntüsü); sonuç `pass` | `warn` | `fail`.
 * Metinler çevirilerdedir: `security-monitor.checks.<key>.*`.
 */
export type CheckStatus = "pass" | "warn" | "fail";
export type CheckResult = { key: string; status: CheckStatus; severity: "critical" | "high" | "medium" };

export type RuntimeSnapshot = {
  nodeEnv: string;
  authSecret: string | undefined;
  canEncryptSecrets: boolean;
  appUrl: string | undefined;
  uploadDir: string;
  cwd: string;
  /** AuditLog tablosunda UPDATE/DELETE engelleyen tetikleyiciler (append-only). */
  auditTriggers: string[];
  /** Başarısız veya geri alınmış (bitmemiş) Prisma göçleri. */
  failedMigrations: number;
};

const check = (key: string, severity: CheckResult["severity"], status: CheckStatus): CheckResult => ({ key, status, severity });

export function evaluateRuntimeChecks(snapshot: RuntimeSnapshot): CheckResult[] {
  const production = snapshot.nodeEnv === "production";
  const secret = snapshot.authSecret ?? "";
  const uploadPath = path.resolve(/* turbopackIgnore: true */ snapshot.cwd, snapshot.uploadDir);
  const publicDir = path.resolve(/* turbopackIgnore: true */ snapshot.cwd, "public");
  let appUrlStatus: CheckStatus = "pass";
  try {
    if (!snapshot.appUrl) appUrlStatus = "warn";
    else if (production && new URL(snapshot.appUrl).protocol !== "https:") appUrlStatus = "fail";
  } catch {
    appUrlStatus = "fail";
  }
  return [
    check("authSecret", "critical", secret.length >= 32 ? "pass" : secret.length >= 16 ? "warn" : "fail"),
    check("secretEncryption", "critical", snapshot.canEncryptSecrets ? "pass" : "fail"),
    check("appUrlHttps", "high", appUrlStatus),
    check("uploadsNotPublic", "high", uploadPath === publicDir || uploadPath.startsWith(`${publicDir}${path.sep}`) ? "fail" : "pass"),
    check("auditAppendOnly", "critical", ["audit_log_no_update", "audit_log_no_delete"].every((name) => snapshot.auditTriggers.includes(name)) ? "pass" : "fail"),
    check("migrations", "high", snapshot.failedMigrations === 0 ? "pass" : "fail"),
    check("productionMode", "medium", production ? "pass" : "warn"),
  ];
}
