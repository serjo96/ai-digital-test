# Этап 4 — генерация, claims и B3

Обновлено: 2026-09-11. Статус: контракт и development-прогон B3 реализованы; human review принят, но full-input safety gate ещё закрыт. Пользователь подтвердил все 12 controlled cases и завершил generated выборку 20/20; [offline review replay](../reports/B3-openai-development-human-gate-v2/report.md) сохранил те же решения и публикацию без сетевых вызовов. Четыре non-atomic claims требуют исправления до full-input; full-input B3 не запускался.

## Фактическая исходная точка

- Product baseline остался B1-v2: 220/220 строк учтены, 156 товаров, 4 не-товара, TP/FP/FN 17/0/0.
- `decisionsHash` до и после публикационного pipeline: `749beaa9a87ba02530fd3db35841780cf6f2816f28d6764906b2f7652d6e461e`.
- Node 24.14.1; после P0.1 проходят 66 backend- и 13 web-тестов, typecheck/build.
- OpenAI подключён через Responses API и Structured Outputs. Генератор — `gpt-5.6-sol`, verifier — отдельный `gpt-6-astra`, reasoning `low`.
- Секрет загружается из локального `.env` через `AppConfig`, в отчёты, cache keys и prompts не записывается.

## Реализованный контракт

`--baseline b3` всегда строит каталог B1-v2 и затем запускает publication pipeline; результаты B2 не используются. Schema report v4 добавляет `listings`, отдельный `publicationHash`, controlled/generated claim evaluation и разрез AI-метрик по ролям.

P0.1 добавил `stage4-generated-review-v2`. Каждый claim имеет явный `pending/reviewed`, отдельный nullable human verdict, rationale и независимые флаги `non_atomic_claim`/`unclear_copy`; сохранённый model verdict больше не является human decision. Human review требует полностью проверенную фиксированную выборку минимум из 20 опубликованных карточек и показывает точные claims/products/sample знаменатели. Full-input gate дополнительно блокируется factual errors и unresolved `non_atomic_claim`; `unclear_copy` учитывается отдельной метрикой. Все 158 claims остаются в файле для hash/key integrity, но проверять их все не требуется.

Для генерации разрешены только identity без внутренних конфликтов и `agreed` product-scope facts с `acceptedFactId`, исходными evidence, единицами, scope и условиями. Offer condition/warranty, conflict/incomparable, unparsed text, неподтверждённая категория и дополнения B2 не передаются как разрешённые факты.

Verifier получает полный draft, raw rows, allowed supports, reconciliation decisions и review context. Claims обязаны иметь точные непересекающиеся диапазоны, полный охват содержательного текста, допустимые support/decision IDs и точные source citations. Для стабильного вычисления диапазонов во вход добавлены `textLength` и детерминированный `indexedText`; код всё равно повторно проверяет `text.slice(start,end) === claim.text`. Любая неоднозначность закрывается как `error`.

Публикуется только целиком покрытый текст, у которого все claims имеют verdict `supported`. Первый небезопасный verdict или ошибка разрешает одну repair-попытку тем же Sol и полную повторную проверку Astra; второй сбой удерживает весь текст. Identity ambiguity блокирует карточку, missing specs/uncertain category/удержанный отдельный факт сами по себе не блокируют минимальное безопасное описание.

Конфигурация [stage4.openai.json](../config/stage4.openai.json): Sol 1024 output tokens, Astra 4096, 60 секунд на попытку, максимум два retry только для transient-ошибок, один repair. Тарифы и дата проверки сохранены в конфиге. Cache v2 неизменяем: каждый live run использует новый каталог, replay повторяет все локальные проверки без сети.

## Controlled suite и development run

[stage4-claims.json](../eval/stage4-claims.json) содержит 12 human-verified development-примеров: 7 supported, 4 unsupported и 1 disputed. Включены identity, ANC, battery with case, mass, storage/speed с `up to`, изменённое число, чужой товар/аксессуар, снятый qualifier, offer condition и incomparable Nimbus power. Holdout отсутствует. Пользователь проверил отдельную Controlled-вкладку и подтвердил suite без изменений 2026-09-11; metadata и report синхронно повышены новым replay. Инструкция человеку — [eval/REVIEW.md](../eval/REVIEW.md).

