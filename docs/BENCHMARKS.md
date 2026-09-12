# История качества и скорости

На этапе 2 история уже сохраняется в репозитории. Текущий снимок: [stage2-v2](../reports/benchmarks/stage2-v2/summary.json), 8 запусков и 483 наблюдения. Основной файл для будущих графиков — [observations.jsonl](../reports/benchmarks/stage2-v2/observations.jsonl): одна JSON-строка на один показатель одного запуска. JSONL позволяет читать историю последовательно, загружать в Python/pandas, JavaScript или аналитическую БД без изменения pipeline.

Каждый новый успешный `pipeline`/`eval` автоматически сохраняет `metrics.json` и те же значения в `report.json`, вместе с решениями. Это первичные результаты; экспорт истории не обязателен для их сохранности. Каталоги запусков и экспорта нельзя перезаписать: нужен новый run ID. `reports/local/` игнорируется Git; для сохраняемого бенчмарка указывать `--out reports`.

## Что означает качество

| Запрос | Показатели | Знаменатель и ограничения |
|---|---|---|
| Качество отбора совпадений | `matching.precision`, `matching.recall`, `matching.true_positive`, `matching.false_merge`, `matching.missed_pair` | Precision = TP/(TP+FP); recall = TP/(TP+FN). Только development, unknown исключены |
| Качество отрицательной выборки | `matching.negative_specificity`, `matching.hard_negative_specificity`, `matching.hard_negative_false_merges` | Верно разделённые / известные разные пары. Hard negative — разные товары внутри одного размеченного случая, без не-товаров; это приближение сложности, не отдельная ручная разметка трудности |
| Мусорные строки и ошибочные отказы | `non_product.precision`, `non_product.recall`, `non_product.false_rejection`, `non_product.missed_trash`, `non_product.valid_product_retention` | Положительный класс здесь — не-товар. False rejection — товар ошибочно отвергнут; missed trash — мусор оставлен товаром. Отдельно число всех отвергнутых строк |
| Поиск кандидатов | `matching.candidate_recall` | Найденные известные положительные пары / все положительные пары, до решения merge/reject/review |
| Очередь review | `review.items`, `review.rows`, `review.products`, `review.row_rate`, `review.product_rate` | Сообщения; уникальные затронутые строки / все входные; уникальные товары / все товары. Числа не взаимозаменяемы |
| Причины review | `review.identity_items`, `review.category_items`, `review.extraction_items`, `review.missing_specs_items`, `review.conflict_items`, `review.incomparable_items`; `review.reason.*` | Первые показатели имеют стабильные имена, включая нули. Детальная серия причины появляется только когда причина встретилась; отсутствие такой серии нельзя автоматически считать измеренным нулём |
| Качество категории и фактов | `categories.check_accuracy`, `facts.check_accuracy`, `reconciliation.check_accuracy` | Верно выполненные / все заданные проверки отдельной provisional development-выборки. Это не precision всех извлечённых фактов |
| Диагностика фактов | `facts.extracted`, `facts.accepted_attributes`, `facts.conflicts`, `facts.incomparable`, `facts.unparsed_fragments` | Все входные данные. Принятый атрибут — результат согласования, а не разрешённое к публикации утверждение |
| Ошибки | `errors.matching`, `errors.non_product`, `errors.quality_checks`, `errors.execution`; потери и двойные назначения в `accounting.*` | Ошибки разных задач считаются отдельно: их нельзя суммировать в «процент ошибок» с общим знаменателем |
| Скорость | `timing.wall`, `timing.pipeline` | Миллисекунды, каждый запуск отдельным наблюдением; границы ниже |

«Мусорные решения» здесь операционализированы как ложные объединения, ошибочные отказы товаров и пропущенные не-товары. Качество сгенерированных утверждений/verifier пока N/A: генерации нет. Большое число корректных отрицательных пар не заменяет precision/recall matching.

## Формат и сопоставимость

Каждое наблюдение содержит `benchmarkSchema`, `runId`, `createdAt`, `status`, `rules`, `schema`, `hashes`, `code`, `cohort`, `metricCohort`, `name`, `value`, `numerator`, `denominator`, `unit`, `scope`, `qualityStatus`, `availability`. Для старых/неуспешных запусков недоступные метаданные отсутствуют или равны null.

