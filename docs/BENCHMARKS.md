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
