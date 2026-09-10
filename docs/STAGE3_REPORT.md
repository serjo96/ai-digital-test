# Этап 3 — архитектурная интеграция завершена, product baseline B1-v2

Дата: 2026-09-10. **Архитектурная интеграция завершена:** реальные локальные вызовы, validation, сохранение сырых ответов/отказов, повторный разбор JSON при offline replay и метрики работают. **Продуктовое качество на development не подтверждено.** Qwen не прошёл строгий порог; Gemma не смогла загрузиться, её качество N/A. Полный AI-прогон на 41 проблемной строке не выполнялся. Принятый baseline — **B1-v2**, matching строго shadow/advisory.

OpenAI-вызовов **0**: ключ не получен, разрешения на OpenAI по-прежнему нет до явного сообщения пользователя. Этап 4, описания и финальный verifier не реализовывались. Разметка provisional, человеческая проверка открыта; holdout не оценивался и не использовался для настройки.

## Основа и зависимости

После остановки перепроверен HEAD **61d740c**, рабочее дерево было чистым. Исходный план ссылался на 63ae872; последующие пользовательские изменения, включая подготовку каталога и материалы этапа 5, уже были закоммичены и сохранены. Прочитаны roadmap, TASK_ANALYSIS, stage3/offline, текущие отчёты и код B2/provider-neutral/OpenAI/cache/replay/evaluation. Кодовый контроль повторил decisionsHash принятого B1-v2: 220/220 строк, 156 товаров, 4 не-товара, TP/FP/FN 17/0/0, 545 фактов. До расширения проходили 45 backend-тестов.

Сервер /api/version и /api/tags подтвердил **Ollama 0.9.6**, endpoint **http://127.0.0.1:11434**:

| Точное имя | Полный digest | Квантизация |
|---|---|---|
| qwen3:4b | 359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7 | Q4_K_M |
| gemma4:12b | 4eb23ef187e2c5462566d6a1d3bbbc2f1346d0b4327cbb66d58fffbcc9b2b05c | Q4_K_M |

Наличие тега Gemma не подтвердило возможность загрузки: на каждый development-запрос сервер ответил HTTP 500 `unable to load model`. Причина внутри локальной установки не установлена; модель и сервер не обновлялись и не переустанавливались. Новые npm-зависимости не добавлялись.

## Реализация и границы

