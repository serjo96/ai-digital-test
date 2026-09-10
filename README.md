# Shelf Ready — этап 5: экран B1 и промежуточная передача

Локальный pipeline: JSON → валидация → предложения → явные факты и evidence → кандидаты и совместимые товары → категории, согласование и review → development eval и сохранённые метрики. Текущие правила **B1-v2**. B0 сохранён как отдельный режим. B2 поддерживает OpenAI и экспериментальную локальную Ollama через общий контракт. Реальные development-прогоны Ollama и ограничения качества описаны в docs/STAGE3_REPORT.md. Генерация и verifier остаются этапу 4. Минимальный экран просмотра результатов добавлен в `web/` (сохранённый снимок B1 по умолчанию).

Стек: TypeScript 5.9, NestJS 12 standalone context, Node 24.14.1, npm; UI — Vite + React в `web/`. HTTP API, БД и deployment не нужны.

## Установка и запуск

С Node из `.nvmrc`:

```sh
npm ci
npm run typecheck
npm test
npm run pipeline
npm run eval
```

### Экран результатов

Отдельное Vite-приложение в [`web/`](web/) читает подготовленный результат pipeline и показывает источник запуска. Демоданные не подставляются. API-ключ не нужен.

```sh
npm --prefix web ci
npm run web:prepare -- --run-dir reports/B1-stage5-control
npm run web
```

Сборка: `npm run web:build`. [Полная инструкция и URL override](web/README.md). Пока нет generation/listing, текст недоступен с причиной `generation_not_run`. Согласованные факты не являются разрешением публикации.

`pipeline` и `eval` выполняют одинаковый полный pipeline с development-оценкой. По умолчанию выбран B1; каждый запуск создаёт новый каталог в игнорируемом `reports/local/`. Чтобы результаты оставались частью репозитория для будущих графиков, использовать `--out reports`:

```sh
npm run pipeline -- --baseline b1 --out reports --run-id my-b1
npm run eval -- --baseline b1 --out reports --run-id my-b1-repeat
npm run pipeline -- --baseline b0 --out reports --run-id my-b0-control
npm run compare -- --before reports/B0 --after reports/my-b1 --out reports/comparisons --run-id my-b1
npm run benchmark -- --runs reports/B0,reports/my-b1,reports/my-b1-repeat --out reports/benchmarks --run-id my-history
```

Существующие run ID и каталоги сравнения/экспорта не перезаписываются. Коммиты и push команды не выполняют.

Пути задаются `--feed`, `--taxonomy`, `--labels`, `--checks`, `--out`. CLI имеет приоритет над значениями из `.env` / `FEED_PATH`, `TAXONOMY_PATH`, `LABELS_PATH`, `REPORTS_DIR`, затем стандартными файлами. Для `--checks` переменной окружения нет; по умолчанию `eval/stage2-checks.json`. Пример переменных — `.env.example`; файлы `.env` и `.env.{NODE_ENV}` читаются при старте, секреты в Git не входят. Для B0/B1 API-ключ не нужен.

Development-проверки привязаны к хэшу конкретного feed и строкам development labels. Для другого feed передавать соответствующие labels/checks, а не применять готовые метки к новым данным. B0 не использует stage2-checks. Holdout не оценивается; команды оценки holdout пока нет.


## Решения и контракты

Входные исходники не изменяются. Валидация проверяет типы, уникальность row_id и supplier/SKU, stock и ровно 12 категорий. Не-товары определяются по содержимому, а не stock или row_id. Каждая строка имеет ровно один исход; оригиналы, включая дополнительные поля, сохраняются в `rows[].source`.

B0 группирует по trim + whitespace + lowercase заголовка и воспроизводит прежний хэш решений. B1 выдаёт общую проекцию `rows/groups`, а также:

- `products`: состав, признаки идентичности, категория, отдельные confidence для идентичности и категории, согласованные атрибуты и ссылки на review.
- `offers`: отдельное предложение для каждой строки, включая отвергнутые (`productId = null`); supplier/SKU, точная цена, stock, состояние и ссылки на факты предложения.
- `facts`: атрибут, значение, единица, product/offer scope, условия, точная цитата с row_id/полем/смещениями, правило преобразования и интервал округления массы.
- `candidates`: рассмотренные пары и merge/reject/review с причинами. Отсутствие пары означает, что поиск кандидатов её не предложил.
- `unparsed`: непонятые или частично понятые фрагменты specs целиком. `review`: сообщения с row_ids/product_ids, причинами, evidence и fact_ids.

