/**
 * Proje dosyalarını yazan araçlar (şema senkronu, eklenti silme) yalnızca geliştirme ortamında
 * çalışır. Üretim imajında kaynak dosyalar salt okunurdur; şemalar derleme sırasında senkronlanır
 * (prebuild → module:sync) ve veritabanı değişiklikleri migration'larla uygulanır.
 */
export function areFileDevToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