- OllamaAdapter через встроенный fetch и native /api/chat зарегистрирован в существующем Nest DI. В format передаётся общая JSON Schema, stream=false. В предметном pipeline нет импортов Ollama/OpenAI. [Официальный Chat API](https://docs.ollama.com/api/chat), [Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs).
- Контракт допускает необязательный reasoning, общие параметры генерации и identity (digest/serverVersion). Существующие OpenAI-профили и поведение сохранены. Для локальных моделей: temperature=0, seed=42, context=8192, maxOutputTokens=2048, topK=20, topP=0.9, repeatPenalty=1, keepAlive=5m. Qwen получает think:false, Gemma — без think. Один запрос одновременно, timeout 120 секунд на попытку, максимум один транспортный retry/429/5xx; smoke без retries. Ошибки JSON/schema/evidence не вызывают новую генерацию.
- Extraction semantic_extraction_v1, промпт и правила evidence не менялись. 12 строк взяты непосредственно из cases stage3-checks.json в исходном порядке; 11 дополнений. Feed не обрезается: каждый сохранённый результат учитывает 220 строк. Явные aiRows/aiPairs проверяются сервисом.
- Matching сохраняет decision, confidence high/medium/low, reason и evidence в отдельном AI trace/normalized-артефакте. Не изменяет deterministic decisions, группы, review или product confidence даже при merge/reject/unknown. Confidence не трактуется как вероятность.
- Cache-v2 сохраняет сырой ответ **до validation**, полный request и каждую попытку, включая HTTP-ошибки и непригодные ответы. Идентичность включает endpoint/model/digest/serverVersion/parameters/prompt/schema/input. Старый cache-v1 читается. Replay не вызывает discovery/generate, заново разбирает сохранённый raw JSON, выполняет schema/evidence validation и воспроизводит отказы. Невалидные данные остаются недоступны pipeline.
- Диагностика transport/completion/JSON/schema/citations/semantic разделяет checked, passed, failed и unchecked. Отсутствие ответа не считается успешной валидацией. Искусственные ответы origin=test не включаются в real benchmark.

## Ход эксперимента и изменения версии

1. **Smoke Qwen:** один запрос Quill row_11462769c5. JSON/schema/citations прошли. Модель предложила ожидаемое colour_temperature_count=5 вместе с четырьмя неподдержанными дополнениями, включая Bluetooth для лампы. Весь ответ отклонён общими semantic-правилами; replay воспроизвёл отказ. Wall запроса 37.846 s, из них загрузка 21.760 s и generation 13.732 s. Smoke не входит в development-качество.
2. Первый runner остановился на семантическом отказе smoke. После проверки согласованного условия продолжение разрешено как технически исправный транспорт/schema, без повторного smoke и без изменения промпта, схемы, параметров или labels. Исходный stop.json сохранён; отдельный smoke-continuation.json фиксирует причину и хэши.
3. **Qwen development:** ровно 12 заданий, 12 вызовов, 0 retries/таймаутов. Затем **Gemma development:** те же 12 заданий, 24 вызова с одним retry каждого HTTP 500. Все задания достигли конечного состояния; ни одного модельного ответа Gemma нет. Её shadow не запускался.
4. **Первый shadow Qwen:** Ollama 0.9.6 отвергла tuple JSON Schema (prefixItems/items:false) до генерации. Сохранены 8 заданий/16 HTTP-попыток и их replay в эксперименте v1. Это интеграционные ошибки, не качество модели.
5. **Новая версия matching:** эквивалентный массив ровно из двух строк заменил tuple; schemaName повышен с ambiguous_matching_v2 до **ambiguous_matching_v3**. Новый manifest и отдельный каталог stage3-ollama-v2. Промпт, confidence/reason, пары, labels и параметры не менялись; extraction повторно не запускался. Qwen выполнил 8 shadow-заданий, затем replay. Gemma не повторялась после ошибки загрузки. Неудачные v2 schema-попытки не смешаны с качеством v3.
6. Финальная проверка заново воспроизвела smoke, оба development и shadow-v3 из raw-кэшей с транспортом, запрещающим сеть. Исходы, диагностика, решения и quality совпали; новых модельных вызовов 0.

## Сравнение development

| Показатель | B1-контроль | Qwen qwen3:4b | Gemma gemma4:12b |
|---|---:|---:|---:|
| Задания завершены / запланированы | N/A | 12/12 | 12/12, все server error |
| Полученные модельные ответы | N/A | 12 | 0 |
| JSON / schema valid | N/A | 12/12 / 12/12 | N/A, checked=0 |
| Citations / semantic valid | N/A | 12/12 / 2/12 | N/A, checked=0 |
| Успешные / неуспешные задания | N/A | 2 / 10 | 0 / 12 |
| Предложено correct / extra / missing | N/A | 11 / 38 / 0 | N/A: ответов нет |
| Принято correct / extra / missing | 0 / 0 / 11 | 3 / 0 / 8 | 0 / 0 / 11 (кодовый результат) |
| Rejected additions | N/A | 46 из 49 | N/A |
| Несуществующие/чужие/неоднозначные citations | N/A | 0 | N/A |
| Неподдержанные смыслом источника дополнения | N/A | 35 из 49 | N/A |
| Неверные scope / conditions / unit | N/A | 0 / 0 / 0 из 49 | N/A |
| Неверный тип значения | N/A | 4 из 49 | N/A |
| Unknown-сообщения модели | N/A | 50 на 12 строках | N/A |
| Review: сообщения / уникальные строки | 64 / 64 | 73 / 63 | 76 / 64 |
| AI review-сообщения / затронутые строки | 0 / 0 | 11 / 12 | 12 / 12 |
| Matching TP / FP / FN продукта | 17 / 0 / 0 | 17 / 0 / 0 | 17 / 0 / 0 |
| Учёт строк / товары / не-товары | 220 / 156 / 4 | 220 / 156 / 4 | 220 / 156 / 4 |
| Calls / retries | 0 / 0 | 12 / 0 | 24 / 12 |
| Median / p95 wall задания | N/A | 15.592 / 18.492 s | 1.701 / 1.969 s **ошибок**, не generation |
| Model load / generation, сумма | N/A | 0.511 / 147.679 s | N/A |
| Input / output tokens | 0 / 0 | 11020 / 5405 | N/A |
| Стоимость локального вычисления | N/A | N/A | N/A |

Предложение правильного значения не равно принятому факту: ответ удерживается целиком при любой ошибке. У Qwen 14 отдельных дополнений проходят узкую source-проверку, но только 11 соответствуют целевым ожидаемым дополнениям; лишние повторения/дополнения не считаются выигрышем. У принятых pipeline-фактов precision 3/3, recall 3/11 — это узкий provisional development-результат, не подтверждённое качество всего feed.

У Qwen прежние stage2 проверки сохранены: категории 18/18, факты 30/30, согласование 4/4. Semantic type/category 12/12. Группы и исходы строк не изменились. Снижение review-строк на одну при росте сообщений не является доказательством улучшения качества: счётчики имеют разные знаменатели.

## Shadow-matching

Восемь пар фиксированы: 2 unknown AeroBuds, 2 positive (English AeroBuds, Onyx Lite), 4 negative (насадки против трёх AeroBuds и Cobalt lamp против mouse). Labels модели не передавались.

Qwen schema-v3: transport/JSON/schema **8/8**; citations **1/8**, semantic checked=1/passed=1/unchecked=7. **1 успешное и 7 неуспешных заданий**. Модель предложила merge и confidence=high на всех восьми парах. Зафиксированы **4 опасных merge** вопреки known negative/hard conflict и **2 неподтверждённых merge** на unknown. Есть **4 искажённых пары row_id** и **3 ложных ссылки evidence**. Unknown-рекомендаций 0; все восемь рекомендаций advisory, не автоматические действия. Низкое число unknown не означает уверенное правильное сопоставление.

Из валидных рекомендаций только одна относится к положительной English AeroBuds-паре. Опасные/неподтверждённые предложения учитываются и при невалидном evidence: ошибка ссылки не скрывает ошибку решения. ProductResult целиком идентичен B1, включая review и confidence. Product review остаётся 64/64; 7 отклонённых matching-ответов затрагивают 8 уникальных строк и хранятся отдельно.

Shadow Qwen: **8 calls, 0 retries**, median/p95 **7.720 / 11.773 s**, суммарные load/generation **0.394 / 65.592 s**. Gemma shadow: **не выполнялся**, качество/latency N/A. Сравнить качество двух работающих локальных моделей не удалось из-за загрузки Gemma.

## Решение по порогу и ограничения

Ни одна модель не прошла согласованный строгий порог 12/12 валидных extraction, 11/11 дополнений без лишних/citations, 8/8 валидных shadow без опасных merge и равного replay. **Полный прогон не разрешён и не выполнен.** Принятым product baseline остаётся B1-v2. Архитектурное завершение подтверждает работающую интеграцию, включая удержание ошибок; оно не является принятием AI-качества.

Всего реально сделано **61 HTTP inference-попытка, 20 retries, 41 задание** с учётом smoke, development и двух версий shadow. Это не 41-строчный full extraction: breakdown — 1 smoke + 12 Qwen + 24 Gemma + 16 отвергнутой matching-schema + 8 matching-v3. Метаданные сервера считаются отдельно. Затраты интеграционных ошибок не скрыты; доступные токены сохранены, неизвестные не заменены нулями. Холодная загрузка включена в wall. Локальная стоимость и неизвестный cache breakdown N/A. Стоимость сессии Codex отдельно не измерялась.

## Артефакты и проверки

- [Итоговое сравнение](../reports/stage3-ollama-v2/comparison.md), [JSON](../reports/stage3-ollama-v2/comparison.json).
- [Полная сводка и availability](../reports/stage3-ollama-final-verification/summary.json), [JSONL всех live-серий, включая сбои](../reports/stage3-ollama-final-verification/observations.jsonl), рядом воспроизводимый audit-method.mjs и четыре финальных replay с verification.json.
- [Manifest v1](../reports/stage3-ollama-v1/manifest.json), [новая matching-версия](../reports/stage3-ollama-v2/manifest.json), рядом manifest-hash, configs, raw cache/attempts, normalized, ai.json, metrics/report и replay-comparison.
- [Общий benchmark v1](../reports/stage3-ollama-v1/benchmark-complete/summary.json), [актуальный development/shadow-v3 benchmark](../reports/stage3-ollama-v2/benchmark/summary.json), [детальные модельные JSONL](../reports/stage3-ollama-v2/experiment-benchmark.jsonl).
- [B1-v2 → контроль](../reports/comparisons/B1-v2-to-ollama-control/comparison.md), [B1 → Qwen](../reports/comparisons/B1-to-ollama-qwen-development/comparison.md), [B1 → Gemma](../reports/comparisons/B1-to-ollama-gemma-development/comparison.md). Два B2-сравнения сохраняют mandatory violation «incomplete run» и корректно возвращают exit code 1.
- [Исторический отчёт офлайн-части](STAGE3_OFFLINE_REPORT.md). Прежние отчёты, labels/checks/feed и материалы этапа 5 не переписаны.

Typecheck, **54 backend-теста** и **5 web-тестов** проходят. Проверены mapping параметров/usage, malformed/truncated/HTTP errors, timeout/retry и raw replay, digest/server изоляция, старые кэши/отчёты, запрет test-origin в benchmark, ограничения 1/12, все варианты shadow без изменения B1, строгий full gate и сохранение подготовки каталога. Дополнительно реальные raw-кэши декодированы повторно без сети; все outcomes/diagnostics/quality/decisions совпали.

## Передача следующей работе

Передаются общие контракты provider/response, B1 rows/offers/facts/evidence/conditions/review, неизменяемые локальные эксперименты и воспроизводимый replay. **Этап 4 автоматически не начинать.** Для него требуется отдельное задание; текущие AI-дополнения и matching не являются принятым источником финальных описаний или доказательством verifier-quality.

Открыто: человеческая проверка provisional-разметки (включая две сохранённые unknown AeroBuds); будущий OpenAI Sol/Astra после явного сообщения о ключе. Не менять правила/метки по holdout и не продолжать full при текущем качестве. Материалы этапа 5, экран и подготовка каталога сохранены. Коммиты, push, отправка и deployment агентом не выполнялись.

## Повтор Gemma после обновления Ollama — 2026-09-10

После перезапуска локальный endpoint `http://127.0.0.1:11434` сообщил версию `0.34.0`; тот же `gemma4:12b` с зафиксированным digest был успешно загружен. Отдельный технический профиль `ai.ollama-gemma4-12b-v034-thinkoff.json` сохраняет prompt, schema, 12 строк, evidence-правила и остальные generation-параметры; только `thinking:false` предотвращает расход структурированного вывода на reasoning. Исторические прогоны не переписывались.

В [отдельном каталоге](../reports/stage3-ollama-gemma4-v034-thinkoff) smoke и development показали 11/12 завершений transport/JSON/schema; один запрос исчерпал timeout и один разрешённый retry. Ни одно из 12 заданий не прошло общий acceptance: 7 citation-отказов, 4 semantic-отказа, 17 ложных citations всего; proposed correct/extra/missing 7/6/4, accepted 0/0/11. Median/p95 live latency — 18.835/242.269 s, 13 calls и 1 retry. Offline replay без сети совпал по validation, quality и decisions.

Техническая стабильность не достигнута, поэтому shadow-matching и полный прогон не запускались. B1-v2 остаётся product baseline: обновлённый запуск подтверждает transport, raw cache, validation и replay, но не качество Gemma.
