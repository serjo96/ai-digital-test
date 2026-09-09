# Shelf Ready — этап 5: экран B1 и промежуточная передача

Локальный pipeline: JSON → валидация → предложения → явные факты и evidence → кандидаты и совместимые товары → категории, согласование и review → development eval и сохранённые метрики. Текущие правила **B1-v2**. B0 сохранён как отдельный режим. Подготовлена модульная API-интеграция B2, но реальных модельных прогонов пока нет. Генерация и verifier остаются этапу 4. Минимальный экран просмотра результатов добавлен в `web/` (сохранённый снимок B1 по умолчанию).

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

Пути задаются `--feed`, `--taxonomy`, `--labels`, `--checks`, `--out`. CLI имеет приоритет над `FEED_PATH`, `TAXONOMY_PATH`, `LABELS_PATH`, `REPORTS_DIR`, затем стандартными файлами. Для `--checks` переменной окружения нет; по умолчанию `eval/stage2-checks.json`. `.env.example` документирует переменные; `.env` автоматически не загружается. Для B0/B1 API-ключ не нужен.

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

Сохранённые B0, B0-repeat, промежуточный B1 и первый benchmark не переписывались. Файлы результатов сохраняются локально и предназначены для Git; автоматической отправки куда-либо нет. Кодовая интеграция этапа 3 подготовлена; реальный AI-прогон ожидает сообщения пользователя о добавлении ключа. См. [отчёт этапа 3](docs/STAGE3_REPORT.md) и [роли моделей](LLM_ROLES.md).


## B2: провайдеры и отложенный реальный запуск

**По инструкции пользователя никакие модельные запросы пока не выполняются.** Даже появление ключа в окружении не является сигналом для агента начать: сначала нужно явное сообщение пользователя, что ключ добавлен. Ни тесты, ни обычный B1, ни bootstrap не проверяют доступ к API. Приведённые ниже live-команды — инструкция для будущего продолжения, они пока не выполнялись.

Основной профиль: [`config/ai.json`](config/ai.json), extraction/category через `gpt-5.6-sol`, reasoning low. Рабочий адаптер только OpenAI. Общий `AiProvider` и DI-реестр позволяют позже добавить Ollama/другой провайдер; переключение одного base URL не считается готовым адаптером. SDK OpenAI не используется в предметных шагах.

Отбор extraction: непонятые specs, неопределённый тип/категория и строки review-пар B1 — сейчас 41 строка, из них 12 development. Обрабатывается полный feed и сохраняется учёт 220 строк; `--ai-cohort development` ограничивает именно запросы, а не обрезает вход. Модель не получает labels. B2 добавляет пять ограниченных семантических атрибутов и не переписывает существующие наблюдения B1. Пустые specs сами по себе не вызывают модель. Unknown и неподдержанные форматы остаются review.

Офлайн-команда для нового контрольного B1 и новых semantic-checks:

```sh
npm run pipeline -- --baseline b1 --semantic-checks eval/stage3-checks.json --out reports/local --run-id my-stage3-control
```

После сообщения о ключе пользователь задаёт `OPENAI_API_KEY` в окружении терминала. Не добавлять ключ в конфиг, аргументы CLI, frontend или Git. Автоматической загрузки `.env` нет; при использовании такого файла Node поддерживает `--env-file=.env` перед `dist/src/cli.js` после сборки.

Будущий первый development-прогон, затем полный прогон и replay:

```sh
npm run pipeline -- --baseline b2 --ai-mode live --ai-cohort development --ai-config config/ai.json --ai-cache reports/B2-sol-development-cache --out reports --run-id B2-sol-development
npm run pipeline -- --baseline b2 --ai-mode live --ai-config config/ai.json --ai-cache reports/B2-sol-live-cache --out reports --run-id B2-sol-live
npm run eval -- --baseline b2 --ai-mode replay --ai-config config/ai.json --ai-cache reports/B2-sol-live-cache --out reports --run-id B2-sol-replay
npm run compare -- --before reports/B1-stage3-control-v2 --after reports/B2-sol-live --out reports/comparisons --run-id B1-to-B2-sol
npm run compare -- --before reports/B2-sol-live --after reports/B2-sol-replay --out reports/comparisons --run-id B2-sol-replay
```

Проверить development-результат до перехода к полному live; эти команды не составляют автоматическую последовательность. Запросы full_input могут обрабатывать holdout-строки, но holdout-оценка/настройка по ним отложена до этапа 5. Labels сохраняются provisional.

Для отдельного будущего matching-эксперимента:

```sh
npm run pipeline -- --baseline b2 --ai-task matching --ai-cohort development --ai-mode live --ai-config config/ai.matching-sol.json --ai-cache reports/B2-matching-sol-cache --out reports --run-id B2-matching-sol
npm run pipeline -- --baseline b2 --ai-task matching --ai-cohort development --ai-mode live --ai-config config/ai.matching-astra.json --ai-cache reports/B2-matching-astra-cache --out reports --run-id B2-matching-astra
```

Matching работает отдельно от extraction на одних и тех же review-парах B1: смена модели не перемешивается с новым extraction-прогоном. Сейчас это две unknown-пары AeroBuds; рекомендации не имеют подтверждённого эталона. Код не разрешает merge при неизвестной совместимости. Matching-прогон не является полным B2 extraction и не доказывает качество будущего verifier. Профили отличаются моделью matching; эксперимент по умолчанию выключен.

`--baseline b2` требует явных `--ai-mode live|replay` и `--ai-cache DIR`. Для каждого live использовать новый cache DIR и run ID: существующие ответы не перезаписываются. Replay не требует ключа, не обращается к сети и не подставляет live при отсутствии ответа. При ошибках сохраняются базовые наблюдения, review, `report.json` со статусом partial, `ai.json` и `failure.json`; CLI возвращает 1. Ошибка конкретной строки не скрывает остальные исходы. Ошибка авторизации останавливает дальнейшие запросы.

`--semantic-checks` по умолчанию для B2 указывает на `eval/stage3-checks.json`; прежний `--checks` продолжает использовать stage2-checks. Сравнение semantic.* допустимо только при одинаковом хэше новой выборки. Искусственный тестовый прогон маркируется test и не допускается в реальную benchmark-историю. Цены/usage, режим, конфигурация и происхождение записываются явно; N/A не превращается в нулевую стоимость.

Кодовый контроль этапа 3 и история: [отчёт](reports/B1-stage3-control-v2/report.md), [сравнение с B1-v2](reports/comparisons/B1-v2-to-stage3-offline/comparison.md), [12 запусков / 803 наблюдения](reports/benchmarks/stage3-offline/summary.json). Реальные B2-прогоны пока не выполнялись.


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

Просмотр JSON не является replay модели. B1 работает кодом без сети; B2 replay повторяет сохранённые реальные ответы через кэш без новых API-вызовов, B2 live выполняет новые запросы. Реального B2-кэша пока нет. UI не запускает ни один из этих процессов и не содержит отдельных правил matching/verifier. В B1 текст отсутствует с причиной `generation_not_run`, согласованный факт не означает проверенное утверждение.

Контроль и повтор: `reports/B1-stage5-control`, `reports/B1-stage5-repeat`; сравнения: `reports/comparisons/B1-v2-to-stage5`, `stage3-to-stage5`, `stage5-repeat`; история: `reports/benchmarks/stage5-offline`. Все quality-значения provisional.
