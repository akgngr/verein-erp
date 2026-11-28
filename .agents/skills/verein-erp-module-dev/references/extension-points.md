# 15 Sıfır-Dokunuş Eklenti Sözleşmesi (Extension Points)

Her sözleşme modülün kendi klasöründeki sabit bir dosyadan dışa aktarılır ve `pnpm module:sync` ile ilgili `src/*-registry.ts` dosyasına otomatik bağlanır. Çekirdek koda dokunulmaz.

---

## 1. Panel ve Yüzey Kartları — `cards/index.tsx`
- **Export:** `export const cards = defineCards([...])` (`@/shared/types/dashboard`)
- **Gövde bileşenleri:** `StatCardBody`, `TableCardBody`, `GaugeCardBody`, `AlertCardBody` (`@/shared/components/dashboard/card-bodies`)
- **Çeviri zorunluluğu:** `titleKey` ve `descriptionKey` (genellikle `cards.<key>.title`, `cards.<key>.description`) TR/DE mesajlarında olmalı.
- **Kurallar:** `render` sunucuda çalışır (hook/HeroUI/compound kit yok); gösterecek veri yoksa `null` dön. Başka modül ekranında göstermek için `surfaces: [{ key: "accounting.overview", placement: "aside" }]` tanımla — yüzey sahibi yalnız `<SurfaceCards surface="..." placement="aside" />` (`@/modules/system/ui`) koyar, yeni `access` gerekmez.

```tsx
import { Users } from "lucide-react";
import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { defineCards } from "@/shared/types/dashboard";
import { sponsorsPermissions } from "../permissions";
import { getSponsorStats } from "../queries/stats";

export const cards = defineCards([
  {
    key: "overview",
    titleKey: "cards.overview.title",
    descriptionKey: "cards.overview.description",
    icon: Users,
    size: "sm", // "sm" | "md" | "lg"
    defaultVisible: true,
    href: "/sponsors",
    permission: { definition: sponsorsPermissions, action: "view" },
    render: async ({ t }) => {
      const stats = await getSponsorStats();
      return <StatCardBody value={stats.active} label={t("cards.overview.active")} />;
    },
  },
]);
```

---

## 2. Yapay Zekâ Asistanı v2 — `ai.ts` (KATI KURAL: Yalnız v2!)
- **Export:** `export const ai = defineModuleAiV2({ module: "<anahtar>", tools: [...], actions: {...} })`
- **İmportlar:** `import "server-only";`, `aiToolV2`, `defineModuleAiV2` (`@/shared/ai/v2`), `aiAction`, `PROPOSED` (`@/shared/ai/define`), `proposalAcknowledgementSchema` (`@/shared/ai/dataset`).
- **YASAK:** Legacy `defineModuleAi` ve `aiTool` (v1) **KESİNLİKLE YASAK** (`tests/ai/ai-contract-v2-only.test.ts` + `validate-module.ts`).
- **Zorunlu Merkezi Kayıt:** Her aracın adı `src/shared/data-policy.ts → AI_TOOL_POLICY.<tool_name>` içine `{ module, reads, serverReads, modelFields }` olarak eklenmelidir!
  - `serverReads`: K0 tablo yasak; yalnız sahip modülün tabloları.
  - `modelFields`: Modele dönen TÜM alanlar (iç içe alanlar nokta ile: `"items.title"`). Listede olmayan alan çalışma anında `AI_OUTPUT_FIELD_DENIED` ile reddedilir.
  - `processing`: `"approved_provider"` veya `"local_only"` (serbest kişisel metinler yalnız `"local_only"`).
  - `modelDataClass`: `"approved_provider"` ise ZORUNLU (`"aggregate" | "internal" | "pseudonymous"`). Kişi ad/iletişim/adres/IBAN/kimlik asla dönmez (`[[Kn]]` takma adıyla yalnız `pseudonymous`).
- **Yazma Araçları:** Doğrudan DB yazmaz; `propose({ action: "<eylem>", title, details, payload })` çağırıp `PROPOSED` döner. Eylem `actions.<eylem>` içinde `aiAction({ operation, schema, execute })` ile tanımlanır.
- **Zorunlu Çeviriler:** Her eylem için `messages/{tr,de}.json` → `ai.<eylem>.kind`, `ai.<eylem>.confirm`, `ai.<eylem>.done`.
- **İsim Kuralı:** Araç adları tüm modüllerde benzersiz `snake_case` (`/^[a-z][a-z0-9_]{2,63}$/`). Model-facing İngilizce açıklamalara `// i18n-ignore` ekle.

---

## 3. Arka Plan Otomasyonu & İş Akışı Olayları — `automation.ts`
`pnpm module:sync` hem `defineTask` hem `defineEvent` dışa aktarımlarını otomatik olarak `src/automation-registry.ts` içine toplar (elle registry düzenlenmez!).

