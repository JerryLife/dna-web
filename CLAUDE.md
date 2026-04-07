# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LLM DNA Explorer is a full-stack web app that visualizes behavioral fingerprints ("DNA") of 300+ LLMs. It uses the RepTrace methodology to extract 128-dimensional signature vectors from model responses and projects them into interactive 2D scatter plots. The live site is at https://dna.xtra.science.

## Commands

```bash
# Development
npm run dev              # Vite dev server on port 5173
npm run server           # Express backend on port 3001
npm run dev:all          # Run both frontend and backend concurrently
bash scripts/restart_clean.sh  # Full reset: kill stale processes, clear Vite cache, restart

# Build & Data
npm run build            # Production build to dist/
npm run build:data       # Rebuild DNA databases from dna-out/ and dna-chat-out/
node scripts/build_database.js raw   # Build raw DNA database only
node scripts/build_database.js chat  # Build chat DNA database only

# Test
npm run test             # Run vitest (pipeline integration tests)

# Deploy
./deploy.sh              # Docker compose build + up (frontend on 3000, backend on 3001)
```

## Architecture

### Frontend (React + Vite + TypeScript)

- **Entry**: `index.html` -> `src/main.tsx` -> `src/App.tsx`
- **Routing**: File-based via `src/routes.tsx` — each `src/pages/*.tsx` maps to a URL (e.g., `pages/lab.tsx` -> `/lab`)
- **Pages**: `index.tsx` (DNA Galaxy scatter plot), `lab.tsx` (community proposals/voting), `workbench.tsx` (model comparison), `about.tsx` (methodology), `verify.tsx` (email verification)
- **Data layer**: `src/contexts/DataContext.tsx` provides a dual-mode context (`raw` and `chat` DNA databases). Uses `DataLoader` class from `src/utils/data.ts` which handles fetching, cosine distance, and model ranking.
- **Visualization**: D3.js for the interactive scatter plot in `pages/index.tsx`. 2D coordinates are pre-computed via t-SNE (default), UMAP, PCA, or random projection.
- **UI**: Mantine 8 (violet primary theme) + Tailwind CSS. Path alias `@/*` maps to `src/*`.

### Backend (Express + SQLite)

- **Entry**: `server/index.ts` — Express with CORS, rate limiting (100 req/min), API proxy from Vite on `/api`
- **Database**: `server/database.ts` — SQLite with tables: `submission_queue`, `proposals`, `votes`, `subscriptions`
- **Services**: `server/services/submission.ts` (proposals with Turnstile CAPTCHA), `server/services/verification.ts` (email token flow), `server/services/email.ts` (Nodemailer)
- **Cron**: `server/cron/cleanup.ts` — expires pending submissions after 24h

### Data Pipeline

1. Raw DNA signatures live in `dna-out/` (raw prompts) and `dna-chat-out/` (chat prompts), organized by `{dataset}/{provider_model}/`
2. `npm run build:data` runs `scripts/build_database.js` which reads all `*_dna.json` files, computes 2D projections, and outputs `public/dna_database.json` and `public/dna_database_chat.json`
3. Frontend loads these JSON databases on startup via `DataProvider`

### Configuration

`config.json` is the central config controlling: dataset paths, projection method, visualization params, Google Analytics tag, and server settings. Imported directly in both frontend (`src/config.ts`) and build scripts.

### Environment Variables

- Root `.env`: `BASE_URL` for production domain
- `server/.env`: `TURNSTILE_SECRET_KEY`, `EMAIL_USER`, `EMAIL_PASS`

## Key Technical Details

- ESM project (`"type": "module"` in package.json). Backend runs via `tsx`.
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`.
- The DNA Galaxy page (`src/pages/index.tsx`) is the largest component — it handles D3.js rendering, zoom, search, filtering, and model selection all in one file.
- DNA databases in `public/` are never browser-cached (configured in `nginx.conf`) since they update frequently with new models.
- Tests use Vitest + Supertest for backend pipeline integration testing (`test/pipeline.test.ts`).
