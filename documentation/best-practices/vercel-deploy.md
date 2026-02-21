---
name: vercel-deploy
description: Deploy the current project to Vercel using the official Vercel CLI. Handles installation, authentication, and deployment.
---

# Deploy to Vercel

Deploy the current project to Vercel using the official Vercel CLI.

## Prerequisites

Check if the Vercel CLI is installed:

```bash
vercel --version
```

If not installed, install it:

```bash
npm install -g vercel
```

## Authentication

Check if already authenticated:

```bash
vercel whoami
```

If not authenticated, log in:

```bash
vercel login
```

This opens a browser for authentication. Once complete, the CLI stores credentials locally.

For CI/CD or non-interactive environments, use a token:

```bash
vercel --token $VERCEL_TOKEN
```

Tokens can be created at https://vercel.com/account/tokens.

## Deployment Steps

### 1. Preview Deployment (default)

Run from the project root:

```bash
vercel
```

This creates a preview deployment. On first run, the CLI will ask to link or create a project.

To skip prompts and accept defaults:

```bash
vercel --yes
```

### 2. Production Deployment

```bash
vercel --prod
```

### 3. With Environment Variables

```bash
vercel --env KEY=value --env ANOTHER_KEY=value
```

Or pull environment variables from the Vercel dashboard:

```bash
vercel env pull .env.local
```

### 4. Build and Deploy

By default, Vercel builds in the cloud. To build locally first:

```bash
vercel build
vercel deploy --prebuilt
```

## Workflow

Follow this sequence when deploying:

1. **Verify CLI is installed** — run `vercel --version`, install with `npm i -g vercel` if missing
2. **Verify authentication** — run `vercel whoami`, run `vercel login` if needed
3. **Run deployment** — `vercel` for preview, `vercel --prod` for production
4. **Share the deployment URL** — the CLI outputs the live URL upon success

## Output

On success, the CLI outputs:

```
Vercel CLI 41.x.x
🔍  Inspect: https://vercel.com/team/project/deployment-id
✅  Production: https://project.vercel.app
```

Always share both URLs with the user:
- **Inspect URL** — dashboard view with build logs and deployment details
- **Production/Preview URL** — the live site

## Troubleshooting

- **"Command not found"** — Install with `npm install -g vercel`
- **"Not authenticated"** — Run `vercel login`
- **"No project found"** — Run `vercel` and follow the project linking prompts, or `vercel link`
- **Build failures** — Check `vercel logs <deployment-url>` for details
- **Environment variables missing** — Use `vercel env pull` to sync from dashboard