### Arka Plan Görevi (`defineTask`)
```ts
import "server-only";
import { z } from "zod";
import { defineTask } from "@/shared/automation/define";

export const processSponsorTask = defineTask({
  key: "sponsors.process_item", // Önek = modül anahtarı!
  version: 1,                   // Sözleşme kırıcı değişiklikte artır
  description: "sponsors.process_item",
  inputSchema: z.object({ itemId: z.string().min(1).max(128) }).strict(), // PII YOK, yalnız ID/metadata
  timeoutSeconds: 300,
  retry: { maxAttempts: 3, initialDelaySeconds: 30, maxDelaySeconds: 900, backoffMultiplier: 2 },
  idempotencyKey: (input) => `sponsors:item:${input.itemId}`,
  handler: async (input, context) => {
    const { processItem } = await import("./services/process-item");
    return processItem(input.itemId, context);
  },
});
```
- Görev başlatma: Yetki/modül etkinliği kontrolü sonrasında `createTaskExecutionRecord(...)` (`@/modules/automation/automation`).
- **Worker Sınırı:** Worker Next.js request context dışında çalışır. Worker'ın çağırdığı kod `next-intl/server`, `next/headers`, `next/cache`, React/UI veya Server Action'ı transitif olarak bile import **edemez**!

### İş Akışı Olayı (`defineEvent`)
```ts
import { defineEvent } from "@/shared/automation/define";

export const sponsorCreatedEvent = defineEvent({
  key: "sponsors.created",      // Önek = modül anahtarı!
  description: "sponsors.created",
  payloadSchema: z.object({
    sponsorId: z.string(),
    tier: z.enum(["GOLD", "SILVER"]),
  }).strict(),                  // Yükte PII YOK!
  variables: {
    namespace: "sponsors",
    fields: ["title", "tier"],
    load: async (payload) => { /* kaydı oku, düz değerler dön */ },
  },
});
```
- Yayımlama (mümkünse aynı `tx` ile): `await emitAutomationEvent(sponsorCreatedEvent, { sponsorId: item.id, tier: item.tier }, tx);` (`@/shared/automation/emit`; otomasyon kapalıysa no-op).
- **Zorunlu Çeviriler (`tests/automation/module-events.test.ts`):** `messages/{tr,de}.json → automation.events.<ad>.{label, fields.<alan>, options.<alan>.<DEGER>, variables.<alan>}`. Olay modül kodunda gerçekten `emitAutomationEvent` ile yayımlanmalıdır.

---

## 4. Yaşam Döngüsü ve Silinme Hakkı — `lifecycle.ts`
- **Export:** `export const lifecycle = defineLifecycle({ moduleKey: "<anahtar>", onDisable, onUserDeleted })` (`@/shared/modules/lifecycle`).
- **Zorunlu KVKK/DSGVO Kancası:** `DATA_POLICY` içinde `personalOwnerField` işaretlenmiş her tablo için `onUserDeleted(userId)` içinde `getDb().<model>.deleteMany({ where: { <field>: userId } })` bulunmalıdır (`tests/shared/user-deletion.test.ts`).

```ts
import "server-only";
import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

export const lifecycle = defineLifecycle({
  moduleKey: "sponsors",
  async onUserDeleted(userId) {
    await getDb().sponsorUserPref.deleteMany({ where: { userId } });
  },
});
```

---

## 5. Demo Verisi — `demo.ts`
- **Export:** `export const demo = defineDemo({ moduleKey: "<anahtar>", order, seed, clear })` (`@/shared/demo/define`).
- Her oluşturulan kaydı hemen `ctx.refs.push({ model, id })` ile kaydet.
- Yalnız kendi tablolarına yaz; başka modülden referans için `ctx.created.<modül>` kullan.
- KVKK: yalnız `demoPerson()`, `DEMO_IBAN`, `@example.com` kurgusal verileri.
- `clear` için `clearRefs(refs, { model: (ids) => ... })` kullan; GoBD silinmezlik korumasını asla gevşetme.

---

## 6. Widget Platform — `widget.ts` (İstemci-Güvenli!)
- **Export:** `export const widgets = defineModuleWidgets("<anahtar>", [...])` (`@/shared/widgets/registry`).
- **Kurallar (`validate-module.ts → checkWidgetFile`):**
  - `server-only`, `@/shared/db` veya `getDb()` **KESİNLİKLE YASAK** (istemci-güvenli!).
  - Yalnız kendi modülü için tanım yapabilir; `load: () => import("./widgets/<ad>")` yalnız `./` göreli yolu içe aktarabilir.
  - `requiredPermissions`: `"<kaynak>:<eylem>"` biçiminde (`/^[a-z][a-z0-9-]*:[a-z][a-zA-Z]*$/`).
  - `header.tsx` geçicidir/kaldırılıyor; yeni kodda daima `widget.ts` kullan.

---