ID строятся детерминированно; перестановка строк не меняет результат. Review — дополнительная очередь: товарная строка может оставаться grouped и одновременно требовать review. `rows[].outcome = review` сохраняется для отдельного случая отсутствующего заголовка.

### Правила B1

Ограниченный словарь узнаёт явные типы и формы development-данных: Laptop/Notebook, WH-880N/WH880N, TKL/tenkeyless, black/schwarz и т.д. Кандидат ищется по содержательному остатку модели без известных маркеров варианта либо точному заголовку. Объединение требует совпадения полной модели/типа и совместимых известных вариантов; сходство не даёт разрешение на merge. Проверяются все поперечные пары групп, поэтому неизвестный вариант не соединяет несовместимые концы A–B–C.

Различия Pro/Lite/Plus/X, поколения, ёмкости/RAM, цвета, переключателей, комплектации и явно указанных в заголовке мощности/числа портов сохраняются. Пропуск различающего значения ведёт к review. Первое слово не считается брендом; явно поддержана форма Sony/Sony Corp., остальное остаётся неизвестным. OPEN BOX/new in box относятся к предложению.

Поддержано ограниченное извлечение массы, длительности, экрана, памяти, мощности, скорости, интерфейсов, IP/ATM, характеристик камеры, клавиатуры и явных функций. Сохранены read/unspecified direction, up_to, with_case, charging_case, PD passthrough, compatible_device и maximum. Например, USB-C Ladecase относится к зарядному кейсу. Неподдержанные ограничители и указания совместимости не превращаются в безусловные факты. Это не универсальный многоязычный parser и не смысловой verifier.

Масса нормализуется в граммы: kg=1000g, oz=28.349523125g, lb=453.59237g. Допуск равен половине последнего десятичного разряда исходного числа после пересчёта. Согласование требует общего пересечения всех интервалов. Представителем служит наблюдение с самым широким интервалом, при равенстве — по row_id/ID факта; это правило выбора отображаемого значения, не приоритет поставщика. Nimbus 1.2kg/42oz и LedgerLite 1.3kg/2.9lbs согласуются. Время переводится в часы; GB/TB не конвертируются друг в друга без политики единиц. Для других полей универсального допуска нет.

Факты группируются по атрибуту: одинаковые значения/условия согласуются; разные значения при одинаковых условиях удерживаются как conflict; разные единицы/условия — incomparable. Это консервативная политика: при нескольких контекстах удерживается весь атрибут. Пропуск значения не конфликт. Голосования, усреднения, внешних сведений и автоматического выбора поставщика нет.

Категории — закрытая taxonomy. Аксессуары распознаются раньше основных устройств; ear tips/cases/sleeves → other, обычная mouse → other, gaming mouse/keyboard → gaming_accessories, USB-C hub → chargers_cables. Неизвестный тип → other с review. Confidence high/medium/low — объяснимый сигнал решения, не вероятность.

Суммы цен сохраняются десятичными строками с исходной валютой; `$` означает USD по явному допущению. FX, исправления подозрительных цен и суммирование stock отсутствуют. Ошибки цены у уже отвергнутых не-товаров остаются диагностикой и не создают ненужную ручную очередь.

## Метрики и история

Подробные определения, знаменатели, формат JSONL и протокол скорости: [BENCHMARKS.md](docs/BENCHMARKS.md).

Успешный запуск содержит `result.json`, `diagnostics.json`, `metrics.json`, `report.md`, `report.json`. Последний записывается как маркер успешного выполнения. Невалидный вход создаёт `failure.json`, возвращает exit code 1 и не создаёт успешного отчёта; при ошибке записи могут остаться частичные файлы. Успех выполнения не означает качество ground truth или готовность публикации.

Matching labels: 20 provisional случаев, 14 development на 59 строках / 6 holdout на 49. Unknown-пары исключаются; присоединение неразмеченных строк отмечается unevaluated; межслучайные ложные объединения учитываются. `eval/stage2-checks.json` отдельно фиксирует 18 проверок категорий, 30 фактов/отсутствия фактов и 4 согласования. Это целевые проверки, не исчерпывающая оценка всех 545 фактов. Человеческая проверка обоих наборов открыта. Исходный `eval/REVIEW.md` сохранён как исторический пакет; поправка про schwarz описана в отчёте этапа 2.

