# Automation Engine — Architecture and Delivery Plan

Status: design baseline for implementation. This document is normative for the first implementation stages.

## Goals

Provide a durable, centralized background execution and workflow capability for Verein ERP.

- PostgreSQL is the only infrastructure dependency for persistence, coordination, schedules, and queue transport.
- No Redis, external queue service, Payload CMS, Temporal, or hosted workflow backend.
- Feature modules opt in through a convention file; modules that do not opt in remain unchanged.
- The existing `tasks` module remains end-user task management. Background executions belong to `automation`.
- Workflow Builder is an editor only. Verein ERP owns validation, persistence, execution, authorization, retries, and audit.

## Architecture

Separate the system into four layers:

1. **Definition / registry** — trusted, statically imported task definitions contributed by modules.
2. **Control plane** — workflow definitions and immutable versions, execution records, schedules, approvals, pause/resume/cancel, and audit.
3. **Queue / worker plane** — PostgreSQL-backed durable queue and independently running worker process.
4. **Presentation** — execution history and Workflow Builder editor.

Use `pg-boss` as the PostgreSQL-backed queue transport. It is not the workflow engine or source of truth. Keep its internal tables in a dedicated PostgreSQL schema (for example `pgboss`) and do not model those tables in Prisma. The application owns workflow/run/step state.

The worker must run as a separate long-lived process/container using the same application image and database. Do not start workers in Next.js routes, Server Actions, request handlers, or instrumentation. The web process may enqueue work but must not execute long-running jobs in-process.

## Suggested module layout

```text
src/modules/automation/
  module.config.ts
  schema.prisma
  index.ts
  server.ts
  ui.ts
  permissions.ts
  messages/tr.json
  messages/de.json
  tasks/
  queues/
  workers/
  workflows/
    graph-schema.ts
    compiler.ts
    validator.ts
    executor.ts
    versioning.ts
  editor/
    workflow-editor.tsx
    workflow-editor-loader.tsx
    node-types/
    adapters/workflow-builder-adapter.ts
  actions/
  services/
  queries/
  views/
  components/
src/shared/automation/define.ts
src/automation-registry.ts                 # generated
src/modules/<feature>/automation.ts        # optional convention
```

Only modules that contribute tasks need `automation.ts`. Extend the existing module registry synchronizer to generate the automation registry from these optional files. Do not add Automation as a mandatory dependency to all modules.

## Task definition contract

A task definition is trusted application code and must be statically registered. Each definition includes:

- Stable key and owning module key.
- Zod input and output schemas (or an equivalent JSON-schema representation generated from them).
- A handler that calls request/session-independent domain services.
- Queue name, retry policy, exponential backoff, timeout, and concurrency limits.
- Idempotency strategy/key requirements.
- Permission policy and module access requirements.
- Optional display metadata for the editor palette.

Never serialize functions, import paths, or executable code into the database. Never use `eval`, arbitrary dynamic imports, user-supplied JavaScript, or arbitrary SQL. Persist only task keys and validated JSON payloads. Revalidate payloads when a worker claims a job.

Handlers must not call Server Actions. Put reusable business operations in `services/` and let both actions and task handlers call those services. Store a minimal execution context: requester/actor ID, organization scope, correlation ID, source module, and locale where needed. Do not store secrets or unnecessary personal data in queue payloads; prefer entity IDs and bounded chunk references.

## Public server API

Expose a narrow server-only API from `@/modules/automation/server`:

- `enqueueTask(taskKey, input, options)`
- `scheduleTask(taskKey, input, schedule, options)`
- `startWorkflow(workflowId, input, context)`
- `cancelExecution(executionId, reason)`
- `getExecution(executionId)`
- `retryExecution(executionId)`

Enqueue-time and execution-time checks both verify that the owning module is installed and usable, declared access is approved, and the caller is authorized. A disabled module must not accept new work; pending work follows an explicit pause/cancel/dead-letter policy. Idempotency keys must be unique in a defined scope and enforced transactionally.

## Durable state and transactional outbox

Application-owned Prisma models should cover:

- Workflow definition and immutable workflow versions.
- Workflow run / execution.
- Step run / attempt.
- Schedule and trigger registration.
- Transactional outbox event.
- Execution log / state transition.

Use a transactional outbox when a business transaction must reliably enqueue follow-up work: write the business change and outbox event in the same PostgreSQL transaction, then publish the event to pg-boss. Do not treat the existing best-effort audit log as an event bus.

