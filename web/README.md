# Shelf Ready web UI

Read-only React/Vite viewer of saved pipeline results. The default screen uses a prepared B1 snapshot, never demonstration listings. Generation and verification have not run; no B1 card is ready for publication.

## From a clean checkout

Run from the repository root with Node 24.14.1:

```sh
npm ci
npm --prefix web ci
npm run web:prepare -- --run-dir reports/B1-stage5-control
npm run web
```

Open the URL printed by Vite (normally http://localhost:5173). For an explicit loopback address use `npm --prefix web run dev -- --host 127.0.0.1`.

`web:prepare` validates `result.json` and `report.json`, checks the decisions hash, then writes `web/public/data/catalog.json` atomically. It copies only result data and selected run metadata, not provider configuration. It refuses test runs, mismatched reports and results with generation/verifier output. The original run is never changed. Prepared data is ignored by Git and must be prepared again in each clean checkout.

To view a new code-only run:

```sh
npm run pipeline -- --baseline b1 --semantic-checks eval/stage3-checks.json --out reports/local --run-id my-ui-run
npm run web:prepare -- --run-dir reports/local/my-ui-run
```

Reload the page after preparing a different run. Rebuild before previewing a changed production snapshot:

```sh
npm run web:test
npm run web:build
npm --prefix web run preview -- --host 127.0.0.1
```

The build contains the snapshot prepared before `web:build`. Preview normally uses port 4173.

## Optional URL override

Set `VITE_CATALOG_URL=/data/another-result.json` in `web/.env.local` and restart Vite, or set it in the build environment. The URL may point to the prepared `{ provenance, result }` document or a raw saved `ProductResult`. A raw result shows metadata as unavailable. Cross-origin URLs require CORS. There is no demo fallback on missing or malformed data; the error includes the preparation command. No API key belongs in frontend configuration.

The viewer validates nested fields and evidence/source links without changing matching, categories or facts. It shows offers, unchanged source and review rows, exact evidence, reasons, non-products and all row outcomes. `review` as a row outcome differs from review flags on grouped products. Source anchors stay inside the selected product and its related review rows. Draft/publishable text remains unavailable until stage 4 supplies a listing contract and stage 5 integrates it.

Synthetic demo fixtures are imported only by tests. They do not prove runtime model quality. Browser verification and screenshots: [stage 5 report](../docs/STAGE5_REPORT.md).
