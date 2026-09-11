# Этап 5 — доступная часть на B1 выполнена

Дата завершения: 2026-09-10 (Asia/Bangkok); контрольные прогоны сохранены 2026-09-09 UTC. **Этап 5 целиком не завершён:** live B2 и этап 4 отсутствуют. Пользователь выбрал независимую часть этапа 5 и сверку требований без смены визуального стиля. Принятым baseline остаётся B1-v2. Реальных API-вызовов приложения — 0; holdout не оценивался, labels provisional.

## Фактическая основа и изменения

Прочитаны ROADMAP, TASK_ANALYSIS, отчёты этапов 1–3, BENCHMARKS и код; обе страницы исходного PDF просмотрены при планировании. В исходном UI по умолчанию были три явно помеченные demo-карточки, шесть колонок предложений, поиск/review, raw rows и раскрывающиеся факты. Сборка и 42 теста проходили. Артефактов B2/B3, descriptions/claims/verifier не было; контракт ListingView содержал только UI-заглушки. Незакоммиченные изменения этапа 3 использованы как исходное состояние; пользователь сохранил их в процессе работы, агент коммитов не делал.

Добавлено:

- `web:prepare -- --run-dir DIR`: проверка структуры и связей result, совпадения с report по decisionsHash и числу строк; атомарный снимок с выбранными метаданными запуска. Тестовое происхождение и результаты с generation/verifier отклоняются. Старые отчёты не изменяются.
- Общая валидация вложенных полей, уникальных IDs, ссылок товаров/предложений/review и точных цитат с offsets. Проверка целостности не является повторным matching или смысловым verifier.
- Реальный снимок по умолчанию; повреждённый/отсутствующий JSON вызывает понятную ошибку с командой подготовки. URL override поддерживает и прежний raw ProductResult, с явным отсутствием метаданных. Демо-фикстуры импортируются только тестами.
- Происхождение, счётчики, все 220 исходов строк и отдельный раздел четырёх не-товаров с оригиналами/причинами. `review: 0` в исходах строк не означает пустой review: 51 сгруппированный товар имеет review flags.
- Исходная цена и stock в raw rows; offer-scope факты в предложениях; ссылки от SKU/evidence/review к исходной строке. Включены связанные review-строки другого товара, чтобы ссылки оставались рабочими. UI показывает правила извлечения, scope, условия, confidence и причины согласования.
- Адаптивная таблица с локальной прокруткой, неразрывные числовые цены, перенос длинных IDs, ограниченный список товаров, фокус с клавиатуры и aria-expanded. Текущая светлая/тёмная тема и двухколоночная структура сохранены.

Публичные backend API, правила pipeline, labels и исходные JSON/PDF не изменены. Не введён предполагаемый контракт будущих claims: он должен появиться на этапе 4.

## Сверка с PDF и roadmap

PDF не задаёт дизайн или колонки таблицы товаров. Таблица на второй странице — образец `LLM_ROLES.md`, а пункт Show it требует один экран с товаром, исходниками, текстом и flags. Поэтому визуальная оценка относится к читаемости и полноте содержимого, а не к pixel-perfect макету.