- `unit`: count, ratio или ms. Доли хранятся в диапазоне 0–1, а не 0–100; изменение 0.5882 означает примерно +58.82 процентного пункта.
- `scope`: development, full_input или run. Не строить одну линию из разных scopes.
- `qualityStatus`: provisional, human_verified, not_evaluated или not_applicable. Диагностические counts не являются оценкой качества.
- `availability`: measured, not_implemented, no_denominator. В двух последних случаях `value = null`. Не превращать null в 0; не соединять отсутствующие измерения как реальные точки.
- `cohort` фиксирует feed, taxonomy, matching labels, split и протокол metrics-v1. `metricCohort` дополнительно учитывает хэш stage2-checks для качества категорий/фактов/согласования. Сравнивать качество только в одной metricCohort и с одним статусом разметки.
- Изменение правил/конфигурации/кода является предметом эксперимента и не меняет выборку. Использовать `rules`, `hashes.config`, `code.implementationHash`, commit/dirty для объяснения изменений. Смена определения метрики требует новой версии протокола и явного адаптера, а не пересчёта истории под прежним именем.

Для отчётов schema 2 экспорт переносит сохранённые метрики без пересчёта. Для исторического B0 schema 1 адаптер восстанавливает только доступные показатели по сохранённым решениям и исходным labels с проверенным SHA-256. Иной файл labels отклоняется. Полноценного review у B0 не было: его прежний `audit.reviewRows = 0` означал лишь строки без заголовка; в истории новая метрика review у B0 — N/A.

`summary.json` — перечень включённых запусков и число наблюдений. Экспортируется явно выбранный набор, а не все когда-либо выполненные попытки. Чтобы учитывать сбои, включать каталоги с `failure.json`: у них будут `errors.execution = 1` и время до ошибки, без вымышленных quality scores. Контрольные сбои тестов не включены в текущий бенчмарк успешных прогонов.

## Команды

```sh
npm run pipeline -- --baseline b1 --out reports --run-id B1-next
npm run eval -- --baseline b1 --out reports --run-id B1-next-repeat
npm run compare -- --before reports/B1-v2 --after reports/B1-next --out reports/comparisons --run-id B1-next
npm run benchmark -- --runs reports/B0,reports/B1-v2,reports/B1-next --out reports/benchmarks --run-id history-next
```

Пример загрузки для будущего графика без сторонних библиотек:

```js
import { readFileSync } from 'node:fs';
const rows = readFileSync('reports/benchmarks/stage2-v2/observations.jsonl', 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));
const series = rows.filter(x => x.name === 'matching.recall' && x.value !== null);
// Группировать по metricCohort и qualityStatus, сортировать по createdAt.
// X: createdAt/runId, Y: value; numerator/denominator показывать рядом.
```

## Протокол времени

`timing.wall` / `wallTimeMs`: от входа в CLI до записи result/diagnostics, включая Nest bootstrap, чтение/валидацию, получение версии кода, pipeline и eval. Не включает компиляцию, импорты до входа в main, сериализацию metrics/report и закрытие контекста. Это сохранённая граница этапа 1 (`cli-through-result-v1`).

`timing.pipeline`: только baseline либо извлечение/matching/согласование/review с внутренними инвариантами; без чтения файлов и eval. У старого B0 этого замера нет. Новый контроль B0-stage2-control позволяет видеть затраты простого baseline в текущем приложении.

В новых отчётах записаны Node/platform/arch; у исторического B0 этих полей нет. Повторы подтверждают воспроизводимость решений, но двух запусков недостаточно для статистического заявления об ускорении. B1 выполняет больше работы и сейчас медленнее B0. Для дальнейшего speed benchmark фиксировать окружение, режим, входы и warmup; сохранять все повторы, а не только лучший.

## Расширение этапа 3: офлайн-интеграция

Принятым baseline остаётся B1-v2. История [stage3-offline](../reports/benchmarks/stage3-offline/summary.json) добавляет **кодовые** контрольные прогоны; B2-live пока отсутствует по инструкции пользователя. Не интерпретировать слово stage3 или schema 3 как свидетельство вызова модели.

Schema 3 сохраняет метрики без пересчёта, как schema 2, и добавляет `mode` (code-only/live/replay/test), статус partial, конфигурацию роли/провайдера, API usage и `semanticChecks`. Режим и конфигурация переносятся в каждое наблюдение JSONL. `test`-прогоны не допускаются в реальную историю. Partial-прогон сохраняет результаты и диагностические/оценочные метрики с явным status=partial и `errors.execution=1`; его нельзя принять как успешный. Полный failure без результата по-прежнему имеет только доступную диагностику.

