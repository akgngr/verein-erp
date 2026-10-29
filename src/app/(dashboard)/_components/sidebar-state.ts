/**
 * Masaüstü panel daraltma tercihi çerezde tutulur; dashboard layout sunucuda okuyup
 * ilk render'ı buna göre yapar (yüklenirken genişlik zıplamaz).
 * KARAR: Sabit "use client" dosyasında değil burada durur — client modülden alınan
 * değer sunucu bileşeninde dizge değil istemci referansı olurdu.
 */
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar-collapsed";