| Требование | Было | Сейчас / остающийся пробел |
|---|---|---|
| Канонический товар и источники | 3 demo-карточки; ручной URL к B1 | По умолчанию подготовленный B1: 156 товаров и все 220 строк |
| Таблица предложений | Supplier, SKU, price, currency, stock, condition | Сохранена, добавлены offer facts и ссылки; цены/валюты не объединяются |
| Raw rows | Title/specs, supplier/SKU/ID | Также исходная цена/stock и связанные review-строки |
| Категория, confidence, uncertainty | Уже показаны для demo/проекции | Реальные значения и причины B1; фильтр 51/156 товаров |
| Факты, разногласия, evidence | Раскрытие наблюдений | Точные цитаты и переход к источнику, scope/условия/правило; реальных conflict в B1 нет, synthetic conflict проверен отдельно тестом |
| Generated copy и verifier | Демонстрационные тексты | На реальных данных явно отсутствуют; этап 4 не выполнен |
| Claim → источник и причина допуска | Claims отсутствуют | Заблокировано контрактом/реализацией этапа 4; fact evidence не выдаётся за claim verification |
| Около 20 hand-labelled items | Provisional 14 development / 6 holdout | Человеческая проверка открыта; holdout не использован |
| Matching и verifier quality | Кодовые development-метрики | Сохранены сравнения B1; verifier, естественные ошибки текста, полезный выход B3 — N/A |
| Таблица LLM_ROLES | Четыре колонки и подробности ниже | Шесть колонок PDF; реализованные, не запущенные и будущие роли различаются |
| README, WRITEUP, AI_USAGE | README/AI_USAGE и роли; WRITEUP отсутствовал | Инструкции обновлены, одностраничная записка создана, реальные ошибки внесены в журнал |
| Clean checkout / локальная демонстрация | Финальная проверка отсутствовала | Чистая копия исходников, npm ci, pipeline/eval/build и browser preview проверены; это не git clone опубликованного финального commit |

## Метрики до и после

Все quality-оценки provisional development. Полный вход используется для учёта, но не объявляется размеченным эталоном.

| Показатель | B1-v2 | Этап 3 control-v2 | Этап 5 control | Этап 5 repeat |
|---|---|---|---|---|
| Учёт строк | 220/220 | 220/220 | 220/220 | 220/220 |
| Потери / двойные назначения | 0/0 | 0/0 | 0/0 | 0/0 |
| Товары / не-товары | 156/4 | 156/4 | 156/4 | 156/4 |
| TP / FP / FN | 17/0/0 | 17/0/0 | 17/0/0 | 17/0/0 |
| Precision / recall | 17/17 / 17/17 | 17/17 / 17/17 | 17/17 / 17/17 | 17/17 / 17/17 |
| Candidate recall | 17/17 | 17/17 | 17/17 | 17/17 |
| Review: сообщения / строки / товары | 64/64/51 | 64/64/51 | 64/64/51 | 64/64/51 |
| Категории / факты / согласование | 18/18; 30/30; 4/4 | 18/18; 30/30; 4/4 | 18/18; 30/30; 4/4 | 18/18; 30/30; 4/4 |
| Semantic recall | N/A | 0/11 | 0/11 | 0/11 |
| Wall, ms | 72.445 | 71.505 | 81.957 | 80.121 |
| Pipeline, ms | 36.770 | 36.999 | 37.224 | 38.409 |
| API calls / tokens / USD | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| Генерация / verifier | N/A | N/A | N/A | N/A |

Все три сравнения comparable, decisionsEqual=true, changedRowIds пустой, обязательных нарушений нет. Сравнимые нетайминговые значения неизменны. Время — отдельные наблюдения на Node 24.14.1, darwin arm64, без заявления об ускорении; UI build/загрузка браузера не входят в pipeline timing. Semantic precision N/A (0/0); нулевой useful output B3 не измерялся, поскольку генерации не было.

Артефакты:

- [Контроль](../reports/B1-stage5-control/report.md) и [повтор](../reports/B1-stage5-repeat/report.md), рядом result/report/metrics/diagnostics JSON.
- [B1-v2 → этап 5](../reports/comparisons/B1-v2-to-stage5/comparison.md), [этап 3 → этап 5](../reports/comparisons/stage3-to-stage5/comparison.md), [повтор](../reports/comparisons/stage5-repeat/comparison.md), рядом comparison.json.
- [История](../reports/benchmarks/stage5-offline/summary.json): 14 запусков, 963 наблюдения; [JSONL](../reports/benchmarks/stage5-offline/observations.jsonl). Предыдущие запуски экспортированы из списка stage3-offline и сохранены без перезаписи.

Команды сохранённых прогонов (ID уже заняты, для воспроизведения выбирать новые):

