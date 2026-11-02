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

The outbox dispatcher publishes only minimal execution identifiers. A stable pg-boss singleton key prevents duplicate queue jobs when a process stops between publishing and marking the outbox row. The worker claims execution rows transactionally and treats completed executions as no-ops. Delivery is at-least-once, so task handlers must be idempotent and should use the provided stable execution ID for downstream deduplication. pg-boss retry/backoff handles transient task failures; the ERP execution record remains authoritative.

Task handlers must be registered in trusted application code through the existing automation task registry. Never accept user-provided JavaScript, import paths, or executable workflow payloads.

## İlk görev entegrasyonu: toplu e-posta

- `mailings.send_campaign@1` statik görev kaydıdır; queue payload yalnızca kampanya kimliği taşır.
- Alıcı adresleri ve kişiselleştirilmiş gövdeler automation execution/outbox payload'ına yazılmaz.
- Worker kampanyayı ve oluşturan kullanıcıyı DB'den okur; kullanıcının aktifliğini, toplu e-posta iznini, kaynak iznini ve gerekli modüllerin etkinliğini yeniden kontrol eder.
- Alıcı kaynağı worker çalıştığı anda tekrar çözülür; e-posta istemeyenler ve adresi olmayanlar yeniden filtrelenir.
- Önceki denemelerde `SENT` veya `LOGGED` olarak kaydedilmiş alıcılar tekrar gönderilmez. SMTP sunucusunun kabulü ile log yazımı arasındaki çok kısa çökme aralığı dağıtık sistemlerde kesin olarak kapatılamaz; teslimat semantiği bu nedenle at-least-once'dur.
- `mailings` modülünün kullanılabilmesi için `automation` modülü de etkin olmalıdır. `pnpm dev:full` yerel web + worker süreçlerini birlikte başlatır. Worker kapalıysa kampanya SENDING durumunda bekler; worker logları ve Automation execution kayıtları kontrol edilmelidir.
