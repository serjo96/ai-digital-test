# Текущий статус и следующий рабочий блок

Зафиксировано: 2026-09-12, ветка `multilang`. P0.1, P0.2, full-input B3 и техническая часть P0.3 завершены; commit/push не выполнялись. Первый holdout выполнен offline и сохранён, matching-review UI готов. Ограниченный аудит исправил явное подтверждение generated claims, условные UI-вкладки и строгую ISO-проверку review metadata. Финальное закрытие ждёт человеческого подтверждения 20 matching cases и clean-clone проверки. Проходят 72 backend-теста и 15 web-тестов; typecheck и production build проверены.

Этот файл — короткая передача для следующего чата. Полный scope и критерии остаются в [ROADMAP.md](ROADMAP.md).

## Однозначный статус этапов

| Этап | Статус | Решение |
|---|---|---|
| 1. Кодовая основа | Завершён по коду | Финальная human-верификация matching labels входит в закрытие этапа 5. |
| 2. Product baseline | Завершён | Принят B1-v2: 220/220 строк, 156 товаров, 4 не-товара; development TP/FP/FN 17/0/0 остаётся provisional до human labels. |
| 3. AI extraction/matching | Завершён как эксперимент с отрицательным product-решением | Интеграция, live/replay и fail-closed проверки работают. B2 не принят по качеству; сохраняется B1-v2. Не продолжать подбор моделей без новой измеренной ошибки или отдельного требования. |
| 4. Generation/verifier | Завершён | Development gate принят; full-input: 154/156 ready, 2 identity review, 0 withheld, 390 atomic claims. Offline replay воспроизводит hashes. |
| 5. UI и финальная оценка | Почти завершён | B1/B3 UI, generated review, full-input и provisional holdout сохранены. Открыты human-verified matching labels и финальная clean-clone передача. |
| 6. Модульная архитектура | Не начат | Начинать после короткого блока закрытия этапов 4–5, чтобы рефакторинг не менял baseline и evaluation одновременно. |

Итого: этапы 1–4 закрыты. До архитектурного этапа 6 остаётся завершить финальную оценку и передачу этапа 5.

## Состояние human review

Исходная человеческая проверка охватила 120/158 claims, 28/37 карточек и выборку 20/20. Verifier-only P0.2 сохранил старые тексты, пересегментировал их в 99 атомарных claims и безопасно перенёс решения по полному покрытию прежними reviewed spans. Новый канонический review: 76/99 claims, 28/37 карточек, sample 20/20, factual errors 0, non-atomic 0, unclear-copy 2. Controlled cases подтверждены 12/12.

Актуальный файл — [generated-review-fdca0138d88f.json](../eval/generated-review-fdca0138d88f.json), `human_verified`, 76 reviewed и 23 pending вне обязательной выборки. Исторический [generated-review-e478435a3d39.json](../eval/generated-review-e478435a3d39.json) сохранён без переписывания.

Девять обнаруженных расхождений разобраны по supplier feed. Все соответствующие факты поддержаны входными данными; четыре проблемы относятся к неатомарным span, две — к неясному copy. Они сохранены отдельными issue-флагами и rationale, а не как ложные factual errors. Интерфейс получил фильтр расхождений/issues и явное сравнение human/AI verdict.

## Следующий критический блок — до архитектурного рефакторинга

### P0.1. Human-review contract — выполнено по коду

Контракт `stage4-generated-review-v2` использует `pending/reviewed`, nullable `humanVerdict`, обязательный rationale и отдельные `non_atomic_claim`/`unclear_copy`. Model verdict не считается человеческим. Gate принимает полностью проверенную фиксированную выборку минимум из 20 карточек; актуальный verifier-only artifact сообщает claims 76/99, products 28/37, sample 20/20. `web:prepare --generated-checks` подключает каноническую разметку, не изменяя исторический run; legacy localStorage мигрируется по стабильным ключам и не затирает сохранённые reviewed-решения.

P0.1 завершён, дополнительная ручная разметка не нужна. Factual error и unresolved `non_atomic_claim` блокируют full-input gate; `unclear_copy` измеряется и раскрывается отдельно.

### P0.2. Development gate — завершён

Human-review часть закрыта: replay получил `human_verified` для controlled и generated review. Verifier prompt v2 требует законченные смысловые spans, а локальный fail-closed валидатор отклоняет оборванные `is a`/`has a` и голые измерения. Помимо четырёх human-flagged claims аудит нашёл тот же паттерн в двух pending published claims и двух controlled spans; человеческие флаги задним числом не добавлялись. При новом publication hash миграция сначала переносит точные стабильные ключи, а при неизменном опубликованном тексте — только reviewed `supported`-решения, полностью покрывающие новый атомарный span. Остальные claims остаются pending.

