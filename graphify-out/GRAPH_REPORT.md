# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 36 files · ~7,649 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 310 nodes · 349 edges · 16 communities (15 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `006bc7f2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Зона аккаунта (не видна никому, кроме сервера и админов)
- Открытые вопросы
- Проект: анонимные голосовые комнаты для студентов (пилот)
- API
- mobile/package.json
- index.tsx
- server/package.json
- expo
- compilerOptions
- .claude/CLAUDE.md
- shared/package.json
- steps
- scripts
- mobile/tsconfig.json
- AGENTS.md
- pnpm-workspace.yaml

## God Nodes (most connected - your core abstractions)
1. `expo` - 13 edges
2. `compilerOptions` - 11 edges
3. `Проект: анонимные голосовые комнаты для студентов (пилот)` - 11 edges
4. `Архитектура` - 10 edges
5. `Правила модерации` - 10 edges
6. `API` - 9 edges
7. `Модель данных` - 8 edges
8. `Зона аккаунта (не видна никому, кроме сервера и админов)` - 8 edges
9. `scripts` - 7 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- `HomeScreen()` --calls--> `fetchHealth()`  [EXTRACTED]
  apps/mobile/src/app/index.tsx → apps/mobile/src/lib/api.ts

## Import Cycles
- None detected.

## Communities (16 total, 1 thin omitted)

### Community 0 - "Зона аккаунта (не видна никому, кроме сервера и админов)"
Cohesion: 0.06
Nodes (31): account_sanctions — санкции по аккаунту, accounts — аккаунт, admin_audit_log — журнал действий админов, admins — админы, chat_messages — сообщения чата, email_login_codes — одноразовые коды входа, events — события для метрик, invite_codes — коды приглашений (+23 more)

### Community 1 - "Открытые вопросы"
Cohesion: 0.08
Nodes (21): 1. Что строим, 2. Схема, 3. Части системы, 4. Структура репозитория, 5. Как устроена анонимность, 6. Основной сценарий, 7. Голос, 8. Безопасность и данные (+13 more)

### Community 2 - "Проект: анонимные голосовые комнаты для студентов (пилот)"
Cohesion: 0.12
Nodes (15): graphify, Деньги и лимиты, Документация — источник правды, Жёсткие правила (нарушать нельзя), Как общаться, Качество, Команды, После каждой задачи (+7 more)

### Community 3 - "API"
Cohesion: 0.10
Nodes (19): API, Общие правила, События в реальном времени (WebSocket `/v1/ws`), Этап 1 — вход и ник, Этап 2 — расписание и push, Этап 3 — голосовые комнаты, Этап 4 — модерация, Этап 5 — «ещё раз», раскрытие, чат (+11 more)

### Community 4 - "mobile/package.json"
Cohesion: 0.06
Nodes (43): dependencies, expo@~58.0.26, expo-constants@~58.0.16, expo-linking@~58.0.17, expo-router@~58.0.32, expo-status-bar@~58.0.5, react@19.3.0, react-dom@19.3.0 (+35 more)

### Community 5 - "index.tsx"
Cohesion: 0.12
Nodes (16): HomeScreen(), palette, ServerState, STATUS_COLOR, styles, API_URL, fetchHealth(), buildApp() (+8 more)

### Community 6 - "server/package.json"
Cohesion: 0.09
Nodes (26): dependencies, fastify@^5.0.0, @fastify/cors@^11.0.0, @rooms/shared@workspace:*, zod@^4.0.0, devDependencies, tsx@^4.0.0, @types/node@^22.0.0 (+18 more)

### Community 7 - "expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 10 - "shared/package.json"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 11 - "steps"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 12 - "scripts"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 13 - "mobile/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 14 - "AGENTS.md"
Cohesion: 0.33
Nodes (5): Building with EAS, Commands, Expo has changed — do not trust your training data, Navigation & Routing, Rules

### Community 15 - "pnpm-workspace.yaml"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 178 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fastify` connect `index.tsx` to `server/package.json`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Зона аккаунта (не видна никому, кроме сервера и админов)` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Why does `react` connect `mobile/package.json` to `index.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Открытые вопросы` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `mobile/package.json` to `index.tsx`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `Проект: анонимные голосовые комнаты для студентов (пилот)` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._