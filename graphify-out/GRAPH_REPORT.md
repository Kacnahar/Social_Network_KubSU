# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 100 files · ~38,292 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 724 nodes · 1602 edges · 34 communities (32 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e01308af`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Зона аккаунта (не видна никому, кроме сервера и админов)
- Открытые вопросы
- Проект: анонимные голосовые комнаты для студентов (пилот)
- Apple Design
- mobile/package.json
- api.ts
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
- testing.ts
- app.ts
- session.tsx
- me/service.ts
- schema.ts
- rooms/service.ts
- push/service.ts
- request
- voice.web.ts
- ref_vitest
- reminders.test.ts
- session.tsx
- push.web.ts
- schedule/service.ts
- schedule.ts
- VoiceGateway
- ref_zod

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 24 edges
2. `buildApp()` - 22 edges
3. `Body()` - 21 edges
4. `Button()` - 21 edges
5. `Apple Design` - 21 edges
6. `ApiError` - 18 edges
7. `react` - 17 edges
8. `Room()` - 17 edges
9. `request()` - 17 edges
10. `Card()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Команды` --references--> `createTestContext()`  [INFERRED]
  CLAUDE.md → apps/server/src/testing.ts
- `Дизайн` --references--> `Orb()`  [INFERRED]
  CLAUDE.md → apps/mobile/src/ui/Orb.tsx
- `Дизайн` --references--> `Screen()`  [INFERRED]
  CLAUDE.md → apps/mobile/src/ui/components.tsx
- `Дизайн` --references--> `Title()`  [INFERRED]
  CLAUDE.md → apps/mobile/src/ui/components.tsx
- `Дизайн` --references--> `Body()`  [INFERRED]
  CLAUDE.md → apps/mobile/src/ui/components.tsx

## Import Cycles
- None detected.

## Communities (34 total, 2 thin omitted)

### Community 0 - "Зона аккаунта (не видна никому, кроме сервера и админов)"
Cohesion: 0.06
Nodes (32): account_sanctions — санкции по аккаунту, accounts — аккаунт, admin_audit_log — журнал действий админов, admins — админы, chat_messages — сообщения чата, email_login_codes — одноразовые коды входа, events — события для метрик, invite_codes — коды приглашений (+24 more)

### Community 1 - "Открытые вопросы"
Cohesion: 0.04
Nodes (44): API, Общие правила, События в реальном времени (WebSocket `/v1/ws`), Этап 1 — вход и ник, Этап 2 — расписание и push, Этап 3 — голосовые комнаты, Этап 4 — модерация, Этап 5 — «ещё раз», раскрытие, чат (+36 more)

### Community 2 - "Проект: анонимные голосовые комнаты для студентов (пилот)"
Cohesion: 0.11
Nodes (17): graphify, Деньги и лимиты, Документация — источник правды, Жёсткие правила (нарушать нельзя), Как общаться, Качество, Команды, После каждой задачи (+9 more)

### Community 3 - "Apple Design"
Cohesion: 0.09
Nodes (21): 10. Gesture design details (the "feel" checklist), 11. Frame-level smoothness, 12. Materials & depth — translucency conveys hierarchy, 13. Multimodal feedback — motion + sound + haptics, 14. Reduced motion & accessibility, 15. Typography — optical sizing, tracking, leading, 16. Design foundations — the eight principles, 17. Process (+13 more)

### Community 4 - "mobile/package.json"
Cohesion: 0.05
Nodes (50): dependencies, expo@~58.0.26, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-glass-effect@~58.0.5, expo-linear-gradient@~58.0.4, expo-linking@~58.0.17, expo-router@~58.0.32 (+42 more)

### Community 5 - "api.ts"
Cohesion: 0.13
Nodes (19): API_URL, RequestOptions, AccountResponse, accountResponseSchema, AuthStartRequest, AuthStartResponse, authStartResponseSchema, AuthVerifyRequest (+11 more)