Development live разрешён и выполнен 2026-09-12: [B3-openai-development-atomic-v2-live-network](../reports/B3-openai-development-atomic-v2-live-network/report.md). Получено 88 calls, 158417 tokens, $2.619013, 0 errors/retries; один repair исправил лишний qualifier Nimbus. Controlled suite прошла 12/12, результат сохранил B1 `decisionsHash`, дал 37/39 ready и 0 запрещённых atomicity-паттернов среди 102 опубликованных claims. [Offline replay](../reports/B3-openai-development-atomic-v2-replay/report.md) дал 88 cache hits, 0 calls и тот же `publicationHash`; [сравнение](../reports/comparisons/B3-openai-development-atomic-v2-live-to-replay/comparison.md) подтверждает `decisionsEqual=true`, `publicationEqual=true` и отсутствие нарушений.

Чтобы не требовать повторной проверки 55 claims после нового generation, добавлен `--publication-source`: режим разрешён только для B3 development, проверяет совместимость source report и не вызывает generator. [Verifier-only live](../reports/B3-openai-development-verifier-only-v2-live/report.md) выполнил 49 verifier calls, 125333 tokens, $2.390245, 0 errors/retries; все 37 published texts побитово совпадают с замороженным источником, запрещённых spans 0. Безопасная migration переносит только supported decisions, полностью покрывающие новый span; исправленные non-atomic flags снимаются только на span, прошедшем atomic-v2 validator.

[Human-gate replay](../reports/B3-openai-development-verifier-only-v2-human-gate-replay/report.md) дал 49 cache hits и 0 calls. Он зафиксировал controlled human-verified 12/12 и generated human-verified 76/99, products 28/37, sample 20/20, factual errors 0, non-atomic 0, unclear-copy 2. Live/replay имеют одинаковые `decisionsHash` и `publicationHash`; [сравнение](../reports/comparisons/B3-openai-development-verifier-only-v2-live-to-human-gate-replay/comparison.md) не содержит нарушений. Дополнительная ручная generated-разметка не нужна.

Выполненная development live-команда:

```sh
npm run build
node dist/src/cli.js pipeline --baseline b3 --ai-mode live --ai-cache reports/B3-openai-development-atomic-v2-network-cache --ai-config config/stage4.openai.json --ai-cohort development --claim-checks eval/stage4-claims.json --out reports --run-id B3-openai-development-atomic-v2-live-network
```

### P0.3. Закрыть этап 5

Full-input B3 уже подготовлен: 154/156 ready, 2 identity review, 0 withheld, 213/220 строк покрыты ready listings; 4 non-product строки и 3 строки двух identity-review товаров объясняют остаток. 390 claims прошли structural validation, запрещённых atomicity-паттернов нет. Live сделал 322 calls и стоил $8.110955; offline replay воспроизводит решения и публикацию без сети.

Технически выполнено: full-input/holdout UI просмотрен; добавлен `split=holdout` с запретом B3 live; первый holdout replay сохранён без API-вызовов; добавлен matching-review экран и сводный benchmark.

1. Человеку во вкладке **Check product matching** проверить и подтвердить 20/20 cases, заполнить reviewer и экспортировать `labels-human-verified.json`. Неверный случай не подтверждать, а вернуть case ID для исправления.
2. После получения экспорта заменить канонический `eval/labels.json`, проверить hash/metadata и повторить development + holdout offline. Если labels исправлялись после просмотра holdout, результат назвать post-holdout development.
3. Обновить WRITEUP, LLM_ROLES, AI_USAGE и выполнить clean-clone/install/test/build/replay/UI проверку.

После этого MVP закрыт и можно начинать этап 6.

## Что сейчас не нужно делать

- Не улучшать B2 extraction/matching и не перебирать новые AI-модели без ошибки, обнаруженной human review или holdout. Отрицательный эксперимент этапа 3 уже является допустимым результатом; B1 безопаснее и остаётся принятым.
- Не запускать второй full-input live: первый сохранён и воспроизводится offline.
- Не начинать массовое перемещение модулей одновременно с изменением review schema, holdout и финальных метрик.
- Не требовать от пользователя разметки оставшихся 38 claims: выборка 20/20 уже завершена.

## Когда переходить к архитектуре

Планировать структуру этапа 6 можно уже сейчас, но менять модули следует после P0.1–P0.3. Тогда B1 `decisionsHash`, B3 `publicationHash`, human-verified development и первый holdout станут characterization baseline для безопасного рефакторинга.

Первый архитектурный шаг после этого — выделить browser-safe artifact contracts и run storage, затем разделить `PipelineService` на B0/B1/B2/B3 use cases. Доменные правила и prompts во время переноса не менять.

## Стартовый запрос для нового чата

> Прочитай `docs/NEXT_STEPS.md`. P0.3 технически готов: holdout replay сохранён, matching-review UI показывает 20 cases. Возьми экспорт `labels-human-verified.json`, не меняй подтверждённые решения без явной ошибки, провалидируй его и повтори development/holdout только offline. Затем выполни clean-clone проверку и закрой итоговую передачу. Новые model calls и архитектурный рефакторинг не запускать.
