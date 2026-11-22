# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- Corpus is ~43,526 words - fits in a single context window. You may not need a graph.

## Summary
- 745 nodes · 1689 edges · 46 communities (39 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.86)
- Token cost: 0 input · 139,846 output

## Community Hubs (Navigation)
- Экраны приложения и навигация
- Зависимости приложения
- Зависимости сервера
- Вход и сессии на сервере
- Вход в комнату и баны
- Тесты сервера и приглашения
- Настройки приложения Expo
- Уведомления на сервере
- Настройки сервера
- Схема базы и мост identity
- Настройки TypeScript
- Фото, истории и модель данных
- Персона комнат и ник
- Общий пакет типов
- Клиент API ядра
- Общие форматы входа
- Автопроверка GitHub
- Клиент API комнат
- Уведомления в браузере
- Звук в браузере (LiveKit)
- План: ядро и модули соцсети
- Корневой пакет
- Роли и права
- Тесты анонимности и запуска
- Правила работы над проектом
- Сессия пользователя
- Сборка сервера
- Анонимность и админка
- Мост identity и путь в комнату
- Навык дизайна Apple
- Ошибки API
- Жёсткие правила проекта
- Аккаунт и приглашения
- Три личности человека
- TypeScript приложения
- Ядро и модули в коде
- Тесты расписания
- Настройки pnpm
- Юрист, вуз и безопасность
- Формат расписания
- Структура кода приложения
- Правила Expo
- Что не проверено
- Навык Graphify

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
- `Три личности: аккаунт, профиль, персона комнат` --semantically_similar_to--> `P18: три личности человека`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/DECISIONS.md
- `Деление кода на ядро и модули` --semantically_similar_to--> `Модуль пользуется ядром, ядро о модулях не знает`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/ARCHITECTURE.md
- `Структура репозитория (apps, packages, docs)` --semantically_similar_to--> `Структура репозитория: server, mobile, shared, admin`  [INFERRED] [semantically similar]
  README.md → docs/ARCHITECTURE.md
- `Матрица ролей и отказов (403 forbidden)` --implements--> `Роли: студент, преподаватель, гость`  [EXTRACTED]
  docs/API.md → CLAUDE.md
- `F10: статус «в сети» и утечка персоны` --references--> `Правило: ник комнат не связан с аккаунтом и профилем`  [INFERRED]
  docs/OPEN_QUESTIONS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Три личности человека** — claude_account, claude_profile, claude_rooms_persona [EXTRACTED 1.00]
- **Модули соцсети первой версии** — docs_architecture_rooms_module, docs_architecture_posts_module, docs_architecture_feed_module, docs_architecture_stories_module [EXTRACTED 1.00]
- **Очередь частей 1-4 соцсети** — docs_roadmap_step1_roles_profile, docs_roadmap_step2_posts, docs_roadmap_step3_feed, docs_roadmap_step4_stories [EXTRACTED 1.00]

## Communities (46 total, 7 thin omitted)

### Community 0 - "Экраны приложения и навигация"
Cohesion: 0.07
Nodes (80): dateFormat, HomeScreen(), Navigation(), RootLayout(), LoginScreen(), Mode, JoinState, Room() (+72 more)

### Community 1 - "Зависимости приложения"
Cohesion: 0.05
Nodes (50): dependencies, @app/shared@workspace:*, expo@~58.0.26, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-glass-effect@~58.0.5, expo-linear-gradient@~58.0.4, expo-linking@~58.0.17 (+42 more)

### Community 2 - "Зависимости сервера"
Cohesion: 0.06
Nodes (43): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+35 more)

### Community 3 - "Вход и сессии на сервере"
Cohesion: 0.13
Nodes (33): getAccountStanding(), AuthDeps, authenticate(), endSession(), findUsableInviteId(), inviteIsUsable(), Session, startLogin() (+25 more)

### Community 4 - "Вход в комнату и баны"
Cohesion: 0.13
Nodes (22): isBanned(), joinSlot(), leaveRoom(), pickRoom(), Room, RoomDeps, roomNotOpen(), voiceUnavailable() (+14 more)

