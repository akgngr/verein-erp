---
title: Modül kataloğu
description: Tüm modüller, sürümleri, yetkileri ve sürüm notları.
slug: /kullanim/moduller
sidebar_position: 1
---

<!-- Bu sayfa scripts/docs/generate-module-docs.ts ile üretilir; elle düzenlemeyin. -->

Verein ERP 44 modülden oluşur. Modüller **Ayarlar → Modül Yönetimi** ekranından açılıp kapatılır; çekirdek modüller her zaman açıktır. Her sayfa modülün kendi tanımından otomatik üretilir.

## Çekirdek modüller

| Modül | Açıklama | Sürüm |
|---|---|---|
| [Bildirimler](./moduller/notifications) | Tüm modüllerin bildirimleri tek yerde; kanal tercihleri ve rızalar. | 0.15.1 |
| [Denetim Kayıtları](./moduller/audit) | Sistem işlemlerinin değiştirilemez güvenlik ve denetim logları. | 1.0.4 |
| [Dernek Bilgileri](./moduller/organization) | Dernek ana verileri, resmi iletişim ve antet logosu. | 1.0.8 |
| [Dosyalarım](./moduller/exports) | Oluşturulan PDF, Excel, Word, Markdown ve CSV dosyaları; şifreli saklanır. | 2.2.4 |
| [E-posta Altyapısı](./moduller/mail) | Tüm modüller için ortak e-posta gönderim altyapısı, SMTP ayarları ve gönderim kayıtları. | 1.5.3 |
| [Kimlik Doğrulama](./moduller/auth) | Kullanıcı girişi, oturum yönetimi ve parola güvenliği. | 1.1.0 |
| [Kullanıcılar](./moduller/users) | Yönetici ve üye kullanıcı hesapları, roller ve erişim izinleri. | 1.3.0 |
| [Modül Yönetimi](./moduller/system) | Sistemde yüklü çekirdek, resmi ve eklenti modüllerin yönetimi. | 1.18.2 |
| [Widget Platformu](./moduller/widgets) | Modüllerin üst çubuk ve paneller için bileşenlerini güvenli biçimde toplar. | 0.3.1 |

## Resmî modüller

| Modül | Açıklama | Sürüm |
|---|---|---|
| [Bağışlar](./moduller/donations) | Bağış kayıtları, bağış makbuzu (Zuwendungsbestätigung) ve bağışçı takibi. | 1.1.13 |
| [Banka bağlantısı](./moduller/banking) | Banka hesaplarını lisanslı PSD2 sağlayıcısı üzerinden bağlar, hareketleri muhasebeye aktarır. | 1.1.8 |
| [CRM](./moduller/crm) | Kişiler ve kurumlarla ilişki yönetimi: aşamalar, fırsatlar, zaman akışı ve takipler. | 1.0.10 |
| [Demo veri](./moduller/demo) | Test için kurgusal örnek veri yükler; modül kapatılınca hepsini siler. | 1.0.3 |
| [e-Sign](./moduller/online-forms) | e-Sign: kişiye süreli bağlantı, form tamamlama, Datenschutz onayı, imza ve imzalı PDF belgeleri. | 1.3.3 |
| [Envanter ve Demirbaş](./moduller/inventory) | Dernek demirbaşları, teknik ekipmanlar ve zimmet kayıtlarının takibi. | 1.1.12 |
| [Etkinlikler](./moduller/events) | Dernek etkinlikleri, seminerler, atölyeler ve katılımcı yönetimi. | 1.2.12 |
| [Evrak Kayıt](./moduller/documents) | Gelen ve giden resmi evrakların numaralandırılması, takibi ve arşivlenmesi. | 1.10.2 |
| [Geri bildirim](./moduller/feedback) | Test kullanıcılarının hata ve önerilerini toplar. | 1.1.6 |
| [Hibeler](./moduller/grants) | Hibe ve proje fonları: finansman planı, ödemeler ve Verwendungsnachweis (kullanım raporu). | 1.0.11 |
| [Kurslar](./moduller/courses) | Gönüllü kurslar ve Nachhilfe: öğretmenler, dersler, kayıtlar, ücretler ve muhasebe aktarımı. | 1.4.15 |
| [Muhasebe](./moduller/accounting) | Dernekler ve küçük işletmeler için EÜR odaklı gelir-gider, fiş, fatura ve bütçe yönetimi. | 1.27.3 |
| [Öğrenci takibi](./moduller/progress) | Kurs öğrencilerinin yoklaması, sınav ve notları, gelişim notları ve veli raporu. | 1.1.7 |
| [Öğrenciler](./moduller/students) | Kurs ve Nachhilfe öğrencileri, veliler ve DATEV uyumlu borçlu (Debitor) kayıtları. | 1.4.13 |
| [Security Monitor](./moduller/security-monitor) | Regularly runs system security tests and monitors results | 1.3.6 |
| [SEPA otomatik ödeme](./moduller/sepa) | Aidat ve kurs ücretleri için SEPA-Lastschrift (pain.008) tahsilatı. | 1.2.1 |
| [Takvim](./moduller/calendar) | Kişisel ve ortak takvimler; etkinlik, toplantı, görev ve son tarihler tek görünümde. | 1.3.15 |
| [Toplantılar](./moduller/meetings) | Yönetim kurulu ve genel kurul toplantı takvimi, tutanaklar ve kararlar. | 1.4.2 |
| [Toplu e-posta](./moduller/mailings) | Üyelere, velilere ve diğer modüllerin alıcı listelerine kişiye özel toplu e-posta. | 2.6.2 |
| [Üyeler](./moduller/members) | Üye kayıtları, üyelik tipleri, aidat tahakkuk ve ödeme takibi. | 1.15.7 |

