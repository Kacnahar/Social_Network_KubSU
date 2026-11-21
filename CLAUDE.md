# Проект: анонимные голосовые комнаты для студентов (пилот)

Соцсеть для студентов КубГУ. Первая версия — только анонимные голосовые комнаты для знакомства. Название и логотип КубГУ не использовать нигде (код, тексты, названия пакетов) до разрешения вуза.

## Как общаться

- Управляющий — не программист. Отвечать **по-русски, простым языком**, без жаргона; термины пояснять.
- Все технические решения принимает Claude Code, но объясняет их и записывает в `docs/DECISIONS.md`.
- В конце каждой задачи — короткое резюме: что сделано, как проверить, что дальше.

## Деньги и лимиты

- **Никаких платных трат без согласования** (хостинг, домены, аккаунты, сервисы, платные API-кредиты).
- **Тяжёлую работу (субагенты, широкий веб-поиск) запускать только с разрешения.**
- Модель — Opus; рутину можно на Sonnet, если упираемся в лимит.

## Документация — источник правды

Перед работой читать нужный документ, после изменений — обновлять его в той же задаче.

- `docs/ARCHITECTURE.md` — части системы и как они связаны
- `docs/DATA_MODEL.md` — таблицы базы
- `docs/API.md` — запросы между приложением и сервером
- `docs/MODERATION_RULES.md` — пороги голосований и банов
- `docs/DECISIONS.md` — журнал решений (дописывать, не переписывать)
- `docs/OPEN_QUESTIONS.md` — что не решено; не решать молча за управляющего, а использовать значение «по умолчанию» и напоминать

## Стек

Монорепозиторий pnpm: `apps/mobile` (Expo + React Native + TypeScript, iOS/Android/веб), `apps/server` (Node.js + Fastify + TypeScript), `apps/admin`, `packages/shared` (общие типы, zod). PostgreSQL + Drizzle, Redis, LiveKit на своём сервере, WebSocket для событий. Всё серверное — на российском хостинге.

## Жёсткие правила (нарушать нельзя)

1. **Ник нельзя связать с аккаунтом ни в одном ответе сервера.** Наружу — только `personaId` и ник. `accountId` и почта не попадают в ответы, логи приложения, события метрик и LiveKit. Таблицу `persona_links` читает только модуль `identity`.
2. **Звук не записывается.** Компонент записи LiveKit (egress) не устанавливать, запись на клиенте не добавлять.
3. **Невзаимные отметки не видит никто** — ни API, ни админка, ни логи.
4. Не собирать ФИО, телефон, фото документов. Не подключать зарубежные облачные сервисы для данных пользователей.
5. Каждый просмотр связи «ник ↔ аккаунт» админом — с причиной и записью в журнал.
6. Секреты — только в переменных окружения; `.env` не коммитить.
7. Не делать функции вне текущего этапа (посты, группы, карта, перевод — после пилота).

## Этапы пилота

0) каркас → 1) вход по коду приглашения и почте, ник → 2) расписание и push → 3) голосовые комнаты → 4) модерация голосованием → 5) «ещё раз», раскрытие, чат → 6) метрики и админка → 7) закрытая бета → 8) запуск.

Текущий этап: **1 — вход по коду приглашения и почте, ник** (каркас завершён 2026-11-22).

## Команды

- `pnpm check` — проверка типов и все автотесты (то же запускает GitHub Actions)
- `pnpm dev:server` — сервер на http://localhost:3000
- `pnpm dev:web` — приложение в браузере на http://localhost:8081
- Пакеты Expo добавлять только через `pnpm exec expo install <пакет>` в `apps/mobile` (подбирает совместимые версии). Перед работой с API Expo сверяться с документацией версии SDK из `apps/mobile/package.json` — см. `apps/mobile/AGENTS.md`.
- Экраны приложения — в `apps/mobile/src/app/` (Expo Router), остальной код — рядом в `src/`.

## Качество

- К каждой функции — автотесты; все тесты зелёные перед завершением задачи.
- Автотест анонимности (нет `accountId`/почты в ответах) обязателен с этапа 1.
- Интерфейс проверять на вебе, iOS и Android, а не только сборкой.

## После каждой задачи

Запустить `/graphify .` (локально, без облака, без `--strict`), чтобы обновить карту проекта.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