### Community 5 - "Тесты сервера и приглашения"
Cohesion: 0.15
Nodes (13): loadConfig(), createInviteCode(), PushGateway, PushTarget, createDb(), inviteCodes, CapturingMailer, CapturingPush (+5 more)

### Community 6 - "Настройки приложения Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 7 - "Уведомления на сервере"
Cohesion: 0.14
Nodes (17): ALLOWED_PUSH_HOSTS, BroadcastDeps, broadcastPush(), createWebPushGateway(), isAllowedPushEndpoint(), Db, pushSubscriptions, closeFinishedRooms() (+9 more)

### Community 8 - "Настройки сервера"
Cohesion: 0.13
Nodes (14): Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, VapidConfig, VoiceConfig, generateVapidKeys(), DbHandle (+6 more)

### Community 9 - "Схема базы и мост identity"
Cohesion: 0.17
Nodes (13): AccountStanding, DbOrTx, personaLinks, id(), time(), accounts, emailLoginCodes, personas (+5 more)

### Community 10 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 11 - "Фото, истории и модель данных"
Cohesion: 0.10
Nodes (17): API фото /v1/media, API модерации комнат (голосования, заглушка, жалобы), API историй /v1/stories, Хранилище и обработка фото, Таблица media_files, Таблицы модуля историй, Автобан: 3 выгона за 7 дней, Модерация записей соцсети не решена (+9 more)

### Community 12 - "Персона комнат и ник"
Cohesion: 0.22
Nodes (16): isUniqueViolation(), changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), checkNickname() (+8 more)

### Community 13 - "Общий пакет типов"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 14 - "Клиент API ядра"
Cohesion: 0.17
Nodes (12): API_URL, RequestOptions, API_PREFIX, HealthResponse, healthResponseSchema, PushConfigResponse, pushConfigResponseSchema, pushMessageSchema (+4 more)

### Community 15 - "Общие форматы входа"
Cohesion: 0.12
Nodes (14): AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse, authStartResponseSchema, AuthVerifyRequest, authVerifyRequestSchema (+6 more)

### Community 16 - "Автопроверка GitHub"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 17 - "Клиент API комнат"
Cohesion: 0.23
Nodes (11): getPersona(), getSlots(), joinRoom(), leaveRoom(), setNickname(), getAccount(), request(), RoomPersonaResponse (+3 more)

### Community 18 - "Уведомления в браузере"
Cohesion: 0.26
Nodes (12): fetchHealth(), getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush() (+4 more)

### Community 19 - "Звук в браузере (LiveKit)"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 20 - "План: ядро и модули соцсети"
Cohesion: 0.19
Nodes (13): Где мы сейчас: части 0-4, Документация — источник правды, Ядро соцсети, Модуль «Лента», Модуль «Посты», Модуль «Голосовые комнаты», Модуль «Истории», Решения по голосовым комнатам (T41-T49) (+5 more)

### Community 21 - "Корневой пакет"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 22 - "Роли и права"
Cohesion: 0.15
Nodes (11): Роли: студент, преподаватель, гость, Автотесты ролей, API ленты /v1/feed, API постов /v1/posts, API профиля /v1/profile, Будущие модули: друзья, сообщения, группы, новости, Таблицы модуля постов, Таблица profiles (+3 more)

### Community 23 - "Тесты анонимности и запуска"
Cohesion: 0.20
Nodes (3): sourceFiles(), serverDir, sessions

### Community 24 - "Правила работы над проектом"
Cohesion: 0.18
Nodes (9): Дизайн Apple «жидкое стекло», Команды разработки и тестовые данные, graphify — карта проекта, Работа с помощниками (Sonnet), Главный экран: истории, кнопка войса, лента, Orb / RoomEntry — круглая кнопка входа, Студенческая соцсеть (проект), F1: название соцсети (+1 more)