Новая выборка `eval/stage3-checks.json`: 12 provisional development-строк, 11 ожидаемых семантических дополнений, проверки типа и категории. Изначальные matching labels и stage2-checks не изменяются. `semantic.precision` = корректные принятые дополнения / все принятые дополнения на этих строках; `semantic.recall` = корректные / 11 ожидаемых дополнений. Повторы одного значения схлопываются по атрибуту/значению/единице/scope/условиям. Это узкая оценка пяти разрешённых атрибутов, не precision всей информации о товарах. Ошибки невалидного ответа дополнительно видны в ai.failed_jobs/ai.json; отброшенный ответ не превращается в корректное извлечение.

`semantic.types` и `semantic.categories` проверяют ожидаемый тип, включая null, и допустимую категорию. B1-control: precision N/A (0/0), recall 0/11, типы/категории 12/12. Это заранее измеренный пробел кодового извлечения; реальный B2 ещё не оценён. Искусственная фикстура в тесте, реализующая ожидаемые 11 дополнений, проверяет eval и проводку pipeline, а не доказывает качество Sol.

Семантические серии имеют `metricCohort`, дополнительно включающий хэш semanticChecks. Новые значения без предыдущего измерения дают delta=null. Существующие метрики и определения metrics-v1 не переименованы; для новых денежных показателей добавлена единица USD и availability=unavailable при недостающих usage/тарифе. Не соединять несопоставимые series и не превращать неизвестную стоимость в 0.

`api.calls` — реальные попытки обращения к провайдеру, включая повторы; локальная ошибка конфигурации/ключа до вызова не увеличивает calls. `api.errors` — ошибки таких live-попыток, включая невалидный результат, но не промахи replay-кэша. `ai.failed_jobs` считает неуспешные задания, в том числе cache/config ошибки. `api.tokens`, input/output tokens и cost относятся к текущему live-прогону, replay показывает 0 новых затрат и cache_hits. Исходные usage и ответы остаются в ai.json/кэше; usage неизвестного failed-request не восстанавливается вымышленными числами. Тариф учитывает cache read и cache write отдельно.

Граница `timing.wall` сохраняется: вход в CLI → запись результатов/диагностики (для B2 также ai.json), без компиляции, ранних imports и сериализации report/metrics. `timing.pipeline` включает ожидание AI и retry/replay для B2. Тайминги code-only/live/replay показывать отдельно. Сравнение Sol/Astra выполняется с `--ai-task matching --ai-cohort development` на фиксированных review-парах B1, отдельно от extraction; текущие пары unknown и не дают подтверждённой оценки правильности рекомендаций.


## Этап 5: кодовый контроль и экран

[stage5-offline](../reports/benchmarks/stage5-offline/summary.json) расширяет stage3-offline двумя прогонами: **14 запусков, 963 наблюдения**. [JSONL](../reports/benchmarks/stage5-offline/observations.jsonl) сохраняет прежние определения метрик, scopes и provisional-статус.

[Контроль](../reports/B1-stage5-control/report.md) / [повтор](../reports/B1-stage5-repeat/report.md): решения B1-v2 идентичны; все сравнимые нетайминговые значения неизменны. Учёт 220/220, товары 156, не-товары 4, TP/FP/FN 17/0/0; review 64 сообщения, 64 строки, 51 товар. Wall 81.957 / 80.121 ms; pipeline 37.224 / 38.409 ms на Node 24.14.1, darwin arm64. Это одиночные наблюдения, не доказательство ускорения. API calls/tokens/USD: 0/0/0; генерация/verifier N/A, holdout не оценивался.

Сравнения: [B1-v2 → этап 5](../reports/comparisons/B1-v2-to-stage5/comparison.md), [этап 3 → этап 5](../reports/comparisons/stage3-to-stage5/comparison.md), [повтор](../reports/comparisons/stage5-repeat/comparison.md). Браузерный просмотр JSON не является модельным replay. Прогоны чистого окружения служат проверкой воспроизводимости и вынесены в `reports/ui/stage5/clean-environment.json`, не добавлены как новые эксперименты качества.

## Этап 3: локальный Ollama, протокол v1 (2026-09-10)

Экспериментальный development baseline: `qwen3:4b` и `gemma4:12b`, Ollama 0.9.6, endpoint `http://127.0.0.1:11434`. Названия и полные digest проверяются через /api/version и /api/tags; metadata-запросы не являются inference и не входят в api.calls. Сервер и модели не устанавливаются и не обновляются. OpenAI не вызывается.

До inference `manifest.json` фиксирует версию кода, хэши исходников/labels/checks, точные requests и отдельные prompt/schema/parameters/input hashes, профили и порядок. Extraction использует прежние semantic_extraction_v1 и evidence-правила. Первоначальная ambiguous_matching_v2 добавила confidence high/medium/low и reason, но сервер 0.9.6 отклонил tuple-prefixItems. В отдельной версии эксперимента применена эквивалентная ambiguous_matching_v3 (массив ровно из двух строк). Промпт, параметры, пары и labels сохранены. В v3 выполнялся Qwen; Gemma не загружалась, её matching не запускался. Confidence не является вероятностью.

