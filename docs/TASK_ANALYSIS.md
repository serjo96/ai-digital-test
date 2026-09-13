# Shelf Ready: task analysis before planning

> Historical analysis of the input requirements before implementation. It is not the current handoff; current decisions and status are in [ROADMAP.md](ROADMAP.md) and [NEXT_STEPS.md](NEXT_STEPS.md).

The current stage plan and MVP assumptions adopted after this analysis: [ROADMAP.md](ROADMAP.md). The open questions below are preserved as a record of the initial analysis; the first four were resolved by working decisions in the roadmap.

Date: 2026-09-08. Sources: both pages of `AI-Digital-Take-Home-Shelf-Ready.pdf`, all 220 records in `supplier_feed.json`, and the entire `taxonomy.json`.

This is an analysis of requirements, data, and uncertainties. The architecture, stack, models, implementation plan, and final labels have not yet been selected. The assignment requirements, observations, and proposed assumptions are explicitly separated below.
    10|
## 1. The problem to solve

Heterogeneous supplier offers must be turned into canonical products with descriptions that can be published based on the provided sources. Links to source rows must be retained, contradictions must be identified, and unreliable decisions must be handed off to a human.

The key challenge is the dependency chain: a product-merging error introduces attributes from another product; the generator and verifier may then consistently accept an incorrect description because it is genuinely supported by the incorrectly attached row. Therefore, text verification alone does not prove that the entire system is correct.

The most important separate deliverable required by the PDF is `LLM_ROLES.md`: a rationale for dividing work between models and ordinary code. One large prompt for everything and an unjustified refusal to use models are explicitly identified as incorrect approaches.

## 2. Explicit requirements
    20|
| Area | Requirement | What must be observable in the result |
|---|---|---|
| Matching | Merge rows for the same real-world product | A canonical product and its attached source rows; similar but different products are not merged |
| Normalization | Convert brands, units, and prices to a consistent form | Normalized values with source data preserved |
| Classification | One category per canonical product | A value only from the closed list of 12 categories |
| Reconciliation | Decide what to publish when attributes differ | A selected or withheld value and a record of the discrepancy |
| Generation | A short buyer-facing description | A description for every canonical product, subject to publication constraints |
| Verification | Check every claim against source rows | Unsupported claims do not enter the published version |
| Uncertainty | Confidence and a human-review queue | Clear reasons for routing to review |
    30|| Evaluation | Manually label about 20 items | Matching and unsupported-claim detection metrics; a failure-analysis paragraph |
| Interface | One screen is sufficient | Canonical product, sources, generated text, flags |

The phrase “withheld or flagged, never published” requires careful interpretation: an icon beside an unsupported claim in published text is not sufficient. Separating draft text from permitted text is the proposed interpretation of this constraint, not a data schema specified by the PDF.

Required materials: a Git repository link or ZIP; ability to run from a clean clone; a README covering installation, execution, and evaluation; `LLM_ROLES.md`; a one-page `WRITEUP.md` covering architecture, 2–3 tradeoffs, what another week would add, and what was cut; and `AI_USAGE.md` listing tools, delegation, 2–3 prompts, and a specific AI mistake that was caught.

`LLM_ROLES.md` must include the step, model task, model/tier, why a model is used instead of code, consequences of error, and estimated cost and latency. It also needs at least one deliberately non-model step and an explanation.

Constraints: approximately 5–6 hours of focused work; the pipeline and model roles matter more than UI polish; stack and provider are unrestricted; an API key is promised; no cost/usage limits are specified, but cost and latency estimates are still required. Do not commit secrets. Auth, deployment, and multi-tenancy are out of scope. This is followed by a 30-minute walkthrough and a small live change.
    40|
## 3. Actual input data

At the time of analysis, the project folder contained only three source files; there was no ready-made application or ground-truth labeling.

| Measure | Fact |
|---|---|
| Rows | 220 |
| Suppliers | EuroStock GmbH 54; Direct2Retail 46; clearance-lots 42; PacRim Trading 41; NordicDist 37 |
| Schema | Every record has `row_id`, `supplier`, `supplier_sku`, `raw_title`, `raw_specs`, `price`, `stock` |
    50|| Types | All fields are strings except integer `stock` |
| Identifiers | 220 unique `row_id` values; no repeated supplier + supplier_sku pairs |
| Missing values | 23 empty raw_specs; 1 empty raw_title; 2 empty price; no missing keys |
| Stock | From 0 to 499; four rows with zero stock |
| Price formats | 37 with £; 54 with EUR; 40 with explicit USD; 86 with the $ symbol; 2 empty; one row containing `0` |
| Title matches | After trim + casefold: 169 unique titles; 48 repeated groups containing 99 rows |