### Community 25 - "Сессия пользователя"
Cohesion: 0.31
Nodes (9): logout(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState, clearToken(), loadToken() (+1 more)

### Community 26 - "Сборка сервера"
Cohesion: 0.27
Nodes (6): AppDeps, buildApp(), errorBody(), NOW, START, createLiveKitGateway()

### Community 27 - "Анонимность и админка"
Cohesion: 0.20
Nodes (10): Автотест анонимности (anonymity.test.ts), Админка /v1/admin, Общие правила API (без accountId и почты), API «Ещё раз» и раскрытия, Косвенные утечки персоны, Таблицы room_marks, matches, reveals, Журнал и связь с админами, F10: статус «в сети» и утечка персоны (+2 more)

### Community 28 - "Мост identity и путь в комнату"
Cohesion: 0.22
Nodes (10): core/identity (единственный читатель моста), persona_links (мост аккаунт-персона), Путь вошёл → кнопка → в комнате, API уведомлений /v1/push, Матрица ролей и отказов (403 forbidden), API комнат /v1/rooms, Как модуль комнат не выдаёт человека, Путь пользователя (+2 more)

### Community 29 - "Навык дизайна Apple"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 30 - "Ошибки API"
Cohesion: 0.22
Nodes (6): ApiError, networkError(), ERROR_CODES, ErrorCode, ErrorResponse, errorResponseSchema

### Community 31 - "Жёсткие правила проекта"
Cohesion: 0.22
Nodes (6): Жёсткие правила проекта, Правило: удаление аккаунта удаляет всё, Голос: LiveKit только звук, без записи, Схема системы: клиент, сервер, LiveKit, PostgreSQL, Сроки хранения данных, Правила записей: посты, истории, удаление

### Community 32 - "Аккаунт и приглашения"
Cohesion: 0.22
Nodes (7): API аккаунта /v1/account, API входа /v1/auth, Два режима auth/start: регистрация и вход, Таблица accounts, Таблица invite_codes (с ролью), Группы таблиц: core.ts, rooms.ts, bridge.ts, Таблицы sessions и email_login_codes

### Community 33 - "Три личности человека"
Cohesion: 0.25
Nodes (4): Аккаунт (закрытый), Профиль соцсети (открытый), Персона комнат (анонимный ник), Три личности: аккаунт, профиль, персона комнат

### Community 34 - "TypeScript приложения"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 35 - "Ядро и модули в коде"
Cohesion: 0.29
Nodes (4): Деление кода на ядро и модули, Стек: pnpm, PostgreSQL, Drizzle, LiveKit, Структура репозитория: server, mobile, shared, admin, Структура репозитория (apps, packages, docs)

### Community 36 - "Тесты расписания"
Cohesion: 0.40
Nodes (4): ScheduleConfig, NOW, schedule, slotsResponseSchema

### Community 37 - "Настройки pnpm"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 38 - "Юрист, вуз и безопасность"
Cohesion: 0.67
Nodes (3): Безопасность и данные, Вопросы к юристу (C1-C12), Вопросы к вузу (B1-B8)

## Knowledge Gaps
- **45 isolated node(s):** `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости`, `Материалы и глубина (translucency)`, `Типографика: tracking и leading` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 240 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Экраны приложения и навигация` to `Зависимости приложения`, `Звук в браузере (LiveKit)`, `Сессия пользователя`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Экраны приложения и навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.07379921665635951 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Схема базы и мост identity` to `Зависимости сервера`, `Вход и сессии на сервере`, `Вход в комнату и баны`, `Тесты сервера и приглашения`, `Тесты расписания`, `Уведомления на сервере`, `Настройки сервера`, `Персона комнат и ник`, `Сборка сервера`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `Зависимости приложения` be split into smaller, more focused modules?**
  _Cohesion score 0.05254901960784314 - nodes in this community are weakly interconnected._
- **Why does `expo-router` connect `Экраны приложения и навигация` to `Зависимости приложения`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Зависимости сервера` be split into smaller, more focused modules?**
  _Cohesion score 0.0595959595959596 - nodes in this community are weakly interconnected._