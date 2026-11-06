# Automation Worker

Automation uses the existing ERP module, Prisma models and transactional outbox. pg-boss is only the PostgreSQL-backed transport; execution and step state remain in the ERP tables.

## Local development

1. Start the local PostgreSQL database and apply the existing Prisma migrations:

   pnpm db:deploy

2. Start the web application and worker in one terminal:

   pnpm dev:full

   This command runs the existing predev preparation once, then starts the web process and the independent worker process. It explicitly enables both automation flags for these local child processes; production environment settings are not changed.

3. Stop both processes with Ctrl+C.

For isolated debugging, use pnpm dev for the web application or pnpm automation:worker for the worker. The worker loads the same .env files and exits without connecting to PostgreSQL when its activation flags are off.

## Deployment

- Vercel: keep AUTOMATION_ENABLED=false and AUTOMATION_WORKER_ENABLED=false.
- Coolify web service: set AUTOMATION_ENABLED=true and AUTOMATION_WORKER_ENABLED=false.
- Coolify worker service: build the same Dockerfile with build target worker, use the same database environment, and set AUTOMATION_ENABLED=true plus AUTOMATION_WORKER_ENABLED=true. The worker target has its own TSX entrypoint; do not override it with the web runner's standalone command.

Do not start the worker from a Next.js route, Server Action, or instrumentation hook. It is a separate long-lived process.

## Delivery guarantees

The outbox dispatcher publishes only minimal execution identifiers. It claims rows atomically with PostgreSQL `FOR UPDATE SKIP LOCKED`; a claim expires after five minutes so another dispatcher can recover it after a crash. A stable pg-boss singleton key protects the crash window between publishing and marking the outbox row as PUBLISHED.

The worker claims execution rows with a 45-second lease and renews ownership every 10 seconds. Legacy RUNNING rows created before lease fields existed retain the previous two-hour stale window during rollout. Each claim increments a fencing token. Heartbeat, retry, and terminal-state writes are conditional on the current worker ID and fencing token, so an expired worker cannot overwrite a newer worker's execution state. A worker whose lease cannot be renewed aborts its task signal. The dispatcher also scans for expired execution leases every 15 seconds: it atomically requeues recoverable attempts through a new outbox event and marks executions FAILED when their persisted attempt budget is exhausted. This recovery path also covers a worker process crash after pg-boss has exhausted its own delivery retries. It also checks stale PENDING executions against pg-boss live job states (`created`, `retry`, `active`). If transport retries ended before the handler claimed the execution, the dispatcher creates a minute-bucketed recovery outbox event. Recovery events share a stable per-execution singleton key, while the short deduplication window allows a terminally failed transport delivery to be enqueued again. Future-scheduled executions and executions with a live queue job are left untouched.

Delivery remains at-least-once. Task handlers must honor `context.signal`, be idempotent, and use stable downstream idempotency keys for external side effects. A process can lose its lease while an external request is already in flight; fencing protects ERP state but cannot roll back an already accepted email, payment, or webhook. The ERP execution record remains authoritative.

Task handlers must be registered in trusted application code through the existing automation task registry. Never accept user-provided JavaScript, import paths, or executable workflow payloads.

## İlk görev entegrasyonu: toplu e-posta

- `mailings.send_campaign@1` statik görev kaydıdır; queue payload yalnızca kampanya kimliği taşır.
- Alıcı adresleri ve kişiselleştirilmiş gövdeler automation execution/outbox payload'ına yazılmaz.
- Worker kampanyayı ve oluşturan kullanıcıyı DB'den okur; kullanıcının aktifliğini, toplu e-posta iznini, kaynak iznini ve gerekli modüllerin etkinliğini yeniden kontrol eder.
- Alıcı kaynağı worker çalıştığı anda tekrar çözülür; e-posta istemeyenler ve adresi olmayanlar yeniden filtrelenir.
- Önceki denemelerde `SENT` veya `LOGGED` olarak kaydedilmiş alıcılar tekrar gönderilmez. SMTP sunucusunun kabulü ile log yazımı arasındaki çok kısa çökme aralığı dağıtık sistemlerde kesin olarak kapatılamaz; teslimat semantiği bu nedenle at-least-once'dur.
- `mailings` modülünün kullanılabilmesi için `automation` modülü de etkin olmalıdır. `pnpm dev:full` yerel web + worker süreçlerini birlikte başlatır. Worker kapalıysa kampanya SENDING durumunda bekler; worker logları ve Automation execution kayıtları kontrol edilmelidir.