The last table row is a diagnostic count, not the number of real products or a matching result. Matching names do not guarantee identity, and different names do not rule it out.

Categories: `audio_headphones`, `audio_speakers`, `wearables`, `laptops`, `tablets`, `phones`, `cameras`, `home_kitchen`, `gaming_accessories`, `storage`, `chargers_cables`, `other`. No category definitions or boundary examples are provided.
    60|
There are no separate fields for brand, manufacturer model, GTIN/EAN, condition, currency, language, update time, or supplier authority. This information is either partially present in text or absent. The first word of each title cannot be assumed to be a proven brand.

The PDF example with `row_9b67e4c70b` describes AeroBuds, but in the JSON this ID belongs to a Juniper tablet case. The actual AeroBuds row with SKU ND-4417 is `row_bdbc045131`, with stock 61 rather than 184 as shown in the PDF example. This is a discrepancy between the example and the data: use the JSON for processing and evidence references; do not treat the PDF example as an additional record.

## 4. Problems confirmed by the data

| Case | Specific observation | Why it matters |
|---|---|---|
| Different languages and spellings | SONY WH-880N / Sony Corp. WH880N Kopfhoerer; Lumen X20 Compact Digital Camera / Kompaktkamera | Ordinary exact title comparison is insufficient |
    70|| Similar but different models | Nimbus 2: 12W, 14h, 1.2kg; Nimbus 2 Pro: 24W, 18h, 1.6kg | Pro cannot be discarded as an insignificant word |
| Product and accessory | AeroBuds Pro and replacement ear tips, `row_fe3ff4b356` | Compatibility does not mean the same product; the accessory remains a separate product |
| Attribute conflict | AeroBuds: 20h total with case at NordicDist and PacRim; Akku 18h at EuroStock | This is a potential discrepancy and measurement-condition ambiguity, not proof that the majority is correct |
| Units and precision | Nimbus: 1.2kg and 42 oz; LedgerLite: 1.3kg and 2.9 lbs | Conversions yield about 1.1907kg and 1.3154kg: rounding must be considered instead of declaring every remainder a conflict |
| Offer condition | Sony `row_05e5d126cb`: OPEN BOX; Volt `row_1134eb89e7`: new in box | The condition of a specific offer cannot be applied to every offer for the product |
| Marketing instead of facts | Sony OPEN BOX: AMAZING SOUND, BEST HEADPHONES 2026 | Text appearing in a source does not make it a proven attribute |
| Very little information | Slate 11: empty specs; Volt 65W GaN charger 3-port: only new in box in specs | The title is also a source, but the screen, memory, protocols, or power distribution cannot be invented |
| No specs for an entire obvious group | Two Quill 3 desk lamp rows, `row_6668f30f9e` and `row_4d609c9ff9`, both empty | Merging does not always resolve insufficient information |
| Unusual prices | Cobalt Pro USB-C hub: $23.99 and $867.99 | The spread warrants review, but without an external reference the price cannot be corrected or the product rejected |
| One supplier, multiple SKUs | EuroStock: Harbor smart scale; Kestrel 2 bookshelf speaker pair; Torrent X bookshelf speaker pair | A “maximum one supplier row per product” rule cannot be imposed; summing stock also requires care |
    80|| Repeated patterns | Many different action cameras have 4K60 and waterproof to 10m | Matching specs do not prove model identity |

Four clearly problematic rows: `row_f4de4c72c5` is a PRICE DROP notice referring to a missing attached sheet; `row_7f570b374f` is TEST ROW DO NOT IMPORT; `row_80738b0804` is an empty product; `row_28c6da70ee` is MIXED PALLET. The PDF explicitly classifies such cases as non-products for this task. They must be handled explicitly rather than turned into ordinary products in the other category. The fact that these four rows also have zero stock does not prove that zero stock always means junk.

## 5. Undefined aspects that affect the result

1. **Product boundary.** It is unspecified when color, memory capacity, switches, bundle contents, or condition create a separate canonical entity. Proposed assumption: do not mix distinct models/variants; store condition at the offer level. OPEN BOX alone is not a new model.
2. **Source reliability.** There are no supplier priorities, dates, or reference catalog. A claim appearing in a row proves provenance, not factual truth. Proposed assumption: do not designate a source as authoritative based on its name, and do not resolve conflicts by simple voting without qualifications; withhold the disputed attribute while retaining the other supported ones.
3. **Price.** It is unspecified whether a common currency is needed, which rate and date to use, what $ means, how tax is handled, or which price to publish. Proposed assumption: normalize amount + currency at the offer level; do not convert unless necessary. Treating $ as USD is a separate explicit assumption, not a guaranteed fact.
4. **Units.** No canonical units or rounding tolerance are specified. They can be selected and documented. Different kinds of quantities must not be mechanically mixed: for example, battery with case versus earbud runtime, or read speed versus unspecified speed.
    90|5. **Taxonomy.** Categories for ear tips, a tablet case, a laptop sleeve, a standard mouse, and a USB-C hub are unclear. Proposed assumption: explicitly document boundaries and use other for valid products without a fitting category; other does not replace rejected status.