## Eklentiler

| Modül | Açıklama | Sürüm |
|---|---|---|
| [Apple Takvim](./moduller/calendar-apple) | iCloud takvimini CalDAV ile salt okunur bağlar (Apple ID + uygulamaya özel parola). | 1.0.1 |
| [Çocuk Koruma](./moduller/youth-protection) | Eğitmen ve gönüllülerin genişletilmiş adli sicil belgesi (§ 72a SGB VIII) ibraz takibi ve harç muafiyet yazısı şablonu. Orijinal belge fiziki olarak incelenir, asla sisteme yüklenmez ve dijitalleştirilmez. | 0.1.2 |
| [Finans](./moduller/finance) | Canlı döviz kurları, piyasa göstergeleri, kur çevirici ve finansal AI asistanı. | 0.1.4 |
| [Google Takvim](./moduller/calendar-google) | Google Takvim hesabını takvime salt okunur bağlar (OAuth; yönetici kendi Google Cloud uygulamasını girer). | 1.0.1 |
| [Görevler](./moduller/tasks) | Görev ve iş takibi yönetimi. | 1.3.13 |
| [Hava Durumu](./moduller/weather) | Anlık konum bazlı hava durumu, tahminler, panel kartı ve sekreter etkinlik önerileri (Dış API: api.open-meteo.com). | 0.1.4 |
| [Otomasyon](./moduller/automation) | Kalıcı arka plan görevleri ve iş akışları. | 0.10.16 |
| [Outlook Takvim](./moduller/calendar-outlook) | Microsoft 365 / Outlook takvimini salt okunur bağlar (OAuth; yönetici kendi Azure uygulamasını girer). | 1.0.1 |
| [Sekreter](./moduller/secretary) | Kişisel sekreter: sabah özeti ve onaylı öneriler. | 0.13.3 |
| [SMS](./moduller/campaign-sms) | Kampanyalar için SMS kanalı (seven.io veya Twilio). Yalnız SMS izni verenlere gider. | 1.1.2 |
| [Telegram](./moduller/campaign-telegram) | Kampanyalar için Telegram kanalı (Bot API). Kişi davet bağlantısıyla abone olur; /stop ile ayrılır. | 1.0.2 |
| [Uyum kontrolü](./moduller/compliance) | Kamu yararı (Gemeinnützigkeit) için iç kontrol listesi: süreler ve sınırlar. Vergi danışmanlığı değildir. | 0.2.1 |
| [Üye Portalı](./moduller/member-portal) | Parolasız sihirli bağlantı ve geçiş anahtarı ile üye self-servis portalı. | 0.3.1 |
| [WhatsApp](./moduller/campaign-whatsapp) | Kampanyalar için WhatsApp kanalı (Meta Cloud API, onaylı şablonla). Yalnız WhatsApp izni verenlere gider. | 1.1.2 |
| [Yapay zekâ asistanı](./moduller/ai) | Sağ panelde sohbet eden, yalnızca izin verilen modüllerin toplu verisini okuyan asistan. | 1.15.10 |