```sh
npm run typecheck
npm test
npm run web:test
npm run web:build
node dist/src/cli.js pipeline --baseline b1 --semantic-checks eval/stage3-checks.json --out reports --run-id B1-stage5-control
node dist/src/cli.js eval --baseline b1 --semantic-checks eval/stage3-checks.json --out reports --run-id B1-stage5-repeat
node dist/src/cli.js compare --before reports/B1-v2 --after reports/B1-stage5-control --out reports/comparisons --run-id B1-v2-to-stage5
node dist/src/cli.js compare --before reports/B1-stage3-control-v2 --after reports/B1-stage5-control --out reports/comparisons --run-id stage3-to-stage5
node dist/src/cli.js compare --before reports/B1-stage5-control --after reports/B1-stage5-repeat --out reports/comparisons --run-id stage5-repeat
npm run web:prepare -- --run-dir reports/B1-stage5-control
```

## Проверки и воспроизводимость

**45 backend-тестов и 3 web-теста прошли.** Новые проверки: сохранённый B1 проходит без изменения объектов; вложенные дефекты, дубли, повреждённые цитаты/ссылки отклоняются; несовпадение report и result не заменяет предыдущий снимок; test/B3 не выдаётся за поддержанный запуск; real projection не разрешает публикацию; HTTP/JSON/schema ошибки не заменяются demo; пустой результат и synthetic conflict остаются корректно помеченными. 42 прежних теста сохранены.

Браузером проверены: поиск Sony, OPEN BOX одного предложения, USD/EUR без FX; две цитаты battery_runtime и ссылка на PacRim raw row; фильтр 51 карточки review; пустая выдача; Slate с пустыми specs; четыре не-товара с причинами. Отдельная production-сборка из чистого каталога показала 156/51/220, поиск Nimbus сохранил Nimbus 2 и Pro раздельно; ошибок консоли не обнаружено.

[Журнал браузерной проверки](../reports/ui/stage5/browser-checks.json); [хэши UI-исходников](../reports/ui/stage5/source-hashes.json). Раскрытие факта клавишей Enter и aria-expanded проверены.

Viewport 1440, 768, 375: scrollWidth совпадает с шириной страницы. На мобильном таблица шириной 620 px прокручивается внутри своего блока. Первое исправление не ограничило min-width секций grid — это обнаружено и исправлено браузерной проверкой; также исправлен перенос decimal price. PNG обычных viewport сохранены, потому что fullPage-снимок IAB дал артефакты склейки:

- [Desktop 1440](../reports/ui/stage5/desktop-1440.png)
- [Tablet 768](../reports/ui/stage5/tablet-768.png)
- [Mobile 375](../reports/ui/stage5/mobile-375.png)
- [Мобильная таблица](../reports/ui/stage5/mobile-offers-375.png)

Временный чистый каталог создан из текущих tracked/non-ignored исходников, без `.git`, `.env`, node_modules и build. Root и web установлены через `npm ci`; offline-попытка обнаружила отсутствие Vite в кэше, обычная установка с registry завершилась. Из-за выбора Node 23 оболочкой в новом каталоге установка и все проверки повторены с явным PATH на Node 24.14.1. Выполнены команды README: typecheck, test, web:test, pipeline/eval с новыми my-stage5 ID, web:prepare, web:build. Production UI запущен через `npm --prefix web run preview -- --host 127.0.0.1 --port 4173`; основной dev UI — через `npm --prefix web run dev -- --host 127.0.0.1`. DecisionsHash обоих clean-прогонов совпадает с сохранённым контролем. [Машинный результат](../reports/ui/stage5/clean-environment.json).

Build проходит с двумя предупреждениями Rollup об аннотациях комментариев в установленном Zod; runtime-ошибок не выявлено. JS bundle вырос с примерно 204 до 297 kB (gzip ~90 kB) из-за общей валидации. Это сознательный компромисс локального MVP, новые зависимости не добавлены. Чистая копия подтверждает установку текущих исходников; финальный git clone после сохранения всех новых файлов остаётся процедурой сдачи пользователя.

## Передача и ограничения

Независимая часть этапа 5 принята. Полный критерий MVP не выполнен: нет live AI/B2, генерации/проверки настоящего текста, human-verified labels и финального holdout. README, LLM_ROLES, WRITEUP и AI_USAGE отражают именно это состояние; отсутствующие метрики не представлены нулями качества.

