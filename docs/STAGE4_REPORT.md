# Этап 4 — генерация, claims и B3

Обновлено: 2026-09-10. Статус: контракт и development-прогон B3 реализованы; программный controlled gate пройден, live/replay совпадают. Результаты остаются **provisional**, пока человек не проверит controlled suite и 158 claims реально опубликованных development-текстов. Full-input B3 не запускался, этап 5 не изменялся.

## Фактическая исходная точка

- Product baseline остался B1-v2: 220/220 строк учтены, 156 товаров, 4 не-товара, TP/FP/FN 17/0/0.
- `decisionsHash` до и после публикационного pipeline: `749beaa9a87ba02530fd3db35841780cf6f2816f28d6764906b2f7652d6e461e`.
- Node 24.14.1; проходят 63 backend- и 5 web-тестов, typecheck/build.
- OpenAI подключён через Responses API и Structured Outputs. Генератор — `gpt-5.6-sol`, verifier — отдельный `gpt-6-astra`, reasoning `low`.
- Секрет загружается из локального `.env` через `AppConfig`, в отчёты, cache keys и prompts не записывается.

## Реализованный контракт

`--baseline b3` всегда строит каталог B1-v2 и затем запускает publication pipeline; результаты B2 не используются. Schema report v4 добавляет `listings`, отдельный `publicationHash`, controlled/generated claim evaluation и разрез AI-метрик по ролям.

Для генерации разрешены только identity без внутренних конфликтов и `agreed` product-scope facts с `acceptedFactId`, исходными evidence, единицами, scope и условиями. Offer condition/warranty, conflict/incomparable, unparsed text, неподтверждённая категория и дополнения B2 не передаются как разрешённые факты.

Verifier получает полный draft, raw rows, allowed supports, reconciliation decisions и review context. Claims обязаны иметь точные непересекающиеся диапазоны, полный охват содержательного текста, допустимые support/decision IDs и точные source citations. Для стабильного вычисления диапазонов во вход добавлены `textLength` и детерминированный `indexedText`; код всё равно повторно проверяет `text.slice(start,end) === claim.text`. Любая неоднозначность закрывается как `error`.

Публикуется только целиком покрытый текст, у которого все claims имеют verdict `supported`. Первый небезопасный verdict или ошибка разрешает одну repair-попытку тем же Sol и полную повторную проверку Astra; второй сбой удерживает весь текст. Identity ambiguity блокирует карточку, missing specs/uncertain category/удержанный отдельный факт сами по себе не блокируют минимальное безопасное описание.

Конфигурация [stage4.openai.json](../config/stage4.openai.json): Sol 1024 output tokens, Astra 4096, 60 секунд на попытку, максимум два retry только для transient-ошибок, один repair. Тарифы и дата проверки сохранены в конфиге. Cache v2 неизменяем: каждый live run использует новый каталог, replay повторяет все локальные проверки без сети.

## Controlled suite и development run

[stage4-claims.json](../eval/stage4-claims.json) содержит 12 development-примеров: 7 supported, 4 unsupported и 1 disputed. Включены identity, ANC, battery with case, mass, storage/speed с `up to`, изменённое число, чужой товар/аксессуар, снятый qualifier, offer condition и incomparable Nimbus power. Holdout отсутствует. Metadata намеренно provisional; инструкция человеку — [eval/REVIEW.md](../eval/REVIEW.md).

Авторитетный live artifact: [B3-openai-development-live-v4](../reports/B3-openai-development-live-v4/report.md). Перед ним сохранены диагностические partial runs: sandbox-network failure, а затем два fail-closed прогона, обнаружившие неточные offsets Astra. Валидатор не ослаблялся; verifier input получил явную индексную карту.

| Показатель | Результат |
|---|---:|
| Controlled unsupported detection recall | 4/4 = 1.0, provisional |
| Controlled false-block rate | 0/7 = 0.0, provisional |
| Controlled disputed leakage | 0/1 = 0.0, provisional |
| Controlled structural errors | 0 |
| Development products | 39 |
| Drafts / ready / withheld / identity review | 37 / 37 / 0 / 2 |
| Ready rate | 37/39 = 0.9487179487 |
| Строки, покрытые ready listings | 52 |
| Repair attempted / succeeded | 0 / 0 |
| Claims в generated human-review файле | 158 |
| Human-reviewed published-claim errors | N/A: 0 проверено |

Live выполнил 86 API calls: 12 controlled verification, 37 generation, 37 verification; 0 errors, 0 retries. Входных/выходных токенов 123520/28098, всего 151618. Расчётная стоимость по сохранённым тарифам — $2.6475128. Median/p95: controlled Astra 6.245/7.387 s, Sol 1.937/2.954 s, publication Astra 9.014/17.801 s. Repair не вызывался, поэтому его latency/cost — N/A, а не измеренный ноль качества.

[Offline replay](../reports/B3-openai-development-replay-v4/report.md) дал 86 cache hits, 0 network calls и те же `decisionsHash`/`publicationHash` (`e478435a3d39afd21969ec549a47a41fb55dfa6c7f4cd4db48c2a71d01484ce3`). [Live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md) имеет `publicationEqual=true`, `decisionsEqual=true`, пустые changed row IDs и нарушения. [B1-v2→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md) также comparable без нарушений: matching, offers, facts, review и row outcomes неизменны. История: [stage4-openai-development-v4](../reports/benchmarks/stage4-openai-development-v4/summary.json).

## Открытый human gate и передача

Файл [generated-review.json](../reports/B3-openai-development-live-v4/generated-review.json) привязан к `publicationHash` и содержит 158 фактически опубликованных claims. Человек должен проверить каждый claim по `result.json`, заполнить непустой `rationale`, затем выставить `status: human_verified`, `reviewedBy` и ISO `reviewedAt`. Те же поля должны быть честно заполнены в controlled suite. Pipeline валидирует metadata, hash binding и запрещает holdout в development suite.

До этого full-input B3 заблокирован. После человеческой проверки gate требует: ни одного пропущенного unsupported/disputed claim, хотя бы один допущенный supported claim, нулевые ошибки среди проверенных published claims и совпадение feed/taxonomy/labels/config/checks/publication hashes. Только отдельное последующее задание может выполнить full-input live и replay.

Этап 5 не реализовывался: `web:prepare` по-прежнему обязан отклонять B3. UI, holdout, финальная оценка, deployment, commit и push не выполнялись.
