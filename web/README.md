# Shelf Ready web UI

Local Vite + React screen for browsing catalog snapshots. Default data is demo fixtures, not a pipeline or AI verification result.

## Setup

From the repository root (after root `npm ci`):

```sh
npm --prefix web ci
npm run web
```

Open the URL printed by Vite (default http://localhost:5173).

Build check:

```sh
npm run web:build
```

## Replacing demo fixtures with pipeline output

By default `loadCatalog()` returns the three demo cards. To load a saved `ProductResult` JSON (for example `reports/B1-v2/result.json`):

1. Copy the file into `web/public/data/result.json` (create the directory if needed).
2. Create `web/.env.local` with:

```sh
VITE_CATALOG_URL=/data/result.json
```

3. Restart `npm run web`.

Until listing/generation exists, pipeline projection sets `draftText`/`publishedText` to null and `withholdReasons: ['generation_not_run']`. No API key is required; the UI never runs matching or claim verification in the browser.
