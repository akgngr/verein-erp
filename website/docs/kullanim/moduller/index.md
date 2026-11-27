---
title: Modül kataloğu
description: Tüm modüller, sürümleri, yetkileri ve sürüm notları.
slug: /kullanim/moduller
sidebar_position: 1
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Verein ERP 45 modülden oluşur. Modüller **Ayarlar → Modül Yönetimi** ekranından açılıp kapatılır; çekirdek modüller her zaman açıktır. Her sayfa modülün kendi tanımından otomatik üretilir.

## Çekirdek modüller

| Modül | Açıklama | Sürüm |
|---|---|---|
| [Bildirimler](./moduller/notifications) | Tüm modüllerin bildirimleri tek yerde; kanal tercihleri ve rızalar. | 0.16.1 |
| [Denetim Kayıtları](./moduller/audit) | Sistem işlemlerinin değiştirilemez güvenlik ve denetim logları. | 1.1.1 |
| [Dernek Bilgileri](./moduller/organization) | Dernek ana verileri, resmi iletişim ve antet logosu. | 1.0.11 |
| [Dosyalarım](./moduller/exports) | Oluşturulan PDF, Excel, Word, Markdown ve CSV dosyaları; şifreli saklanır. | 2.2.7 |
| [E-posta Altyapısı](./moduller/mail) | Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları. | 1.5.6 |
| [Kimlik Doğrulama](./moduller/auth) | Kullanıcı girişi, oturum yönetimi ve parola güvenliği. | 1.5.0 |
| [Kullanıcılar](./moduller/users) | Yönetici ve üye kullanıcı hesapları, roller ve erişim izinleri. | 1.6.1 |
| [Modül Yönetimi](./moduller/system) | Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi. | 1.20.0 |
| [Widget Platformu](./moduller/widgets) | Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar. | 0.3.2 |

## Resmî modüller

| Modül | Açıklama | Sürüm |
|---|---|---|
| [Bağışlar](./moduller/donations) | Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi. | 1.1.14 |
| [Banka bağlantısı](./moduller/banking) | Banka hesaplarını lisanslı PSD2 sağlayıcısı üzerinden bağlar, hareketleri muhasebeye aktarır. | 1.1.10 |
| [CRM](./moduller/crm) | Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler. | 1.0.12 |
| [Demo veri](./moduller/demo) | Test için kurgusal örnek veri yükler; modül kapatılınca hepsini siler. | 1.0.5 |
| [e-Sign](./moduller/online-forms) | e-Sign: kişiye süreli bağlantı, form tamamlama, Datenschutz onayı, imza ve imzalı PDF belgeleri. | 1.4.1 |
| [Envanter ve Demirbaş](./moduller/inventory) | Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi. | 1.2.1 |
| [Etkinlikler](./moduller/events) | Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi. | 1.2.15 |
| [Evrak Kayıt](./moduller/documents) | Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi. | 1.10.3 |
| [Geri bildirim](./moduller/feedback) | Test kullanıcılarının hata ve önerilerini toplar. | 1.1.9 |
| [Hibeler](./moduller/grants) | Hibe ve proje fonları: finansman planı, ödemeler ve Verwendungsnachweis (kullanım raporu). | 1.0.13 |
| [Kurslar](./moduller/courses) | Gönüllü kurslar ve Nachhilfe: öğretmenler, dersler, kayıtlar, ücretler ve muhasebe aktarımı. | 1.4.17 |
| [Muhasebe](./moduller/accounting) | Dernekler ve küçük işletmeler için EÜR odaklı gelir-gider, fiş, fatura ve bütçe yönetimi. | 1.27.6 |
| [Öğrenci takibi](./moduller/progress) | Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu. | 1.1.9 |
| [Öğrenciler](./moduller/students) | Kurs ve Nachhilfe öğrencileri, veliler ve DATEV uyumlu borçlu (Debitor) kayıtları. | 1.4.14 |
| [Security Monitor](./moduller/security-monitor) | Regularly runs system security tests and monitors results | 1.4.1 |
| [SEPA otomatik ödeme](./moduller/sepa) | Aidat ve kurs ücretleri için SEPA-Lastschrift (pain.008) tahsilatı. | 1.2.3 |
| [Sosyal Giriş](./moduller/social-login) | Harici kimlik sağlayıcıları ve bağlı hesaplar. | 1.0.0 |
| [Takvim](./moduller/calendar) | Kişisel ve ortak takvimler; etkinlik, toplantı, görev ve son tarihler tek görünümde. | 1.3.18 |
| [Toplantılar](./moduller/meetings) | Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar. | 1.4.4 |
| [Toplu e-posta](./moduller/mailings) | Üyelere, velilere ve diğer modüllerin alıcı listelerine kişiye özel toplu e-posta. | 2.7.2 |
| [Üyeler](./moduller/members) | Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi. | 1.16.0 |

## Eklentiler

| Modül | Açıklama | Sürüm |
|---|---|---|
| [Apple Takvim](./moduller/calendar-apple) | iCloud takvimini CalDAV ile salt okunur bağlar (Apple ID + uygulamaya özel parola). | 1.0.2 |
| [Çocuk Koruma](./moduller/youth-protection) | Eğitmen ve gönüllülerin genişletilmiş adli sicil belgesi (§ 72a SGB VIII) ibraz takibi ve harç muafiyet yazısı şablonu. Orijinal belge fiziki olarak incelenir, asla sisteme yüklenmez ve dijitalleştirilmez. | 0.2.0 |
| [Finans](./moduller/finance) | Canlı döviz kurları, piyasa göstergeleri, kur çevirici ve finansal AI asistanı. | 0.3.0 |
| [Google Takvim](./moduller/calendar-google) | Google Takvim hesabını takvime salt okunur bağlar (OAuth; yönetici kendi Google Cloud uygulamasını girer). | 1.0.2 |
| [Görevler](./moduller/tasks) | Görev ve iş takibi yönetimi. | 1.3.14 |
| [Hava Durumu](./moduller/weather) | Anlık konum bazlı hava durumu, tahminler, panel kartı ve sekreter etkinlik önerileri (Dış API: api.open-meteo.com). | 0.3.0 |
| [Otomasyon](./moduller/automation) | Kalıcı arka plan görevleri ve iş akışları. | 0.10.21 |
| [Outlook Takvim](./moduller/calendar-outlook) | Microsoft 365 / Outlook takvimini salt okunur bağlar (OAuth; yönetici kendi Azure uygulamasını girer). | 1.0.2 |
| [Sekreter](./moduller/secretary) | Kişisel sekreter: sabah özeti ve onaylı öneriler. | 0.13.4 |
| [SMS](./moduller/campaign-sms) | Kampanyalar için SMS kanalı (seven.io veya Twilio). Yalnız SMS izni verenlere gider. | 1.1.4 |
| [Telegram](./moduller/campaign-telegram) | Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır. | 1.1.0 |
| [Uyum kontrolü](./moduller/compliance) | Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir. | 0.3.0 |
| [Üye Portalı](./moduller/member-portal) | Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı. | 0.4.1 |
| [WhatsApp](./moduller/campaign-whatsapp) | Kampanyalar için WhatsApp kanalı (Meta Cloud API, onaylı şablonla). Yalnız WhatsApp izni verenlere gider. | 1.2.0 |
| [Yapay zekâ asistanı](./moduller/ai) | Sağ panelde sohbet eden, yalnızca izin verilen modüllerin toplu verisini okuyan asistan. | 1.15.13 |