The pg-boss schema and internal tables are owned by pg-boss, not Prisma. Use the installed Prisma/PostgreSQL conventions and migrations; do not use `db push` in production.

## Workflow model

Persist immutable, versioned, declarative graphs. Initial supported node kinds:

- Trigger
- Task
- Condition
- Parallel
- Delay / Wait Until
- Approval

The compiler maps the editor graph to a canonical internal workflow model. The runtime executes only that canonical validated representation, never raw editor JSON. Validate node types, edge references, required properties, graph reachability, cycles, branch compatibility, module availability, permissions, and task input schemas before publishing a version.

Set hard limits for graph node count, graph depth, parallel fan-out, payload size, per-step timeout, and total execution duration. Reject unsupported cycles; loops require a separately designed bounded iteration node. Approvals and waits must persist state and resume from durable events rather than holding a worker open.

## Workflow Builder UI

Use `@workflowbuilder/sdk` with `@xyflow/react` and Zustand as the visual editor only. It serializes nodes/edges; it does not execute tasks or own backend persistence.

- Load the editor only from a client component, using a dynamic import with SSR disabled where required by the SDK.
- Render only one `WorkflowBuilder.Root` per editor page.
- Provide custom node types from the trusted task registry; the palette must not expose arbitrary code nodes.
- Initial custom nodes: Trigger, Task, Condition, Parallel, Delay, Approval, Wait Until.
- Task configuration selects a registered module/task key and presents schema-derived fields. Retry, timeout, and idempotency options are bounded by server policy.
- Use the SDK `props` persistence strategy and its save callback to call our authenticated server action/API. Do not use browser localStorage as production persistence and do not rely on the SDK's built-in unauthenticated API persistence.
- Keep editor JSON as an authoring format. Convert it through a versioned adapter into the canonical graph schema; validate on the server again before saving/publishing.
- Pin compatible SDK and peer dependency versions in the Automation module's dependency declaration and verify React 19 compatibility in CI before enabling the editor.

Official SDK references:
- https://www.npmjs.com/package/@workflowbuilder/sdk
- https://www.workflowbuilder.io/docs/overview/
- https://github.com/synergycodes/workflowbuilder

## First integration: mailings

The current mailings campaign flow creates a campaign and calls `void run(...)` in-process. A process restart can interrupt delivery and leave a campaign in SENDING. Replace this with a registered task that receives a campaign ID, loads recipients in bounded batches, sends with the existing mail service, and persists progress/results. Do not persist the full recipient list in the queue payload. Preserve the existing opt-out behavior, per-recipient mail logs, audit privacy, and campaign history.

Exports and accounting are later integrations. Ordinary short HTTP downloads should remain synchronous; only expensive generation belongs in the queue.

## Delivery sequence

### Stage 0 — Contracts and registry
- Add Automation module scaffold and permissions.
- Add shared task definition contract and optional `automation.ts` registry generation.
- Add module validation and unit tests for duplicate keys, missing modules, schema validation, and invalid retry/timeout configuration.

### Stage 1 — Durable task execution
- Add pg-boss module dependency and worker entrypoint.
- Add durable enqueue, claim, retry/backoff, timeout, idempotency, cancellation, and execution status APIs.
- Add execution history UI and operational health checks.
- Run the worker as a separate Coolify service/container.

### Stage 2 — Mailings migration
- Register campaign delivery task.
- Enqueue only the campaign ID; process recipients in bounded batches.
- Add restart/retry tests proving no duplicate sends under the chosen idempotency policy.

### Stage 3 — Schedules and outbox
- Add schedules, transactional outbox relay, event triggers, and durable wait/resume.
- Add exports and other long-running tasks incrementally.

### Stage 4 — Visual workflows
- Add Workflow Builder adapter, custom nodes, server-side validation, immutable versions, draft/publish, run history, and approval handling.

### Stage 5 — Hardening
- Rate limits, per-module quotas, retention, dead-letter handling, metrics, structured logs, backup/restore tests, and security review.

## Acceptance criteria

- A process restart does not lose accepted work.
- A worker can be restarted independently from the web service.
- Duplicate delivery is prevented or safely detected according to documented idempotency semantics.
- No Redis or external queue service is required.
- No module is forced to depend on Automation unless it explicitly requires it.
- Disabled/unapproved modules cannot enqueue or execute tasks.
- Raw Workflow Builder JSON is never executed.
- All persisted workflow versions and state transitions are auditable.
- CI covers registry discovery, validation, retries, idempotency, worker restart recovery, and graph validation.