`compare` читает schema 1, 2 и 3, проверяет целостность решений и совпадение feed/taxonomy/labels/split. Неизвестная схема отклоняется. Разные входы/метки → несопоставимость, дельты N/A и exit code 1. Рост известных FP, нарушение учёта или провал quality checks также дают ненулевой код; сравнение сохраняется. Полная смена структуры строки и изменение состава matching-группы показываются отдельно. Для исторического B0 полноценный review — N/A, а не прежний ноль другого показателя. Новые категории/факты сравниваются только с тем же хэшем checks.

Текущие артефакты:

- [Принятый B1-v2](reports/B1-v2/report.md), [повтор](reports/B1-v2-repeat/report.md), [B0 → B1-v2](reports/comparisons/B0-to-B1-v2/comparison.md).
- [Данные для графиков: 8 запусков](reports/benchmarks/stage2-v2/observations.jsonl), [перечень запусков](reports/benchmarks/stage2-v2/summary.json).
- [Итог и передача этапа 2](docs/STAGE2_REPORT.md); [roadmap](docs/ROADMAP.md).

Сохранённые B0, B0-repeat, промежуточный B1 и первый benchmark не переписывались. Файлы результатов сохраняются локально и предназначены для Git; автоматической отправки куда-либо нет. Для этапа 3 разрешён отдельный локальный эксперимент Ollama; OpenAI ожидает сообщения пользователя о добавлении ключа. См. [отчёт этапа 3](docs/STAGE3_REPORT.md) и [роли моделей](LLM_ROLES.md).


## B2: провайдеры и локальный эксперимент

Принятый product baseline — **B1-v2**. Ollama — экспериментальный development baseline. OpenAI не вызывается до явного сообщения пользователя о добавлении ключа. Генерация и verifier не реализованы.

`AiProvider` и Nest DI объединяют `OpenAiAdapter` (Responses API) и `OllamaAdapter` (native `/api/chat`, встроенный fetch, `stream:false`, общий JSON Schema в `format`). Предметный pipeline не импортирует провайдеры. Extraction/evidence, retries, cache/replay и метрики общие. Matching schema v3 сохраняет decision, confidence high/medium/low, reason и evidence только в `ai.json`; рекомендации не изменяют deterministic decisions, группы или confidence товаров.

Локальные профили: `config/ai.ollama-qwen3-4b.json` и `config/ai.ollama-gemma4-12b.json`. Имена моделей проверены через Ollama; вторая модель — **gemma4:12b**. Endpoint — `http://127.0.0.1:11434`. Параметры: temperature=0, seed=42, context=8192, maxOutputTokens=2048, topK=20, topP=0.9, repeatPenalty=1, keepAlive=5m; Qwen thinking=false. После обновления сервера до 0.34.0 технический повтор Gemma использует отдельно зафиксированный профиль `config/ai.ollama-gemma4-12b-v034-thinkoff.json` с `thinking:false`; это новый эксперимент, не переписывающий прежний. Один запрос одновременно; 120 секунд на попытку, максимум один транспортный retry. Ошибки JSON/schema/evidence не вызывают повторную генерацию.

Для нового, **явно разрешённого** локального эксперимента:

```sh
npm run build
node dist/src/ollama-experiment.js reports/my-new-ollama-experiment
```

Команда проверяет B1, сервер и digest, фиксирует manifest до inference, выполняет smoke Quill (1 запрос, без retries), затем 12 строк непосредственно из `eval/stage3-checks.json` на Qwen и, при технической стабильности, Gemma. Ошибка смысла при корректном транспорте/схеме измеряется как ошибка качества. Восемь фиксированных shadow-пар оцениваются отдельно. После каждой серии выполняется replay с запрещённым сетевым транспортом. Промпт, schema, выборка и параметры между моделями не меняются. Smoke исключён из development-качества.

Полный эксперимент автоматически допускается только при 12/12 валидных extraction-ответах, 11/11 ожидаемых дополнениях без лишних и ложных citations, 8/8 валидных matching-ответах без опасных merge, сохранённых B1-проверках и идентичном replay. При двух прошедших моделях выбирается меньшая median latency, затем p95, затем Qwen. Код обрабатывает 220 строк, AI — только 41 проблемную; holdout не оценивается. Если порог не пройден, полный прогон не выполняется.

Сохранённый эксперимент: [отчёт этапа 3](docs/STAGE3_REPORT.md), каталоги `reports/stage3-ollama-v1` и `reports/stage3-ollama-v2`, [итоговое сравнение](reports/stage3-ollama-v2/comparison.md). Каталоги неизменяемы. В этом эксперименте сохранена отдельная запись продолжения после семантически неуспешного smoke; повторного smoke не было.

