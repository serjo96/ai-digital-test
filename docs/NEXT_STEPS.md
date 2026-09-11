# Текущий статус и следующий рабочий блок

Зафиксировано: 2026-09-11, ветка `multilang`, базовый commit `5d3d4ef`. P0.1 и офлайн-часть P0.2 реализованы поверх ранее начатых изменений документации; commit/push не выполнялись. Проходят 67 backend-тестов, 13 web-тестов, typecheck и production build.

Этот файл — короткая передача для следующего чата. Полный scope и критерии остаются в [ROADMAP.md](ROADMAP.md).

## Однозначный статус этапов

| Этап | Статус | Решение |
|---|---|---|
| 1. Кодовая основа | Завершён по коду | Финальная human-верификация matching labels входит в закрытие этапа 5. |
| 2. Product baseline | Завершён | Принят B1-v2: 220/220 строк, 156 товаров, 4 не-товара; development TP/FP/FN 17/0/0 остаётся provisional до human labels. |
| 3. AI extraction/matching | Завершён как эксперимент с отрицательным product-решением | Интеграция, live/replay и fail-closed проверки работают. B2 не принят по качеству; сохраняется B1-v2. Не продолжать подбор моделей без новой измеренной ошибки или отдельного требования. |
| 4. Generation/verifier | Human review принят; safety gate ещё закрыт | Offline replay успешен: controlled 12/12, generated sample 20/20, factual errors 0. Четыре unresolved non-atomic claims блокируют full-input; затем останутся отдельно разрешаемые full-input live/replay. |
| 5. UI и финальная оценка | Частично завершён | B1-каталог и B3 review UI поддерживают явные human decisions, issue-флаги, фильтр внимания и конечную 20-product выборку. Открыты full-input artifact, holdout, matching labels и итоговая передача. |
| 6. Модульная архитектура | Не начат | Начинать после короткого блока закрытия этапов 4–5, чтобы рефакторинг не менял baseline и evaluation одновременно. |

Итого: нельзя считать закрытыми все этапы кроме шестого. Закрыты инженерные результаты 1–3; этапы 4–5 имеют небольшой, но обязательный незавершённый блок.

## Состояние human review

Пользователь проверил через UI 120/158 generated claims, полностью завершив 28/37 опубликованных development-карточек и обязательную выборку 20/20. Отдельные 12 controlled cases также проверены пользователем и подтверждены без изменений; повторно проверять их не нужно. Канонический suite повышен до `human_verified`, а [development review replay](../reports/B3-openai-development-human-gate-v2/report.md) зафиксировал эти оценки без сетевых вызовов. Сам full-input safety gate остаётся закрыт из-за четырёх non-atomic claims.

Последний экспорт сохранён в [generated-review-e478435a3d39.json](../eval/generated-review-e478435a3d39.json). Файл имеет правильный `publicationHash`, статус `human_verified`, 120 явных `reviewed` и 38 `pending`; размечать остаток не требуется.

Девять обнаруженных расхождений разобраны по supplier feed. Все соответствующие факты поддержаны входными данными; четыре проблемы относятся к неатомарным span, две — к неясному copy. Они сохранены отдельными issue-флагами и rationale, а не как ложные factual errors. Интерфейс получил фильтр расхождений/issues и явное сравнение human/AI verdict.

## Следующий критический блок — до архитектурного рефакторинга

### P0.1. Human-review contract — выполнено по коду

Контракт `stage4-generated-review-v2` использует `pending/reviewed`, nullable `humanVerdict`, обязательный rationale и отдельные `non_atomic_claim`/`unclear_copy`. Model verdict не считается человеческим. Gate принимает полностью проверенную фиксированную выборку минимум из 20 карточек и сейчас сообщает claims 120/158, products 28/37, sample 20/20. `web:prepare --generated-checks` подключает каноническую разметку, не изменяя исторический run; legacy localStorage мигрируется по стабильным ключам и не затирает сохранённые reviewed-решения.

P0.1 завершён, дополнительная ручная разметка не нужна. Factual error и unresolved `non_atomic_claim` блокируют full-input gate; `unclear_copy` измеряется и раскрывается отдельно.

### P0.2. Закрыть этап 4 целиком

Human-review часть закрыта: replay получил `human_verified` для controlled и generated review. Офлайн-исправление подготовлено: verifier prompt v2 требует законченные смысловые spans, а локальный fail-closed валидатор отклоняет оборванные `is a`/`has a` и голые измерения. Помимо четырёх human-flagged claims аудит нашёл тот же паттерн в двух pending published claims и двух controlled spans; человеческие флаги задним числом не добавлялись. При новом publication hash `web:prepare --generated-checks` переносит только reviewed-решения с неизменившимися стабильными ключами, оставляя новые claims pending.

Development live разрешён и выполнен 2026-09-12: [B3-openai-development-atomic-v2-live-network](../reports/B3-openai-development-atomic-v2-live-network/report.md). Получено 88 calls, 158417 tokens, $2.619013, 0 errors/retries; один repair исправил лишний qualifier Nimbus. Controlled suite прошла 12/12, результат сохранил B1 `decisionsHash`, дал 37/39 ready и 0 запрещённых atomicity-паттернов среди 102 опубликованных claims. [Offline replay](../reports/B3-openai-development-atomic-v2-replay/report.md) дал 88 cache hits, 0 calls и тот же `publicationHash`; [сравнение](../reports/comparisons/B3-openai-development-atomic-v2-live-to-replay/comparison.md) подтверждает `decisionsEqual=true`, `publicationEqual=true` и отсутствие нарушений.

Открытый блокер — повторная human-проверка новой публикации. Новый live переформулировал 17/37 descriptions и пересегментировал claims с 158 до 102. Строгий перенос по неизменившимся `productId + attempt + claimId` сохранил лишь 3 reviewed decisions; в фиксированной выборке остаются pending 55/55 claims. Автоматически объявлять новые формулировки проверенными нельзя. Рекомендуемый следующий технический вариант — добавить verifier-only development rerun поверх замороженных старых draft texts, чтобы изолировать atomicity fix от повторной генерации; этот код и новый AI-запуск требуют отдельного решения пользователя. Альтернатива — вручную проверить 55 claims текущего live в UI.

Выполненная development live-команда:

```sh
npm run build
node dist/src/cli.js pipeline --baseline b3 --ai-mode live --ai-cache reports/B3-openai-development-atomic-v2-network-cache --ai-config config/stage4.openai.json --ai-cohort development --claim-checks eval/stage4-claims.json --out reports --run-id B3-openai-development-atomic-v2-live-network
```

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
- Не требовать от пользователя разметки оставшихся 38 claims: выборка 20/20 уже завершена.

## Когда переходить к архитектуре

Планировать структуру этапа 6 можно уже сейчас, но менять модули следует после P0.1–P0.3. Тогда B1 `decisionsHash`, B3 `publicationHash`, human-verified development и первый holdout станут characterization baseline для безопасного рефакторинга.

Первый архитектурный шаг после этого — выделить browser-safe artifact contracts и run storage, затем разделить `PipelineService` на B0/B1/B2/B3 use cases. Доменные правила и prompts во время переноса не менять.

## Стартовый запрос для нового чата

> Прочитай `docs/NEXT_STEPS.md`. Development atomic-v2 live/replay уже успешны, но новый generation оставил 55 pending claims обязательной выборки. Предложи и реализуй только выбранный мной путь: (а) verifier-only rerun поверх замороженных старых draft texts с отдельным разрешением на AI или (б) подготовка UI для ручной проверки текущих 55 claims. Full-input и holdout не запускать.