## 7. Kişisel Sekreter Katkısı — `secretary.ts`
- **Export:** `export const secretary = defineModuleSecretary({ module: "<anahtar>", providers: [...] })` (`@/shared/secretary/define`).
- Her sağlayıcı: `key`, `permission`, `collect(context) → BriefingItem[]`.
- Öğe ID'si `"<anahtar>:<tür>[:<kaynakId>]"`; `href` yalnız kendi modülü; başlık `context.t(...)`; en fazla 20 öğe, 3 sn sınırı; yalnız kullanıcının yetkili olduğu veriler.

---

## 8. Merkezi Bildirim Türleri — `notifications.ts` (ADR 0006)
- **Export:** `export const notifications = defineNotificationTypes("<anahtar>", [defineNotificationType({ ... })])` (`@/shared/notifications/define`).
- Kurallar (`validateModuleNotifications`):
  - `key`: `/^[a-z][a-z0-9-]{1,48}$/` (tam anahtar: `<anahtar>.<key>`).
  - `titleKey` ve varsa `bodyKey` `"notifications."` ile başlamalıdır.
  - `defaultChannels`: `"in_app" | "email" | "web_push" | "telegram" | "whatsapp" | "sms"`.
  - `href(params)`: `isSafeNotificationHref` uyumlu — `/` ile başlar, `?`, `#`, `..`, şema içermez.
  - `externalText` (opsiyonel): Yalnız sayı/tarih gibi kişisel olmayan tek satır ≤160 karakter; ad, tutar, serbest metin YASAK!

---

## 9. Takvim Kaynağı — `calendar.ts`
- **Export:** `export const calendar = defineModuleCalendar({ module: "<anahtar>", sources: [{ key, color, load }] })` (`@/shared/calendar/define`; yardımcı: `atTime(date, "HH:mm")`).
- Salt-okunur; `load(range, user)` kendi yetki denetimini yapar, yalnız `range` içindeki kayıtları döner, kişisel veri (ad/iletişim) içermez. Çeviri: `<anahtar>.calendar.<key>`.

---

## 10. Takvim Senkron Sağlayıcı — `calendar-sync.ts`
- **Export:** `export const calendarSync = defineCalendarSync({ module: "<anahtar>", providers: [...] })` (`@/shared/calendar/sync`).
- Dış istekler yalnız `syncFetch(provider, url, init)` ile (`allowedHosts` zorunlu, HTTPS + SSRF koruması + otomatik egress kaydı). Yetki hatasında `throw new SyncAuthError()`.

---

## 11. Kampanya Gönderim Kanalı — `channels.ts`
- **Export:** `export const channels = defineChannels("<anahtar>", [...])` (`@/shared/campaigns/channel`).
- Dış istekler yalnız `channelFetch(allowedHosts, url, init, egressMeta)` ile (egress ledger PII'siz otomatik kaydedilir).
- Yardımcılar: `splitForChannel`, `normalizePhone`. Ayar etiketleri: `<anahtar>.channelSettings.<kanal>.<key>`.

---

## 12. Toplu E-posta Alıcı Kaynağı — `recipients.ts`
- **Export:** `export const recipients = defineRecipients("<anahtar>", [{ key, permission, placeholders, filters, sampleVars, resolve }])` (`@/shared/mailings/define`).
- `resolve(filter)` → `{ id, email, name, optOut, vars }[]`. Etiketler: `<anahtar>.recipients.<kaynak>.label`, `...filters.<filtre>.label`, `...options.<değer>`.
- Programatik gönderim: `sendBulkMail` (`@/modules/mailings/server` + `access: mailings write`).

---

## 13. Export Format Eklentisi — `formats.ts`
- **Export:** `export const formats = defineFormats("<anahtar>", [defineFormat({ id, mimeType, extension, hint, render })])` (`@/shared/formats/define`).
- Yerleşik kimlikler (`pdf`, `xlsx`, `docx`, `md`, `csv`) ezilemez; `render(content, context)` `Buffer` döner.

---

## 14. Uyum (Gemeinnützigkeit) Metrikleri — `compliance.ts` (ADR 0009)
- **Export:** `export const compliance = defineComplianceMetrics({ module: "<anahtar>", metrics: [...] })` (`@/shared/compliance/define`).
- Saf okuma (yazma ve dış çağrı yok), vergi yılına göre deterministik, yalnız toplu sayı/tarih veya `pseudonymousRef(prefix, id)` ile takma adlı kişi satırı (asla kişi adı yok!).

---

## 15. OAuth/OIDC Giriş Sağlayıcı — `auth-providers.ts`
- **Export:** `export const authProviders = defineAuthProviders({ moduleKey: "<anahtar>", providers: [{ id, label, load }] })` (`@/shared/auth/providers`).
- `id`: `/^[a-z][a-z0-9-]{1,39}$/` (`credentials`, `email`, `webauthn` yasak). `load()` 3 sn içinde Auth.js provider veya `null` döner; sırları loglamaz. Giriş yalnız önceden bağlanmış `(provider, subject)` ile yapılır (otomatik kullanıcı oluşturma/e-posta eşleme yok; `linkAuthIdentity` / `unlinkAuthIdentity` `@/modules/auth/server`).
