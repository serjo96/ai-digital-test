# Shelf Ready web UI

React/Vite viewer of saved pipeline results. It supports the existing B1 catalog and a B3 human-review workspace; it never substitutes demonstration listings or calls an AI provider.

## From a clean checkout

Run from the repository root with Node 24.14.1:

```sh
npm ci
npm --prefix web ci
npm run web:prepare -- --run-dir reports/B3-openai-full-input-atomic-v2-holdout-replay
npm run web
```

Open the URL printed by Vite (normally http://localhost:5173). For an explicit loopback address use `npm --prefix web run dev -- --host 127.0.0.1`.

`web:prepare` validates `result.json` and `report.json`, checks the decisions hash and, for B3, the publication hash. A B3 review bundle also validates generated review, controlled verifier records and matching labels against the feed/report hash before writing `web/public/data/catalog.json` atomically. `--matching-labels PATH` can select another compatible labels file; the default is `eval/labels.json`. Provider configuration and secrets are not copied. Test runs and mismatched artifacts are refused; the original run is never changed. Prepared data is ignored by Git and must be prepared again in each clean checkout.

To view a new code-only run:

```sh
npm run pipeline -- --baseline b1 --semantic-checks eval/stage3-checks.json --out reports/local --run-id my-ui-run
npm run web:prepare -- --run-dir reports/local/my-ui-run
```

To review the saved OpenAI development run, use the first command above. Open **Check listing text**. This is a supplier-text fidelity review, not external product research: the feed contains no authoritative manufacturer URL, and supplier titles/specs are unverified input statements.

- **Generated listings** starts with a three-step explanation of the task. Each decision card repeats the current item and places exactly two texts side by side: **Text written by system** and **Original text supplied for this item**. The saved automatic-verifier answer is collapsed below the human choices so it does not steer the independent review.
- Human choices are phrased by the actual task: **Matches supplied data**, **Does not match supplied data**, or **Supplied sources conflict**. They do not assert that the supplier statement is true in the real world.
- **Verifier test cases** (secondary) explains and renders the 12 prewritten QA examples. They test the saved verifier and are not additional products for the reviewer to label.
- Human verdicts and rationales are saved in browser `localStorage`, keyed by `publicationHash`. **Download review** exports a provisional file until every statement has a rationale and a reviewer is set; only then is the export marked `human_verified` with a timestamp.

Open **Check product matching** for the 20 matching cases. It shows the unchanged rows, expected groups, non-products, unknown pairs and an explanation. Confirm a case only after checking its complete partition; leave a wrong case pending and report its ID. The download is enabled only at 20/20 with a reviewer and exports `labels-human-verified.json`. The holdout cases are visibly marked; since the first holdout replay has already been run, changes based on them are post-holdout development.

Exports are not written back into the repository automatically. Review them and deliberately replace the relevant canonical artifact before running a gate or final evaluation.

Reload the page after preparing a different run. Rebuild before previewing a changed production snapshot:

```sh
npm run web:test
npm run web:build
npm --prefix web run preview -- --host 127.0.0.1
```

The build contains the snapshot prepared before `web:build`. Preview normally uses port 4173.

## Optional URL override

Set `VITE_CATALOG_URL=/data/another-result.json` in `web/.env.local` and restart Vite, or set it in the build environment. The URL may point to the prepared `{ provenance, result }` document or a raw saved `ProductResult`. A raw result shows metadata as unavailable. Cross-origin URLs require CORS. There is no demo fallback on missing or malformed data; the error includes the preparation command. No API key belongs in frontend configuration.

The viewer validates nested fields and evidence/source links without changing matching, categories or facts. It shows offers, unchanged source and review rows, exact evidence, reasons, non-products and all row outcomes. B3 cards use the saved listing status and text; claim review renders saved verifier output rather than re-verifying in the browser. `review` as a row outcome differs from review flags on grouped products. Source anchors stay inside the selected product and its related review rows. B1 remains explicitly pre-generation.

Synthetic demo fixtures are imported only by tests. They do not prove runtime model quality. Browser verification and screenshots: [stage 5 report](../docs/STAGE5_REPORT.md).
