# GitHub Actions + GHCR + Coolify deployment

This project uses GitHub-hosted runners for CI and Docker image builds. The production server only pulls already-built images; it does not compile the application.

## Pipeline

1. Every pull request runs the existing quality gate: PostgreSQL-backed migrations, Prisma validation, generated-file checks, translations, typecheck, lint, module standards/version checks, tests, and Next.js build.
2. Pull requests do not build or publish Docker images.
3. After the quality gate passes on a push to `main`, GitHub Actions builds and publishes two images to GHCR:
   - Web: `ghcr.io/akgngr/verein-erp:latest`
   - Automation worker: `ghcr.io/akgngr/verein-erp:worker-latest`
4. Commit-specific immutable tags are published as well:
   - `ghcr.io/akgngr/verein-erp:sha-<commit-sha>`
   - `ghcr.io/akgngr/verein-erp:worker-sha-<commit-sha>`
5. Production deployment is not automatic. An authorized maintainer starts the **Deploy to Coolify** workflow manually from `main`, confirms the production checkbox, and passes the optional `production` environment approval gate.

## One-time GHCR setup

The first successful main-branch publication creates the package `verein-erp` in GitHub Packages.

1. Open the repository owner's GitHub profile and select **Packages**.
2. Open the `verein-erp` container package.
3. Open **Package settings** and change visibility to **Public**.
4. Confirm that the web and worker tags are visible.

Public GHCR images can be pulled without registry credentials. If the package remains private, Coolify must be configured with credentials that have package read access.

## Coolify setup

Do not switch or delete the existing production resource until the image-based resources have been configured and tested. Prefer creating separate resources first so the current deployment remains available for rollback.

### Web application

Create a Coolify **Docker Image** application with:

- Image: `ghcr.io/akgngr/verein-erp`
- Tag: `latest`
- Exposed port: `3000`
- The same production runtime environment variables currently used by the web service.
- The existing persistent upload volume mounted at `/app/storage/uploads`.
- The existing production PostgreSQL connection and other required runtime services.

The image's startup command applies Prisma migrations and verifies database integrity before starting Next.js. Do not run a second independent migration process at the same time.

### Automation worker

Create a separate Coolify **Docker Image** service using:

- Image: `ghcr.io/akgngr/verein-erp`
- Tag: `worker-latest`
- No public HTTP port.
- The same required database and mail-related runtime environment variables as the existing worker configuration.
- `AUTOMATION_ENABLED=true`
- `AUTOMATION_WORKER_ENABLED=true`

The web service should retain `AUTOMATION_ENABLED=true` and `AUTOMATION_WORKER_ENABLED=false`. Do not enable the worker flag on the web service.

### Coolify deployment token and webhook

1. Enable API access in Coolify under **Settings → Advanced**.
2. Create an API token under **Keys & Tokens → API Tokens** with only the **Deploy** permission.
3. In each relevant Coolify resource, open **Webhooks** and copy its authenticated **Deploy Webhook** URL.
4. If the web and worker resources should be deployed together, use a Coolify deploy webhook URL targeting both resource UUIDs (the deploy endpoint accepts comma-separated UUIDs). Otherwise, create a small separate workflow for each resource.
5. In GitHub, open **Settings → Environments** and create an environment named `production`.
6. Optionally configure required reviewers for this environment. On a public repository, this provides a second approval gate after the manual workflow dispatch.
7. Add these secrets to the `production` environment:
   - `COOLIFY_DEPLOY_WEBHOOK`: the authenticated deploy webhook URL.
   - `COOLIFY_TOKEN`: the deploy-only Coolify API token.

Never commit these values to the repository or place them in workflow YAML.

## Manual production deployment

1. Confirm the latest `main` CI run is green and the Docker job has published both image tags.
2. Open **Actions → Deploy to Coolify → Run workflow**.
3. Select `main`, enable the production confirmation checkbox, and start the workflow.
4. Approve the `production` environment deployment if required reviewers are configured.
5. Check Coolify's deployment logs. Confirm that it pulls the new GHCR images, starts the web and worker resources, and that both become healthy.

A successful webhook response only confirms that Coolify accepted the deployment request. It does not prove that containers became healthy; always verify the deployment logs and application health.

## Cost and resource boundaries

- GitHub-hosted standard runners are free for public repositories.
- Docker builds run in GitHub Actions, not on the production server.
- Coolify pulls the published images and runs the containers; it does not build the source for Docker Image resources.
- No preview deployment is created for every pull request.
- No production deployment happens automatically after a merge.
- The workflow currently publishes `linux/amd64` images. Change the Buildx platform setting if the target server uses another architecture.

## Rollback

The workflow publishes immutable commit-specific tags. To roll back, change the Docker Image tag in Coolify to a previously successful `sha-<commit-sha>` or `worker-sha-<commit-sha>` tag, then redeploy that resource. Keep web and worker tags from the same commit when their code versions must match.