Продолжение — завершить этап 3 после сообщения пользователя о ключе, затем реализовать и измерить этап 4. После принятого B3 интегрировать сохранённые claims/вердикты/разрешённый текст, зафиксировать правила/промпты и один раз оценить holdout; затем обновить итоговый комплект. Проекция сейчас сознательно создаёт null draft/published: не подключать B3 без изменения этого контракта. Просмотр снимка не равен replay AI; для реального replay нужен ещё не созданный live-кэш.

Правила/промпты не настраивались по holdout. Этапы 3–4 автоматически не выполнялись, API не вызывался, публикации/деплоя/отправки и agent commits/push не было. Точный focused time не фиксировался; работа пересекала паузу пользователя, elapsed нельзя выдавать за время сосредоточенной реализации.

## Передача из этапа 4 — 2026-09-10

Эта запись дополняет исторический статус выше; UI этапа 5 в рамках этапа 4 не изменялся. B3-v1 contract и development artifacts готовы: [live](../reports/B3-openai-development-live-v4/report.md), [offline replay](../reports/B3-openai-development-replay-v4/report.md), [B1→B3](../reports/comparisons/B1-v2-to-B3-openai-development-v4/comparison.md), [live→replay](../reports/comparisons/B3-openai-development-live-to-replay-v4/comparison.md), полный [отчёт этапа 4](STAGE4_REPORT.md).

Development: 37/39 ready, 2 identity review, 0 withheld; controlled verifier provisional — unsupported 4/4, false block 0/7, disputed leakage 0/1, errors 0. B1 `decisionsHash` неизменен, replay имеет тот же `publicationHash`. OpenAI live: 86 calls, 151618 tokens, $2.6475128, 0 errors/retries; replay: 86 cache hits, 0 calls.

Блокер следующего этапа: человек должен проверить controlled suite и 158 generated claims, заполнить `reviewedBy/reviewedAt` и rationale. До успешного human gate full-input B3, holdout и финальная оценка не разрешены. `web:prepare` намеренно продолжает отклонять schema 4/B3; подключать listings к UI следует только отдельным заданием этапа 5. В этой передаче UI, deployment, commit и push не выполнялись.

## Узкое дополнение: B3 claim review — 2026-09-11

По отдельному заданию подключено только отображение и человеческая разметка сохранённого B3. `web:prepare` теперь собирает проверенный B3 review bundle; существующий экран получил переключатель Catalog / Claim review. Generated view группирует 158 claims по 37 опубликованным товарам, подсвечивает точные диапазоны и показывает verifier reason, supports и исходные evidence. Controlled view показывает 12 фиксированных случаев, expected verdict и фактические атомарные claims.

Черновик human verdict/rationale хранится только в `localStorage` с привязкой к `publicationHash`; экспорт остаётся provisional до заполнения всех rationale и reviewer. Исходный run не изменяется, модели и сеть из UI не вызываются. Проверены реальный development bundle, обе вкладки и восстановление черновика после reload. Full-input B3, holdout, финальная оценка и deployment не выполнялись; человеческий gate остаётся блокером.

После пользовательской проверки терминология уточнена: экран называется **Check listing text** и явно ограничивает задачу fidelity-review. Generated wording показывается рядом с supplier statement; supplier specs обозначены как непроверенный input feed, а external truth — как недоступный без authoritative manufacturer URL. Verdict-кнопки описывают совпадение с supplied data, а 12 QA fixtures вынесены в пояснённый экран **Verifier test cases** и не требуют человеческой разметки.

Следующая узкая UX-правка убрала необходимость держать структуру экрана в памяти: сверху добавлен онбординг из трёх шагов, а в каждой карточке повторяются текущий товар и номер фразы. Системная фраза и исходный текст поставщика теперь образуют одну пронумерованную пару, сразу после которой задан вопрос для решения. Ответ автоматического verifier скрыт в необязательном раскрывающемся блоке до тех пор, пока он не понадобится как пояснение; pipeline, claims и сохранённые вердикты не изменялись.