6. **Text and publication.** Language, length, tone, minimum attribute set, and target marketplace are unspecified. Proposed assumption: a short, neutral English description based on available facts; when evidence is insufficient, show a draft/reason for withholding. No actual publication integration is specified.
7. **Confidence and review.** The scale, thresholds, acceptable queue size, and manual actions are unspecified. A model score should not be presented as a calibrated probability. The signal must identify which decision it concerns: merging, category, attribute, or text.
8. **Evaluation.** Items may mean rows, pairs, or canonical groups; specific metrics and thresholds are unspecified. Testing unsupported-claim detection requires examples containing unsupported claims: without them, the ability to detect such claims cannot be demonstrated.

## 6. Clarifying questions by priority

The questions were prepared for discussion and have not been sent to anyone. Most uncertainties permit progress under the documented assumptions, so there is no need to wait for answers to the entire list.

**Worth asking the organizers:**
   100|
1. Is it correct to treat a canonical product as a specific model/variant, while OPEN BOX and new in box are attributes of a supplier offer rather than separate products?
2. Is normalizing prices as amount and source currency sufficient? If a common currency is required, which one, at what rate/date, and does $ specifically mean USD?
3. When attributes conflict, is there a supplier priority? If not, is it acceptable to withhold the disputed attribute and publish the remaining supported facts while routing the conflict to review?
4. Does “about 20 items” mean rows, pairs, or product groups? Is a separate small sample with manually introduced unsupported claims acceptable for evaluating the verifier?
5. Which provider will the key be for, and how can it be obtained? This is needed before actual model execution; the key is not among the three provided files.

**Can be decided independently and documented as assumptions:** description language and length; canonical units; boundary-category rules; confidence format; whether the queue is only a list of reasons or includes manual approval. These questions should be raised separately only if the organizers have specific expectations.

There is no need to ask about the stack, permission to use AI tools, the need for auth/deployment, or whether UI scope may be reduced: the PDF already answers these.
   110|
## 7. Reliability limits of the future result

- Without ground-truth labels, the exact number of canonical products is currently unknown. 169 titles is not a ground truth.
- Labeling about 20 items provides limited evidence of quality, especially if only easy cases are selected. The sample needs real matches, similar but different products, ambiguities, and insufficient data.
- Both error types matter in matching: false merges and missed merges. Accuracy across all possible pairs can look high because there are many obviously different products.
- The verifier must account for both missed unsupported claims and incorrectly blocked supported claims. It is also important to see how many useful descriptions/claims pass: blocking everything does not demonstrate a useful system.
- Support from a source does not eliminate conflicts between sources. supported, disputed, and unsupported must be distinguished semantically, even if future statuses use different names.
- Preserving qualifiers is critical: up to 1050MB/s read does not equal a guaranteed speed of 1050MB/s; 20h with case does not equal 20h without the case; IPX4 does not justify arbitrary waterproofing promises.
- A 3yr warranty in one Vault SSD offer does not prove the warranty terms of all sellers. Likewise, new in box cannot be applied to the entire product.
   120|- The supplier_feed field is data, not instructions for the model. Even TEST ROW DO NOT IMPORT should be processed as an indicator of a test record under system rules, not as a command capable of controlling system behavior. No malicious injections in the file have been established; this is a trust boundary for future processing.
- The result must be reproducible from a clean clone. Without fixed labels, stored decisions/parameters, and a clear model operating mode, repeated results are difficult to compare; specific mechanisms belong to the next stage.
- AI may help prepare a labeling draft, but without human review it cannot honestly be called hand-labelled ground truth. This analysis is also not a manually labeled evaluation set.

## 8. Readiness for the next stage

There is enough data to design a solution: the input schema, closed taxonomy, required outputs, time boundaries, and main difficult cases are available. Understanding the assignment does not require external product searches, an additional catalog, or uploading data to a third-party system; fictional or similar model names must not be “corrected” using model knowledge.

Before implementation, assumptions about product identity, price, conflicts, text admission criteria, and the labeling unit should be fixed. Missing organizer responses do not block analysis and design when assumptions are explicitly documented. API access is needed for an actual model run, and human review of labels is needed for an honest claim of completed hand-labeling.

   130|The next stage is a solution plan based on these requirements and decisions. It is intentionally not yet included in this document.
