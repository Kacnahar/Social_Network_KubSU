# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 65 files · ~17,643 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 496 nodes · 933 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9d5beb3c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Зона аккаунта (не видна никому, кроме сервера и админов)
- Открытые вопросы
- Проект: анонимные голосовые комнаты для студентов (пилот)
- API
- mobile/package.json
- app.ts
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
- client.ts
- auth/service.ts
- session.tsx

## God Nodes (most connected - your core abstractions)
1. `buildApp()` - 14 edges
2. `verifyLogin()` - 14 edges
3. `expo` - 13 edges
4. `useSession()` - 12 edges
5. `Screen()` - 12 edges
6. `Title()` - 12 edges
7. `Body()` - 12 edges
8. `Button()` - 12 edges
9. `setNickname()` - 12 edges
10. `createTestContext()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Команды` --references--> `createTestContext()`  [INFERRED]
  CLAUDE.md → apps/server/src/testing.ts
- `NicknameScreen()` --calls--> `checkNickname()`  [EXTRACTED]
  apps/mobile/src/app/nickname.tsx → packages/shared/src/nickname.ts
- `findUsableInviteId()` --calls--> `normalizeInviteCode()`  [EXTRACTED]
  apps/server/src/auth/service.ts → packages/shared/src/auth.ts
- `createInviteCode()` --calls--> `normalizeInviteCode()`  [EXTRACTED]
  apps/server/src/invites.ts → packages/shared/src/auth.ts
- `setNickname()` --calls--> `checkNickname()`  [EXTRACTED]
  apps/server/src/me/service.ts → packages/shared/src/nickname.ts

## Import Cycles
- None detected.

## Communities (19 total, 1 thin omitted)

### Community 0 - "Зона аккаунта (не видна никому, кроме сервера и админов)"
Cohesion: 0.06
Nodes (31): account_sanctions — санкции по аккаунту, accounts — аккаунт, admin_audit_log — журнал действий админов, admins — админы, chat_messages — сообщения чата, email_login_codes — одноразовые коды входа, events — события для метрик, invite_codes — коды приглашений (+23 more)

### Community 1 - "Открытые вопросы"
Cohesion: 0.08
Nodes (22): 1. Что строим, 2. Схема, 3. Части системы, 4. Структура репозитория, 5. Как устроена анонимность, 6. Основной сценарий, 7. Голос, 8. Безопасность и данные (+14 more)

### Community 2 - "Проект: анонимные голосовые комнаты для студентов (пилот)"
Cohesion: 0.11
Nodes (16): graphify, Деньги и лимиты, Документация — источник правды, Жёсткие правила (нарушать нельзя), Как общаться, Качество, Команды, После каждой задачи (+8 more)

### Community 3 - "API"
Cohesion: 0.10
Nodes (19): API, Общие правила, События в реальном времени (WebSocket `/v1/ws`), Этап 1 — вход и ник, Этап 2 — расписание и push, Этап 3 — голосовые комнаты, Этап 4 — модерация, Этап 5 — «ещё раз», раскрытие, чат (+11 more)

### Community 4 - "mobile/package.json"
Cohesion: 0.06
Nodes (41): dependencies, expo@~58.0.26, expo-constants@~58.0.16, expo-linking@~58.0.17, expo-router@~58.0.32, expo-secure-store@~58.0.3, expo-status-bar@~58.0.5, react@19.3.0 (+33 more)

### Community 5 - "app.ts"
Cohesion: 0.07
Nodes (40): API_URL, ApiError, authVerify(), deleteAccount(), fetchHealth(), getAccount(), getMe(), logout() (+32 more)

### Community 6 - "server/package.json"
Cohesion: 0.07
Nodes (37): dependencies, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, pg@^8.23.1, @rooms/shared@workspace:*, zod@^4.0.0 (+29 more)

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

### Community 16 - "client.ts"
Cohesion: 0.07
Nodes (28): drizzle-orm@^0.45.4, sourceFiles(), Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, loadConfig(), decryptEmail() (+20 more)

### Community 17 - "auth/service.ts"
Cohesion: 0.10
Nodes (43): buildApp(), authenticate(), endSession(), findUsableInviteId(), inviteIsUsable(), Session, startLogin(), verifyLogin() (+35 more)

### Community 18 - "session.tsx"
Cohesion: 0.15
Nodes (37): react-native@0.88.1, dateFormat, HomeScreen(), Navigation(), RootLayout(), LoginScreen(), Mode, NicknameScreen() (+29 more)

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 210 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createTestContext()` connect `client.ts` to `auth/service.ts`, `Проект: анонимные голосовые комнаты для студентов (пилот)`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Зона аккаунта (не видна никому, кроме сервера и админов)` be split into smaller, more focused modules?**
  _Cohesion score 0.0625 - nodes in this community are weakly interconnected._
- **Why does `react` connect `session.tsx` to `mobile/package.json`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Открытые вопросы` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `client.ts` to `auth/service.ts`, `app.ts`, `server/package.json`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Проект: анонимные голосовые комнаты для студентов (пилот)` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._