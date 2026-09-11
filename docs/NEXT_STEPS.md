# Текущий статус и следующий рабочий блок

Зафиксировано: 2026-09-11, ветка `multilang`, базовый commit `5d3d4ef`. P0.1 реализован поверх ранее начатых изменений документации; commit/push не выполнялись. Проходят 66 backend-тестов, 12 web-тестов, typecheck и production build.

Этот файл — короткая передача для следующего чата. Полный scope и критерии остаются в [ROADMAP.md](ROADMAP.md).

## Однозначный статус этапов

| Этап | Статус | Решение |
|---|---|---|
| 1. Кодовая основа | Завершён по коду | Финальная human-верификация matching labels входит в закрытие этапа 5. |
| 2. Product baseline | Завершён | Принят B1-v2: 220/220 строк, 156 товаров, 4 не-товара; development TP/FP/FN 17/0/0 остаётся provisional до human labels. |
| 3. AI extraction/matching | Завершён как эксперимент с отрицательным product-решением | Интеграция, live/replay и fail-closed проверки работают. B2 не принят по качеству; сохраняется B1-v2. Не продолжать подбор моделей без новой измеренной ошибки или отдельного требования. |
| 4. Generation/verifier | Реализован, но не принят | Development B3 live/replay успешны; 12 controlled cases подтверждены человеком, generated-review contract v2 готов. Открыты завершение выборки, metadata replay и full-input B3. |
| 5. UI и финальная оценка | Частично завершён | B1-каталог и B3 review UI поддерживают явные human decisions, issue-флаги и конечную 20-product выборку. Открыты принятие gate, full-input, holdout и итоговая передача. |
| 6. Модульная архитектура | Не начат | Начинать после короткого блока закрытия этапов 4–5, чтобы рефакторинг не менял baseline и evaluation одновременно. |

Итого: нельзя считать закрытыми все этапы кроме шестого. Закрыты инженерные результаты 1–3; этапы 4–5 имеют небольшой, но обязательный незавершённый блок.

## Состояние human review

Пользователь проверил через UI 75/158 generated claims, полностью завершив 18/37 опубликованных development-карточек. Отдельные 12 controlled cases также проверены пользователем и подтверждены без изменений; повторно проверять их не нужно. Канонический suite и замороженный B3-report пока синхронно остаются `provisional`; metadata повышается атомарно при development replay.

Экспорт сохранён и без переинтерпретации мигрирован в [generated-review-e478435a3d39.json](../eval/generated-review-e478435a3d39.json). Файл имеет правильный `publicationHash`, 75 явных `reviewed` и 83 `pending`; полностью готовы 18/37 карточек и 18/20 карточек фиксированной выборки. В неё дополнительно включены Onyx Lite microSD и Quill 3 USB-C hub.

Шесть пользовательских verdict, отличающихся от verifier, сохранены. Пять выглядят как поддержанные факты с неудобным контекстом/формулировкой; PulseFit span `The PulseFit Band 3 tracker has a` выявляет проблему атомарности. Код не исправляет эти решения от имени человека: при пересмотре factual verdict следует оставить `supported`, если данные совпадают, а wording-проблему отметить `unclear_copy` или `non_atomic_claim`.

## Следующий критический блок — до архитектурного рефакторинга

### P0.1. Human-review contract — выполнено по коду

Контракт `stage4-generated-review-v2` использует `pending/reviewed`, nullable `humanVerdict`, обязательный rationale и отдельные `non_atomic_claim`/`unclear_copy`. Model verdict не считается человеческим. Gate принимает полностью проверенную фиксированную выборку минимум из 20 карточек и сообщает claims 75/158, products 18/37, sample 18/20. `web:prepare --generated-checks` подключает каноническую разметку, не изменяя исторический run; legacy localStorage мигрируется по стабильным ключам и не затирает сохранённые reviewed-решения.

До P0.2 пользователь должен проверить все claims двух оставшихся карточек выборки и самостоятельно подтвердить либо изменить шесть расходящихся factual verdict. Экспорт станет `human_verified` после sample 20/20 и reviewer metadata, но factual error или `non_atomic_claim` всё равно блокирует full-input gate.

### P0.2. Закрыть этап 4

1. Исправить или явно учесть неатомарный PulseFit span.
2. Выполнить development replay с подтверждённой controlled suite и принятым generated review; получить human-verified stage-4 gate.
3. Запустить один full-input B3 live и затем offline replay; сохранить стоимость, время, ready/review/withheld и hash-эквивалентность.

### P0.3. Закрыть этап 5

1. Подготовить B3 full-input artifact для существующего каталога и проверить claims/evidence/statuses в UI.
2. Добавить явный режим evaluation split=`holdout`: сейчас evaluator жёстко считает только development.
3. Завершить независимую human-разметку 20 matching cases, не подгоняя решения под pipeline.
4. После заморозки правил и prompts один раз выполнить holdout evaluation.
5. Обновить README, WRITEUP, LLM_ROLES, AI_USAGE и итоговые отчёты; повторить clean-clone/install/test/build/run проверку.

После этого MVP закрыт и можно начинать этап 6.

## Что сейчас не нужно делать

- Не улучшать B2 extraction/matching и не перебирать новые AI-модели без ошибки, обнаруженной human review или holdout. Отрицательный эксперимент этапа 3 уже является допустимым результатом; B1 безопаснее и остаётся принятым.
- Не запускать full-input B3 до фиксации human gate: это создаст дорогой результат без принятой оценки.
- Не начинать массовое перемещение модулей одновременно с изменением review schema, holdout и финальных метрик.
- Не требовать от пользователя повторной проверки уже размеченных 75 claims.

## Когда переходить к архитектуре

Планировать структуру этапа 6 можно уже сейчас, но менять модули следует после P0.1–P0.3. Тогда B1 `decisionsHash`, B3 `publicationHash`, human-verified development и первый holdout станут characterization baseline для безопасного рефакторинга.

Первый архитектурный шаг после этого — выделить browser-safe artifact contracts и run storage, затем разделить `PipelineService` на B0/B1/B2/B3 use cases. Доменные правила и prompts во время переноса не менять.

## Стартовый запрос для нового чата

> Прочитай `docs/NEXT_STEPS.md`, открой B3 review UI с `eval/generated-review-e478435a3d39.json` и помоги завершить две оставшиеся карточки выборки и пересмотреть шесть расходящихся verdict. Не меняй human decisions автоматически и не запускай development replay, full-input API, holdout или архитектурный рефакторинг без отдельного задания.
