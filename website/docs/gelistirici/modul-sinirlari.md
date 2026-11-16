---
title: Modül sınırları (katı kural)
sidebar_position: 3
---

# Modül sınırları: yalnız bildirimle

Bir modül başka bir modüle **yalnız `module.config.ts`'de bildirdiği ölçüde** dokunur. Sunucu içe aktarımı kadar
istemciden yapılan HTTP çağrısı ve sayfa bağlantısı da bir bağdır.

| Bağ türü | Örnek | Gerekli bildirim |
|---|---|---|
| İçe aktarım | `@/modules/x/server`, `@/modules/x/automation`, `@/modules/x` | `access` (ya da `requires`, menü `module`) |
| API çağrısı | `fetch("/api/x/…")` | `access` |
| Sayfa bağlantısı | `href="/x-sayfasi"` | `recommends` / `requires` / `access` / menü `module` |

```ts title="module.config.ts"
access: [
  { module: "accounting", operations: ["read", "write"] },
  { module: "tasks", operations: ["read"] },
],
recommends: ["accounting", "tasks"],
```

## Zorunluluklar

- İstemci başka modülün API'sini doğrudan çağırmaz; işi **kendi server action'ınızda** `@/modules/x/server` ile
  yapın ve kullanıcının x'teki yetkisini orada denetleyin.
- Bağlantı/düğme yalnız hedef modül **açıksa** (`listUsableModuleKeys`) ve kullanıcı **yetkiliyse** gösterilir;
  bu hesap sunucuda yapılır, istemciye yalnız `boolean` iner.
- Her `access` girdisinin `messages/tr.json` + `de.json` → `access.<modül>` gerekçesi zorunludur (onay penceresinde
  gösterilir).
- `access` değişince mevcut kurulumlarda yönetici **yeniden onay** verir. Bu bilinçli bir maliyettir.
- `auth` altyapıdır, muaftır.

## Denetim

`tests/modules/module-boundaries.test.ts` her modülün kodunu tarar; bildirilmemiş her bağ testi kırar ve hata
mesajı eklenecek bildirimi söyler. **Testi gevşetmeyin**; bildirimi ekleyin ya da bağı kaldırın.