Порядок: smoke Quill row_11462769c5 (1 запрос, maxRetries=0), затем 12 строк в порядке cases из stage3-checks.json (11 ожидаемых дополнений), затем те же 12 второй модели при технической стабильности первой; 8 shadow-пар отдельно. Техническая стабильность: каждое задание достигло конечного состояния, сервер доступен, транспортные retries не исчерпаны, таймаутов нет. Ошибки качества сами по себе не исключают вторую модель. Smoke не входит в знаменатели development. Ошибка смысла smoke при работающих JSON/schema сохраняется как измеренный отказ; несовместимость транспорта/схемы требует новой версии эксперимента после исправления интеграции.

Shadow-пары: 2 сохранённых unknown AeroBuds; положительные English AeroBuds и Onyx Lite; отрицательные ear tips против каждой из 3 строк AeroBuds, Cobalt lamp против Cobalt mouse. Labels передаются только evaluator. Опасный merge — известный negative или deterministic hard conflict; unknown merge — неподтверждённая рекомендация, не TP/FP. Рекомендации не меняют решения, группы или product confidence, в том числе при reject/unknown. Их review измеряется отдельно от продуктовой очереди B1.

Все локальные запросы последовательны, temperature=0, seed=42, context=8192, maxOutputTokens=2048, topK=20, topP=0.9, repeatPenalty=1, keepAlive=5m. Qwen think=false; Gemma не получает think. 120 секунд на попытку, максимум один retry transport/429/5xx. JSON/schema/evidence не исправляются повторной генерацией.

Каждый уровень диагностики (transport, completion, JSON, schema, citations, semantic) содержит checked/passed/failed и unchecked. Остановка на предыдущем уровне не означает успех следующих. Цитата с верным текстом может не подтверждать атрибут: false citation (несуществующий/чужой/неоднозначный источник) и unsupported semantic addition разделены. Отказ одной части extraction удерживает весь ответ; отдельное корректное предложение может присутствовать в proposed и отсутствовать в accepted.

`experiment-metrics.json` сохраняет успешные/неуспешные задания; proposed и accepted correct/unexpected/missing; malformed/duplicate/rejected additions; ошибочные citations и причины смысловых отказов (включая scope/условия); unknowns; сообщения/уникальные строки review; опасные и неподтверждённые merge. Proposed сравнивается по attribute/value/unit/scope/conditions, поэтому само совпадение с ожидаемым значением не доказывает evidence. Accepted оценивается общим evaluateSemantic; holdout не оценивается.

Latency каждого live-задания включает ожидание и холодную загрузку; median — нижняя порядковая медиана (nearest rank p=0.5), p95 — nearest rank p=0.95. В ai.json отдельно остаются elapsed каждой попытки; load/prompt/generation из Ollama переводятся из ns в ms. Итоговая wall не уменьшается на load. Smoke прогревает Qwen; первая загрузка Gemma может входить в её development-задержку — это один наблюдаемый локальный сценарий, не универсальный рейтинг моделей. В replay per-attempt latency взята из live, а wall/replay и новые calls измерены отдельно. Отсутствующий load/usage/cache breakdown и стоимость локального вычисления — N/A. Стоимость сессии Codex не относится к pipeline.

Cache-v2 хранит response и raw до validation, полный request, origin, хэши response/attempts и каждую попытку отдельным файлом. Endpoint, model digest/serverVersion и весь request входят в ключ. Секреты/заголовки не пишутся. Cache-v1 читается по историческому ключу. Replay не вызывает generate или discovery, повторяет validation, сохраняет отказы, сравнивает quality и решения с live; тестовый транспорт в replay явно запрещает сеть. Искусственный origin=test не допускается в benchmark/export. Исторические schema 1/2/3 и JSONL не переписываются.

Строгий допуск full: 12/12 ответов проходят schema/evidence, 11/11 дополнений без лишних и ложных citations, 8/8 shadow проходят validation, опасных merge 0, B1/accounting/group checks сохранены, replay идентичен. При двух прошедших — меньшая extraction median, затем p95, затем Qwen. Иначе full не запускается. Full обрабатывает 220 строк кодом и 41 проблемную строку AI; matching остаётся shadow. Product baseline автоматически не повышается. Генерация, финальный verifier и holdout-оценка не входят в этот протокол.

