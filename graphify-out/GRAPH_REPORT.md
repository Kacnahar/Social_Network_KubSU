# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- Corpus is ~40,307 words - fits in a single context window. You may not need a graph.

## Summary
- 698 nodes · 1663 edges · 39 communities (33 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.86)
- Token cost: 0 input · 137,722 output

## Community Hubs (Navigation)
- Экраны приложения и навигация
- Сборка сервера и вход
- Зависимости приложения
- Зависимости сервера
- Персона комнат и ник
- Тесты сервера и приглашения
- Настройки приложения Expo
- Клиент API ядра
- Схема базы и мост identity
- Настройки сервера и база
- Вход в комнату и баны
- Настройки TypeScript
- Архитектура: ядро и модули
- Общий пакет типов
- Автопроверка GitHub
- Навык дизайна Apple
- Уведомления в браузере
- Клиент API комнат
- Звук в браузере (LiveKit)
- Корневой пакет
- Коды ошибок
- Тесты анонимности и запуска
- Сессия пользователя
- Фоновые задачи и напоминания
- Правила анонимности
- Открытые вопросы
- Модель данных
- TypeScript приложения
- Документ API
- Правила модерации
- План работ по комнатам
- Общие форматы комнат
- Настройки pnpm
- Подмена сервера звука в тестах
- Правила Graphify
- Правила Expo
- Работа с помощниками

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 24 edges
2. `Body()` - 20 edges
3. `Button()` - 20 edges
4. `drizzle-orm` - 20 edges
5. `ApiError` - 19 edges
6. `request()` - 18 edges
7. `react` - 17 edges
8. `Room()` - 17 edges
9. `HomeScreen()` - 16 edges
10. `Card()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Звук не записывается (без egress)` --semantically_similar_to--> `LiveKit (голос, без записи)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/ARCHITECTURE.md
- `Материалы и глубина (translucency)` --semantically_similar_to--> `Правила дизайна (Apple, жидкое стекло)`  [INFERRED] [semantically similar]
  .claude/skills/apple-design/SKILL.md → CLAUDE.md
- `Деление на ядро и модули` --semantically_similar_to--> `Структура кода приложения (lib, ui, features)`  [INFERRED] [semantically similar]
  CLAUDE.md → apps/mobile/AGENTS.md
- `Деление на ядро и модули` --semantically_similar_to--> `T50: ядро и модули в коде`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/DECISIONS.md
- `Три личности человека` --semantically_similar_to--> `Персона комнат (анонимный ник)`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Три личности: аккаунт, профиль, персона и мост persona_links** — claude_account, claude_social_profile, claude_rooms_persona, claude_persona_links [EXTRACTED 1.00]
- **Система модерации комнат** — docs_moderation_rules_kick_vote, docs_moderation_rules_mute_vote, docs_moderation_rules_personal_mute, docs_moderation_rules_autoban [EXTRACTED 1.00]
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]

## Communities (39 total, 6 thin omitted)

### Community 0 - "Экраны приложения и навигация"
Cohesion: 0.08
Nodes (78): dateFormat, HomeScreen(), Navigation(), RootLayout(), LoginScreen(), Mode, JoinState, Room() (+70 more)

### Community 1 - "Сборка сервера и вход"
Cohesion: 0.07
Nodes (52): AppDeps, errorBody(), Config, AuthDeps, authenticate(), endSession(), findUsableInviteId(), inviteIsUsable() (+44 more)

### Community 2 - "Зависимости приложения"
Cohesion: 0.05
Nodes (50): dependencies, @app/shared@workspace:*, expo@~58.0.26, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-glass-effect@~58.0.5, expo-linear-gradient@~58.0.4, expo-linking@~58.0.17 (+42 more)

### Community 3 - "Зависимости сервера"
Cohesion: 0.06
Nodes (43): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+35 more)

### Community 4 - "Персона комнат и ник"
Cohesion: 0.13
Nodes (26): getPersonaIdForAccount(), isUniqueViolation(), leaveRoom(), changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname() (+18 more)

### Community 5 - "Тесты сервера и приглашения"
Cohesion: 0.17
Nodes (15): buildApp(), loadConfig(), ScheduleConfig, createInviteCode(), createDb(), inviteCodes, NOW, START (+7 more)

### Community 6 - "Настройки приложения Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 7 - "Клиент API ядра"
Cohesion: 0.11
Nodes (19): API_URL, RequestOptions, AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse, authStartResponseSchema (+11 more)

### Community 8 - "Схема базы и мост identity"
Cohesion: 0.17
Nodes (14): personaLinks, id(), time(), accounts, emailLoginCodes, pushSubscriptions, personas, roomParticipations (+6 more)

### Community 9 - "Настройки сервера и база"
Cohesion: 0.12
Nodes (14): DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, VapidConfig, VoiceConfig, DbHandle, DbOptions, DbOrTx (+6 more)

### Community 10 - "Вход в комнату и баны"
Cohesion: 0.18
Nodes (14): AccountStanding, getAccountStanding(), isBanned(), joinSlot(), pickRoom(), Room, RoomDeps, roomNotOpen() (+6 more)

### Community 11 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 12 - "Архитектура: ядро и модули"
Cohesion: 0.15
Nodes (15): Структура кода приложения (lib, ui, features), Исключение: загрузка персоны в session.tsx, Студенческая соцсеть (проект), Архитектура (документ), LiveKit (голос, без записи), Структура репозитория, Части системы (Expo, Fastify, PostgreSQL, LiveKit, push), Журнал решений (документ) (+7 more)

### Community 13 - "Общий пакет типов"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 14 - "Автопроверка GitHub"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 15 - "Навык дизайна Apple"
Cohesion: 0.14
Nodes (13): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+5 more)

### Community 16 - "Уведомления в браузере"
Cohesion: 0.26
Nodes (12): fetchHealth(), getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush() (+4 more)

### Community 17 - "Клиент API комнат"
Cohesion: 0.29
Nodes (10): getPersona(), getSlots(), joinRoom(), leaveRoom(), setNickname(), useSlots(), ApiError, getAccount() (+2 more)

### Community 18 - "Звук в браузере (LiveKit)"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 19 - "Корневой пакет"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 20 - "Коды ошибок"
Cohesion: 0.17
Nodes (7): ERROR_CODES, ErrorCode, ErrorResponse, errorResponseSchema, Slot, slotSchema, SlotsResponse

### Community 21 - "Тесты анонимности и запуска"
Cohesion: 0.20
Nodes (3): sourceFiles(), serverDir, sessions

### Community 22 - "Сессия пользователя"
Cohesion: 0.31
Nodes (9): logout(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState, clearToken(), loadToken() (+1 more)

### Community 23 - "Фоновые задачи и напоминания"
Cohesion: 0.27
Nodes (9): broadcastPush(), slotReminders, closeFinishedRooms(), JobDeps, startBackgroundJobs(), ReminderDeps, REMINDERS, runReminderTick() (+1 more)

### Community 24 - "Правила анонимности"
Cohesion: 0.22
Nodes (7): Аккаунт (закрытый), core/identity, persona_links (мост аккаунт-персона), Персона комнат (анонимный ник), Профиль соцсети (открытый), Три личности человека, Таблица persona_links

### Community 25 - "Открытые вопросы"
Cohesion: 0.25
Nodes (8): Косвенные утечки персоны, F1: название соцсети, F10: статус «в сети» и утечка персоны, F7: нужен ли отдельный чат комнат, Вопросы к юристу (C1-C10), Открытые вопросы (документ), Технические вопросы с тратами (D1-D7), Модуль 2.6 Сообщения

### Community 26 - "Модель данных"
Cohesion: 0.29
Nodes (7): API аккаунта /v1/account, Таблица accounts, Модель данных (документ), Таблица profiles (позже), Сроки хранения данных, Таблицы комнат (slots, rooms, participations), Модуль 2.1 Профиль и оболочка

### Community 27 - "TypeScript приложения"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 28 - "Документ API"
Cohesion: 0.33
Nodes (7): API админки /v1/admin (позже), API (документ), API входа /v1/auth, Путь «вошёл → кнопка → в комнате», API уведомлений /v1/push, API комнат /v1/rooms, Таблица room_personas

### Community 29 - "Правила модерации"
Cohesion: 0.47
Nodes (6): Автоматический бан (3 комнаты за 7 дней), Голосование «Выгнать на 24 часа», Правила модерации (документ), Голосование «Выключить микрофон», Заглушить для себя, Известные слабые места модерации (сговор)

### Community 30 - "План работ по комнатам"
Cohesion: 0.40
Nodes (5): Таблица room_marks (тайные отметки), F5: что открывается на ступенях раскрытия, Задача 1.1 Модерация голосованием, Часть 1: довести ядро и комнаты до пилота, Задача 1.2 «Ещё раз» и раскрытие

### Community 31 - "Общие форматы комнат"
Cohesion: 0.40
Nodes (4): JoinRoomResponse, joinRoomResponseSchema, ROOM_CAPACITY, ROOM_JOIN_EARLY_MINUTES

### Community 32 - "Настройки pnpm"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

## Knowledge Gaps
- **25 isolated node(s):** `expo/tsconfig.base`, `Аккаунт (закрытый)`, `Профиль соцсети (открытый)`, `ui/components.tsx и theme.ts`, `Работа с помощниками (Sonnet)` (+20 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 211 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Правило анонимности ника комнат` connect `Правила анонимности` to `Открытые вопросы`, `Тесты анонимности и запуска`?**
  _High betweenness centrality (0.165) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Аккаунт (закрытый)`, `Профиль соцсети (открытый)` to the rest of the system?**
  _25 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Экраны приложения и навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.07631578947368421 - nodes in this community are weakly interconnected._
- **Why does `Проверки безопасности комнат для каждого модуля` connect `Открытые вопросы` to `Правила анонимности`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Сборка сервера и вход` be split into smaller, more focused modules?**
  _Cohesion score 0.07086247086247087 - nodes in this community are weakly interconnected._
- **Should `Зависимости приложения` be split into smaller, more focused modules?**
  _Cohesion score 0.05254901960784314 - nodes in this community are weakly interconnected._
- **Should `Зависимости сервера` be split into smaller, more focused modules?**
  _Cohesion score 0.0595959595959596 - nodes in this community are weakly interconnected._