# Vercel Deployment Guide

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel
- Backend API running on VPS (crypto-trading-bot)

## Setup

### 1. Import Project

1. Go to https://vercel.com/new
2. Import the `crypto-trading-dashboard` repository
3. Framework Preset: **Next.js** (auto-detected)
4. Region: **Singapore (sin1)** — closest to VPS

### 2. Environment Variables

Set the following in Vercel Project Settings > Environment Variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `API_BASE_URL` | Backend API base URL (VPS) | `http://<VPS_IP>:8000` |

- `API_BASE_URL` is used in `next.config.ts` rewrites to proxy `/api/*` requests to the VPS backend
- In local development, defaults to `http://localhost:8000`

### 3. Deploy

Vercel deploys automatically on push to `main`. Manual deploy:

```bash
npx vercel --prod
```

## Architecture

```
Browser → Vercel (Next.js frontend)
              │
              └─ /api/* rewrites → VPS Backend (FastAPI :8000)
```

- Frontend: Static pages + client-side fetching via `/api/*`
- Backend: FastAPI on VPS, proxied through Next.js rewrites
- The rewrite avoids CORS issues by keeping all requests on the same origin

## Local Development vs Vercel

| Aspect | Local | Vercel |
|--------|-------|--------|
| API URL | `http://localhost:8000` | VPS IP via `API_BASE_URL` |
| Build | `npm run dev` | `npm run build` (auto) |
| Region | N/A | sin1 (Singapore) |

## Custom Domain (Optional)

1. Go to Vercel Project Settings > Domains
2. Add your domain
3. Update DNS records as instructed by Vercel
4. SSL is automatically provisioned

## Troubleshooting

- **API 502/504**: Check VPS is running and `API_BASE_URL` is correct
- **Build fails**: Run `npm run build` locally to reproduce
- **CORS errors**: Ensure requests go through `/api/*` rewrites, not directly to VPS