Артефакты и результаты: [отчёт этапа 3](STAGE3_REPORT.md), `reports/stage3-ollama-v1`. Каталоги live/replay/smoke/development/shadow раздельны; JSON/Markdown-сравнение и два вида benchmark JSONL сохраняют конкретное происхождение.

Итог: [stage3-ollama-v2/comparison.md](../reports/stage3-ollama-v2/comparison.md). Общий JSONL исходных метрик — benchmark/observations.jsonl; availability и дополнительные счётчики неверных scope/conditions/unit/value type/wrong pair IDs — [stage3-ollama-final-verification/observations.jsonl](../reports/stage3-ollama-final-verification/observations.jsonl). Последняя сводка — read-only анализ тех же raw-ответов, не новый live и не изменение acceptance. В ней modelQualityAvailable=false и proposedQuality=null при отсутствии модельного ответа; отсутствующие поколения Gemma не выдаются за «0 ошибок качества». Исторический comparison v1 оставлен как промежуточный интеграционный результат; актуальный статус архитектуры задают v2 и финальная raw-replay проверка.

После обновления локального сервера до 0.34.0 Gemma прошла отдельный технический retry с новой идентичностью запуска: [comparison](../reports/stage3-ollama-gemma4-v034-thinkoff/comparison.md), [raw benchmark JSONL](../reports/stage3-ollama-gemma4-v034-thinkoff/experiment-benchmark.jsonl) и [replay comparison](../reports/stage3-ollama-gemma4-v034-thinkoff/ollama-gemma4-12b-development-replay-comparison.json). Ответы модели были сохранены и повторно провалидированы без сети; результат не объединяется с историческим benchmark и не является доказательством product quality.

## Этап 4: OpenAI B3 development (2026-09-10)

[История stage4-openai-development-v4](../reports/benchmarks/stage4-openai-development-v4/summary.json) содержит B1-v2, авторитетный B3 live и его offline replay: 3 запуска, 280 observations. Schema 4 добавляет `publicationHash`, publication/verifier/generated-review метрики и разрез usage/latency/cost по ролям. N/A не заменяется нулём: generated human review имеет 0 проверенных claims и error rate N/A; repair latency/quality также не измерены, поскольку repair не вызывался.

Live: 39 development products, 37 drafts/ready, 0 withheld, 2 identity review, ready rate 37/39, покрыты 52 строки. Controlled provisional: unsupported detection 4/4, false block 0/7, disputed leakage 0/1, structural errors 0. API: 86 calls, 0 errors/retries, 151618 tokens, $2.6475128. Разрез: controlled Astra 12 calls, Sol generation 37, Astra publication verification 37. Wall 519931.2525 ms — один последовательный замер, не заявление об общей производительности.

[B1-v2→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md) comparable, `decisionsEqual=true`, changed row/matching IDs пусты, TP/FP/FN и все B1 outcomes/facts/offers/review неизменны. [Live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md) дополнительно имеет `publicationEqual=true`; replay выполнил 86 cache hits, 0 calls, wall 199.929042 ms. Controlled suite и 158 generated claims пока не human-verified, поэтому эти результаты не разрешают full-input B3 или holdout.

Историческое ограничение выше снято P0.1/P0.2: development gate human-verified и воспроизводим. Full-input B3 выполнен 2026-09-12: 154/156 ready, 2 identity review, 0 withheld, 213 покрытых строк, 390 claims без запрещённых atomicity-паттернов. Live: 322 calls, 526449 tokens, $8.110955; один невалидный первый verifier response fail-closed отклонён и успешно восстановлен единственным repair. [Offline replay](../reports/B3-openai-full-input-atomic-v2-replay/report.md) имеет те же `decisionsHash`/`publicationHash`, а [сравнение](../reports/comparisons/B3-openai-full-input-atomic-v2-live-to-replay/comparison.md) не содержит изменений или нарушений.

P0.3 добавил явный split и один раз раскрыл holdout через offline full-input replay. [Holdout report](../reports/B3-openai-full-input-atomic-v2-holdout-replay/report.md): 6 cases / 49 rows; TP/FP/FN 22/0/0; precision, recall и candidate recall 22/22; true negatives 1154/1154; hard-negative specificity 256/256; non-product correctness 49/49; unknown/unevaluated pairs 0/0. Runtime: 0 API calls, 0 tokens, $0, 321 успешный cache hit. Статус качества `provisional`, потому что matching labels ещё не human-verified. [Сводный benchmark](../reports/benchmarks/stage5-b3-full-input-and-holdout-provisional/summary.json) хранит development/full-input и holdout серии. После раскрытия запрещено называть настройку по этим случаям независимым holdout.