Feature modules declare trusted tasks in `src/modules/<module>/automation.ts`. The central registry imports only this narrow declaration entrypoint; task handlers dynamically load their own module services when executed. This keeps queue registration static without importing UI or Server Action modules into the worker.

## Modül görev sözleşmesi ve merkezi API (0.6.0)

- **Kayıt:** `src/modules/<modül>/automation.ts` içinden dışa aktarılan her `defineTask(...)` `pnpm module:sync` ile `src/automation-registry.ts` dosyasına otomatik eklenir. Görev anahtarının ön eki modül klasör adıyla aynı olmalıdır (`mailings.send_campaign` → `mailings`). Aynı dosyadaki fonksiyon dışa aktarımları (ör. worker için dar API'ler) görev sayılmaz.
- **Kuyruğa alma:** `enqueueTask(task, input, options)` (`@/modules/automation/automation`). Görevin modülü, istek yapan modül ve `automation` etkin ve erişim onaylı olmalıdır; yetki kontrolü çağıran action'ın sorumluluğundadır. Worker aynı kontrolü çalıştırma anında tekrarlar; modül sonradan kapatıldıysa execution `FAILED / MODULE_UNAVAILABLE` olur ve izleme ekranından yeniden denenebilir.
- **Kontrol:** `cancelExecution`, `retryExecution`, `getExecution`. İptal çalışan bir görevde kira yenilemesini başarısız kılar; worker sinyali iptal eder ve fencing nedeniyle durumu üzerine yazamaz. Yeniden deneme aynı execution kaydını yeni deneme bütçesiyle ve yeni outbox olayıyla tekrar kuyruğa alır.
- **Zamanlama:** Görev `schedule: { input, minIntervalMinutes }` bildirirse yöneticiler (`automation:approve`) Otomasyon ekranından aralık seçerek zamanlayabilir. Girdi her dilim için güvenilir koddan üretilir. Her dilim `schedule:<id>:<slotISO>` idempotency anahtarı kullanır; eşzamanlı worker'lar veya çökme aynı dilimi iki kez çalıştıramaz. Kaçırılan dilimler toplu çalıştırılmaz.
- **Saklama:** Worker saatte bir; SUCCEEDED/CANCELLED kayıtları 90 gün, FAILED kayıtları 180 gün, PUBLISHED/FAILED outbox satırlarını 14 gün sonra siler.

## Görsel iş akışları (0.7.0)

**Ekranlar:** Ayarlar → İş akışları (`/automation/workflows`). Onay bekleyen adımlar Otomasyon İzleme ekranının üstünde listelenir.

**Yetkiler:** `view` listeyi ve çalıştırmaları görür; `create` akış oluşturur; `update` taslak kaydeder ve elle başlatır; `approve` yayımlar, açar/kapatır ve onay kararı verir; `delete` siler.

**Akış modeli:**
- Düzenleyici (`@workflowbuilder/sdk`, `props` kalıcılık stratejisi) yalnızca *taslak JSON* üretir; bu JSON asla çalıştırılmaz.
- Yayımlama, taslağı `src/shared/automation/workflow-graph.ts` içindeki derleyiciyle kanonik grafa çevirir, sunucuda doğrular ve değiştirilemez bir `AutomationWorkflowVersion` olarak saklar. Çalışma zamanı yalnızca bu grafı yürütür.
- Düğümler: `trigger` (elle / olay), `task` (yalnızca `workflow` bildiren kayıtlı görevler), `condition`, `parallel`, `delay` (süre veya ISO tarih), `approval`. Kod düğümü yoktur.
- Görev girdisi JSON'dur; değerler yalnızca tam dize başvurusu olabilir: `{{trigger.alan}}`, `{{steps.<düğüm>.alan}}`, `{{uuid}}`. İfade dili yoktur.
- Koşul sağlanmazsa veya onay reddedilirse sonraki dal atlanır (dead-path elimination). Else dalı için ters koşullu ikinci bir koşul kullanılır. Birleşme düğümü, tüm gelen dallar çözülene kadar bekler.
- Sınırlar: 50 düğüm, 100 kenar, derinlik 25, düğüm başına 10 çıkış, 32 KB yük, en çok 90 gün bekleme, çalıştırma başına en çok 120 gün.

**Çalışma zamanı:**
- Bir çalıştırma `kind=WORKFLOW` execution'dır ve etkinken `WAITING` durumundadır (görev kurtarma yolları bu kayıtlara dokunmaz). Adımlar `AutomationStepRun` satırlarıdır (`stepKey` = düğüm kimliği).
- İlerletme (`advanceWorkflowRun`) satır kilidiyle seri çalışır ve her seferinde durumu baştan hesaplar; tekrar çağrılması güvenlidir.
- Görev düğümleri, aynı transaction içinde `workflow:<run>:<düğüm>` idempotency anahtarlı alt görev oluşturur. Alt görev bittiğinde worker aynı commit içinde ilerletme olayı yazar.
- Bekleme adımları `waitUntil` ile kalıcıdır; worker 15 saniyede bir süresi dolanları ilerletir. Onay kararı da outbox üzerinden ilerletme olayı yazar.
- Çalıştırma iptali bekleyen adımları ve çalışan alt görevleri iptal eder. İş akışı çalıştırmaları "yeniden dene" ile tekrarlanamaz; yeni çalıştırma başlatılır.

**Olaylar:**
- Modüller `automation.ts` içinde `defineEvent({ key, payloadSchema })` ile olay bildirir ve `emitAutomationEvent(event, data, tx)` ile iş transaction'ı içinde yayımlar. Otomasyon kapalıysa veya modül kullanılamıyorsa çağrı hiçbir şey yapmaz.
- Yükler yalnızca kimlik ve kişisel olmayan değerler taşır. Mevcut olaylar: `members.created`, `mailings.campaign_finished`.
- Worker olayı, tetikleyicisi bu olay olan etkin akışlar için `event:<outbox>:<akış>` anahtarıyla bir kez başlatır.

## Sorun giderme: terminal izleme logları

Web ve worker süreçleri `[automation:…]` önekli izleme satırları yazar (kapatmak için `AUTOMATION_TRACE=false`). Kişisel veri yazılmaz; e-posta adresleri maskelenir (`b***@ornek.de`).

Bir iş akışının adım adım izlenmesi:

| Satır | Süreç | Anlamı |
|---|---|---|
| `[automation:event] queued in outbox` | web | Olay (ör. yeni üye) kaydedildi. |
| `[automation:event] skipped: AUTOMATION_ENABLED is not true` | web | Web sürecinde otomasyon kapalı; `pnpm dev:full` kullanın veya `.env` içinde `AUTOMATION_ENABLED=true` yapın. |
| `[automation:workflow] event received … matchingWorkflows=…` | worker | Olayı dinleyen yayımlanmış ve açık akışlar. `none` ise akış yayımlanmamış/kapalı ya da tetikleyici olayı farklı. |
| `[automation:workflow] step task queued` | worker | Adımın görevi kuyruğa alındı. |
| `[automation:task] attempt started / succeeded / failed code=…` | worker | Görev denemesi ve sonucu; `willRetry` yeniden deneme olup olmayacağını gösterir. |
| `[automation:mail] sending / sent / send failed smtpError=…` | worker | SMTP sonucu; `mailLog` E-posta günlüğündeki kaydın kimliğidir. |
| `[automation:mail] not configured` | worker | Ayarlar → E-posta doldurulmamış. |

Worker çalışmıyorsa olaylar outbox'ta bekler ve hiçbir `[automation:workflow]` satırı görünmez; `pnpm dev:full` veya `pnpm automation:worker` ile başlatın. Kod değiştikten sonra worker yeniden başlatılmalıdır.