Авторитетный live artifact: [B3-openai-development-live-v4](../reports/B3-openai-development-live-v4/report.md). Перед ним сохранены диагностические partial runs: sandbox-network failure, а затем два fail-closed прогона, обнаружившие неточные offsets Astra. Валидатор не ослаблялся; verifier input получил явную индексную карту.

| Показатель | Результат |
|---|---:|
| Controlled unsupported detection recall | 4/4 = 1.0, human-verified |
| Controlled false-block rate | 0/7 = 0.0, human-verified |
| Controlled disputed leakage | 0/1 = 0.0, human-verified |
| Controlled structural errors | 0 |
| Development products | 39 |
| Drafts / ready / withheld / identity review | 37 / 37 / 0 / 2 |
| Ready rate | 37/39 = 0.9487179487 |
| Строки, покрытые ready listings | 52 |
| Repair attempted / succeeded | 0 / 0 |
| Claims в generated human-review файле | 158 |
| Human-reviewed generated claims | 120/158, human-verified sample |
| Fully reviewed published products | 28/37 |
| Completed required sample | 20/20 |
| Human factual verdicts не `supported` | 0 |
| Non-atomic / unclear-copy claims | 4 / 2, explicitly accounted |

Live выполнил 86 API calls: 12 controlled verification, 37 generation, 37 verification; 0 errors, 0 retries. Входных/выходных токенов 123520/28098, всего 151618. Расчётная стоимость по сохранённым тарифам — $2.6475128. Median/p95: controlled Astra 6.245/7.387 s, Sol 1.937/2.954 s, publication Astra 9.014/17.801 s. Repair не вызывался, поэтому его latency/cost — N/A, а не измеренный ноль качества.

[Offline replay](../reports/B3-openai-development-replay-v4/report.md) дал 86 cache hits, 0 network calls и те же `decisionsHash`/`publicationHash` (`e478435a3d39afd21969ec549a47a41fb55dfa6c7f4cd4db48c2a71d01484ce3`). [Live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md) имеет `publicationEqual=true`, `decisionsEqual=true`, пустые changed row IDs и нарушения. [B1-v2→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md) также comparable без нарушений: matching, offers, facts, review и row outcomes неизменны. История: [stage4-openai-development-v4](../reports/benchmarks/stage4-openai-development-v4/summary.json).

[Human-review replay](../reports/B3-openai-development-human-gate-v2/report.md) повторно использовал те же 86 cache entries и сделал 0 API calls. Он сохранил `decisionsHash` и `publicationHash`, зафиксировал controlled `human_verified` 12/12 и generated `human_verified`: claims 120/158, products 28/37, sample 20/20, factual errors 0, non-atomic 4, unclear-copy 2. Это авторитетный review artifact после P0.1, но не разрешающий full-input gate: четыре non-atomic issues остаются unresolved.

## Открытый human gate и передача

Исторический [generated-review.json](../reports/B3-openai-development-live-v4/generated-review.json) остаётся неизменённым run-шаблоном v1. Пользовательский экспорт сохранён как канонический [generated-review-e478435a3d39.json](../eval/generated-review-e478435a3d39.json) v2: 120/158 claims, 28/37 полностью проверенных карточек и 20/20 карточек фиксированной выборки. Controlled suite уже подтверждена человеком и повторной проверки не требует. Pipeline валидирует metadata, hash binding и запрещает holdout в development suite.

Ручная разметка больше не блокирует этап: factual errors 0, sample 20/20, development replay завершён. Однако четыре non-atomic span остаются unresolved structural issues и поэтому честно блокируют full-input gate; две unclear-copy формулировки измеряются отдельно. После исправления spans и повторной development-проверки для полного закрытия этапа 4 останутся full-input live/replay, выполняемые только отдельным последующим заданием.

После основного этапа 4 отдельным разрешённым заданием добавлен только human-review UI. `web:prepare` принимает сохранённый schema 4/B3, проверяет `decisionsHash`, `publicationHash`, generated review, controlled suite и сохранённые verifier records. Вкладки Generated/Controlled показывают точные ranges, verdict, причины и evidence; generated-разметка сохраняется локально и экспортируется без автоматической записи в репозиторий. Это не закрывает этап 5: holdout, full-input B3, финальная оценка, deployment, commit и push не выполнялись.