### Community 6 - "server/package.json"
Cohesion: 0.06
Nodes (44): dependencies, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1, pg@^8.23.1 (+36 more)

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

### Community 16 - "testing.ts"
Cohesion: 0.19
Nodes (12): Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, loadConfig(), PushGateway, PushTarget, CapturingMailer (+4 more)

### Community 17 - "app.ts"
Cohesion: 0.09
Nodes (44): AppDeps, buildApp(), errorBody(), idParam, AuthDeps, authenticate(), endSession(), findUsableInviteId() (+36 more)

### Community 18 - "session.tsx"
Cohesion: 0.08
Nodes (78): dateFormat, HomeScreen(), Navigation(), RootLayout(), LoginScreen(), Mode, NicknameScreen(), JoinState (+70 more)

### Community 19 - "me/service.ts"
Cohesion: 0.21
Nodes (17): isUniqueViolation(), changeAvailableAt(), getMe(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), authStartRequestSchema (+9 more)

### Community 20 - "schema.ts"
Cohesion: 0.17
Nodes (10): createDb(), DbHandle, DbOptions, DbOrTx, migrationsFolder, Tx, inviteCodes, createInviteCode() (+2 more)

### Community 22 - "rooms/service.ts"
Cohesion: 0.14
Nodes (13): VoiceConfig, personas, roomParticipations, rooms, NOW, START, Room, RoomDeps (+5 more)

### Community 23 - "push/service.ts"
Cohesion: 0.20
Nodes (13): VapidConfig, Db, JobDeps, startBackgroundJobs(), config, loadDevVapid(), mailer, vapid (+5 more)

### Community 24 - "request"
Cohesion: 0.21
Nodes (12): ApiError, authVerify(), fetchHealth(), getAccount(), getSlots(), joinRoom(), leaveRoom(), networkError() (+4 more)

### Community 25 - "voice.web.ts"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 26 - "ref_vitest"
Cohesion: 0.18
Nodes (3): sourceFiles(), serverDir, accounts

### Community 27 - "reminders.test.ts"
Cohesion: 0.19
Nodes (11): pushSubscriptions, slotReminders, isAllowedPushEndpoint(), keys, NOW, START, activeTargets(), ReminderDeps (+3 more)

### Community 28 - "session.tsx"
Cohesion: 0.29
Nodes (10): getMe(), logout(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState, clearToken() (+2 more)

### Community 29 - "push.web.ts"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 30 - "schedule/service.ts"
Cohesion: 0.27
Nodes (9): ScheduleConfig, slots, NOW, schedule, ensureDevLiveSlot(), isJoinable(), listUpcomingSlots(), slotEndsAt() (+1 more)

### Community 31 - "schedule.ts"
Cohesion: 0.18
Nodes (10): PushConfigResponse, pushConfigResponseSchema, pushMessageSchema, PushSubscribeRequest, pushSubscribeRequestSchema, PushUnsubscribeRequest, pushUnsubscribeRequestSchema, slotSchema (+2 more)

### Community 32 - "VoiceGateway"
Cohesion: 0.22
Nodes (3): pickRoom(), FakeVoice, VoiceGateway

### Community 33 - "ref_zod"
Cohesion: 0.40
Nodes (3): API_PREFIX, HealthResponse, healthResponseSchema

## Knowledge Gaps
- **1 isolated node(s):** `expo/tsconfig.base`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 287 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `session.tsx` to `request`, `voice.web.ts`, `mobile/package.json`, `session.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Зона аккаунта (не видна никому, кроме сервера и админов)` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `schema.ts` to `server/package.json`, `app.ts`, `me/service.ts`, `rooms/service.ts`, `push/service.ts`, `reminders.test.ts`, `schedule/service.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `Открытые вопросы` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Why does `Проект: анонимные голосовые комнаты для студентов (пилот)` connect `Проект: анонимные голосовые комнаты для студентов (пилот)` to `session.tsx`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `Проект: анонимные голосовые комнаты для студентов (пилот)` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._