Общий CLI по-прежнему поддерживает `--baseline b2 --ai-mode live|replay --ai-cache DIR --ai-config PATH --ai-task extraction|matching --ai-cohort development|full_input`. По умолчанию он выбирает B1. Точный smoke/набор из 12/набор из 8 пар задаёт экспериментальный runner через проверенные `aiRows`/`aiPairs` сервиса, не обрезая feed. Для отдельного **офлайн-replay без Ollama** команда восстанавливает параметры и явную выборку из сохранённого отчёта:

```sh
npm run build
node dist/src/replay-ollama-run.js reports/stage3-ollama-v1/ollama-qwen3-4b-development-live reports/stage3-ollama-v1/ollama-qwen3-4b-development-cache reports/my-replay ollama-qwen3-4b-development-replay
```

Не использовать default full_input вместо зафиксированной development-выборки. Replay-команда проверяет исходные hashes, заново разбирает raw JSON и не делает discovery или generate. Невалидные ответы воспроизводятся как отказы; проверяется равенство outcomes/diagnostics/quality/decisions. Старая несовместимая matching schema-v2 сохранена как интеграционная неудача; актуальный matching-кэш и schema-v3 находятся в stage3-ollama-v2.

`ai-cache-v2` хранит исходный ответ до валидации, каждую попытку, ошибки, usage и временные показатели. Идентичность включает provider/endpoint, точную модель/digest/версию сервера, параметры, промпт, schema и вход. Старый ai-cache-v1 читается. Replay заново проверяет данные и воспроизводит отказы; отсутствующий кэш не заменяется live. `normalized.json` экспериментального прогона содержит только принятые данные и диагностику. Partial-run сохраняет все 220 строк, B1-факты и причины отказа; невалидный ответ не поступает в pipeline.

Искусственные ответы тестов имеют origin=test и не допускаются в реальный benchmark. Непроверенные уровни validation остаются unchecked; N/A для неизвестных cache-показателей и стоимости локального вычисления не означает нулевую стоимость. Подробный протокол — [BENCHMARKS.md](docs/BENCHMARKS.md).

OpenAI-профили `config/ai.json`, `config/ai.matching-sol.json`, `config/ai.matching-astra.json` сохранены. Ключ читается из `.env` / `OPENAI_API_KEY`; не помещать его в JSON-config, CLI-аргументы или frontend. Доступ Sol/Astra и актуальность тарифов требуют проверки после получения ключа.

## Этап 5: локальный экран сохранённого B1

Доступная часть этапа 5 выполнена; полный MVP ожидает live B2 и этапа 4. **Holdout не оценивался; human review разметки открыт.** [Отчёт и соответствие PDF](docs/STAGE5_REPORT.md), [краткий WRITEUP](WRITEUP.md).

Из чистого каталога, Node 24.14.1 (см. `.nvmrc`), без `.env` и ключа:

```sh
npm ci
npm --prefix web ci
npm run typecheck
npm test
npm run web:test
npm run pipeline -- --baseline b1 --semantic-checks eval/stage3-checks.json --out reports/local --run-id my-stage5-control
npm run eval -- --baseline b1 --semantic-checks eval/stage3-checks.json --out reports/local --run-id my-stage5-repeat
npm run web:prepare -- --run-dir reports/local/my-stage5-control
npm run web:build
npm run web
```

Run ID должен быть новым: отчёты не перезаписываются. Для просмотра уже сохранённого результата достаточно `npm run web:prepare -- --run-dir reports/B1-stage5-control`. Подготовку выполнить до сборки; после нового снимка обновить страницу, для production — пересобрать UI. [Настройки URL и preview](web/README.md).

Просмотр JSON не является replay модели. B1 работает кодом без сети; B2 replay повторяет сохранённые реальные ответы через кэш без новых API-вызовов, B2 live выполняет новые запросы. Реальные локальные B2-кэши находятся в reports/stage3-ollama-v1 и stage3-ollama-v2; его результаты экспериментальные. UI не запускает ни один из этих процессов и не содержит отдельных правил matching/verifier. В B1 текст отсутствует с причиной `generation_not_run`, согласованный факт не означает проверенное утверждение.

Контроль и повтор: `reports/B1-stage5-control`, `reports/B1-stage5-repeat`; сравнения: `reports/comparisons/B1-v2-to-stage5`, `stage3-to-stage5`, `stage5-repeat`; история: `reports/benchmarks/stage5-offline`. Все quality-значения provisional.
