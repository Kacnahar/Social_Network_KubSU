# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 182 files · ~79,585 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 1289 nodes · 3598 edges · 76 communities (62 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 560,684 output

## Graph Freshness
- Built from commit: `fe51aa66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useColors
- Сервер постов и таблицы
- core/routes.ts
- dependencies
- Зависимости сервера
- entry/service.ts
- push/service.ts
- DiskMediaStorage
- Тесты входа и приглашения
- auth.ts
- Настройки приложения Expo
- Структура кода приложения
- client.ts
- moderation/service.ts
- Настройки TypeScript
- Жёсткие правила и анонимность
- Модули соцсети
- request
- Аккаунт и коды приглашения
- Персона комнат и ник
- Общий пакет типов
- Админка и журнал
- StoryViewer.tsx
- Автопроверка GitHub
- Форматы профиля
- Звук в браузере (LiveKit)
- lib/api.test.ts
- Корневой пакет
- Уведомления в браузере
- Три личности человека
- Текущий этап и документы
- moderation.ts
- Вход по коду из письма
- Навык дизайна Apple
- Ядро и модули
- Форматы уведомлений
- TypeScript приложения
- RoomEntry.tsx
- FeedList.tsx
- Правила Expo
- Хранение фото и траты
- Модерация комнат
- Настройки pnpm
- Уведомления и безопасность
- Дизайн Apple
- Навык Graphify
- Карта проекта Graphify
- Работа с помощниками
- Помощник тестов сервера
- Будущие модули
- Структура репозитория
- Сервер звука при разработке
- session.tsx
- call.tsx
- stories/api.ts
- schema/index.ts
- config.ts
- components.tsx
- rooms/routes.ts
- schema/index.ts
- create.tsx
- react
- mobile/package.json
- Ночной план (22 ноября 2026)
- media.ts
- shared/src/core/errors.ts
- app.ts
- relativeTime.ts
- devDependencies
- Отчёт за ночь 22 ноября 2026
- scripts
- expo@~58.0.26
- expo-glass-effect
- livekit-client
- react-dom@19.3.0

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 53 edges
2. `useSignedIn()` - 51 edges
3. `ApiError` - 47 edges
4. `Body()` - 47 edges
5. `Button()` - 47 edges
6. `request()` - 42 edges
7. `react` - 38 edges
8. `useSession()` - 32 edges
9. `Card()` - 32 edges
10. `ErrorText()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Состояние` --references--> `FakeVoice`  [INFERRED]
  docs/NIGHT_PLAN.md → apps/server/src/testing.ts
- `Как защищена анонимность` --semantically_similar_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED] [semantically similar]
  docs/PROGRESS.md → CLAUDE.md
- `F10: статус «в сети» и риск деанонимизации` --conceptually_related_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED]
  docs/OPEN_QUESTIONS.md → CLAUDE.md
- `F5: что открывается на ступенях раскрытия` --conceptually_related_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED]
  docs/OPEN_QUESTIONS.md → CLAUDE.md
- `Часть 2: посты, лайки, комментарии` --implements--> `Модуль «Посты»`  [EXTRACTED]
  docs/ROADMAP.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Модули соцсети первой версии** — docs_architecture_rooms_module, docs_architecture_posts_module, docs_architecture_feed_module, docs_architecture_stories_module [EXTRACTED 1.00]
- **Модули соцсети: комнаты, посты, лента, истории** — claude_module_rooms, claude_module_posts, claude_module_feed, claude_module_stories [EXTRACTED 1.00]
- **Три личности человека в системе** — claude_account, claude_social_profile, claude_rooms_persona [EXTRACTED 1.00]
- **Механизмы защиты анонимности персоны** — claude_core_identity, claude_persona_links, claude_anonymity_test, claude_rule_anonymity [INFERRED 0.85]

## Communities (76 total, 14 thin omitted)

### Community 0 - "useColors"
Cohesion: 0.08
Nodes (47): LikeButton(), PostCardProps, styles, heightFor(), PostPhotos(), styles, MicButton(), MicIcon() (+39 more)

### Community 1 - "Сервер постов и таблицы"
Cohesion: 0.06
Nodes (56): getFeed(), post, FeedPage, mergeFirstPage(), Feed, FeedState, useFeed(), cursorQuery (+48 more)

### Community 2 - "core/routes.ts"
Cohesion: 0.05
Nodes (80): AccountStanding, deleteAccount(), forbidden(), getAccountStanding(), requireCapability(), AuthDeps, authenticate(), endSession() (+72 more)

### Community 3 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, expo-blur@~58.0.6, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4, expo-router@~58.0.32, expo-secure-store@~58.0.3, expo-status-bar@~58.0.5, react@19.3.0 (+8 more)

### Community 4 - "Зависимости сервера"
Cohesion: 0.06
Nodes (44): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+36 more)

### Community 5 - "entry/service.ts"
Cohesion: 0.10
Nodes (8): pickRoom(), Room, RoomDeps, VoiceGateway, JoinRoomResponse, joinRoomResponseSchema, ROOM_CAPACITY, ROOM_JOIN_EARLY_MINUTES

### Community 6 - "push/service.ts"
Cohesion: 0.15
Nodes (14): isBanned(), ALLOWED_PUSH_HOSTS, BroadcastDeps, broadcastPush(), createWebPushGateway(), generateVapidKeys(), isAllowedPushEndpoint(), removeSubscription() (+6 more)

### Community 8 - "Тесты входа и приглашения"
Cohesion: 0.11
Nodes (17): loadConfig(), createInviteCode(), MemoryMediaStorage, PushGateway, PushTarget, inviteCodes, storyViews, NOW (+9 more)

### Community 9 - "auth.ts"
Cohesion: 0.14
Nodes (15): API_URL, RequestOptions, AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse, authStartResponseSchema (+7 more)

### Community 10 - "Настройки приложения Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 11 - "Структура кода приложения"
Cohesion: 0.10
Nodes (15): Структура кода приложения: lib, ui, features, Экраны-исключения, подключающие модули, Разделение на ядро и модули, Главный экран: истории, кнопка войса, лента, Модуль «Лента», Orb и RoomEntry (круглая кнопка входа в комнату), Студенческая соцсеть (проект), Стек: pnpm, PostgreSQL + Drizzle, LiveKit (+7 more)

### Community 12 - "client.ts"
Cohesion: 0.10
Nodes (7): sourceFiles(), serverDir, decryptEmail(), createDb(), DbHandle, migrationsFolder, Tx

### Community 13 - "moderation/service.ts"
Cohesion: 0.14
Nodes (16): Member, NOW, applyPassedVote(), blockedUntil(), castBallot(), countBallots(), expireDueVotes(), getRoomState() (+8 more)

### Community 14 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 15 - "Жёсткие правила и анонимность"
Cohesion: 0.11
Nodes (14): Автотест анонимности (anonymity.test.ts), Жёсткие правила, LiveKit (голос на своём сервере), Удаление аккаунта удаляет всё, «Ещё раз», отметки, мэтчи, раскрытие ступеней, Косвенные утечки персоны, Сроки хранения данных, Таблица room_marks (тайные отметки) (+6 more)

### Community 16 - "Модули соцсети"
Cohesion: 0.12
Nodes (14): Модуль «Посты», Модуль «Голосовые комнаты», requireCapability (core/account.ts), requireProfile (core/profile/service.ts), Роль Гость, Роль Студент, Роль Преподаватель, Роли: студент, преподаватель, гость (+6 more)

### Community 17 - "request"
Cohesion: 0.13
Nodes (29): MyProfileScreen(), addComment(), createPost(), deleteComment(), deletePost(), getComments(), getPost(), getProfilePosts() (+21 more)

### Community 18 - "Аккаунт и коды приглашения"
Cohesion: 0.13
Nodes (16): Тестовые коды приглашения (TEST/TEACHER/GUEST-2026), Аккаунт: /v1/account, Коды ошибок API, Запрос ленты GET /v1/feed, Фото: /v1/media, API: общие правила, Запросы модуля Посты: посты, лайки, комментарии, жалобы, Профиль: /v1/profile, /v1/profiles/:id (+8 more)

### Community 19 - "Персона комнат и ник"
Cohesion: 0.22
Nodes (16): isUniqueViolation(), changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), checkNickname() (+8 more)

### Community 20 - "Общий пакет типов"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 21 - "Админка и журнал"
Cohesion: 0.12
Nodes (14): Админка /v1/admin, Таблицы admins и admin_audit_log, Будущие модули: друзья, сообщения, группы, новости, Модерация записей соцсети не решена, B8: согласовывать соцсеть или пилот комнат, D4: аккаунт разработчика Apple, F6: бан из комнат — только комнаты или вся соцсеть, G10: модерация постов и комментариев (+6 more)

### Community 22 - "StoryViewer.tsx"
Cohesion: 0.19
Nodes (17): LoadState, StoriesScreen(), deleteStory(), getStories(), getStoryViewers(), markStoryViewed(), StoryViewer(), styles (+9 more)

### Community 23 - "Автопроверка GitHub"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 24 - "Форматы профиля"
Cohesion: 0.13
Nodes (16): FIELD_TEXT, FieldErrors, ProfileFormProps, styles, MyProfileResponse, myProfileResponseSchema, Profile, PROFILE_ABOUT_MAX (+8 more)

### Community 25 - "Звук в браузере (LiveKit)"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 26 - "lib/api.test.ts"
Cohesion: 0.25
Nodes (7): ApiError, authVerify(), fetchHealth(), getProfileById(), networkError(), profile, updateProfile()

### Community 27 - "Корневой пакет"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 28 - "Уведомления в браузере"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 29 - "Три личности человека"
Cohesion: 0.24
Nodes (9): Аккаунт (закрытый), core/identity (единственный читатель моста), Таблица persona_links (мост), Персона комнат (анонимный ник), Три личности: аккаунт, профиль, персона комнат, Персона и ник комнат: /v1/rooms/me, Как модуль комнат не выдаёт человека, Модель данных: ядро, комнаты, мост, модули (+1 more)

### Community 30 - "Текущий этап и документы"
Cohesion: 0.18
Nodes (12): Где мы сейчас: части 0-4, Документация — источник правды, Модуль «Истории», Запросы Историй: просмотры, 24 часа, Таблицы историй: stories, story_views, E9: живой звук между людьми не проверен, G20: неиспользованные фото не удаляются, Сводка прогресса на 22 ноября 2026 (+4 more)

### Community 31 - "moderation.ts"
Cohesion: 0.11
Nodes (21): startVote(), ActiveVote, activeVoteSchema, AUTOBAN_DAYS, AUTOBAN_KICKS, AUTOBAN_WINDOW_DAYS, KICK_BLOCK_HOURS, KICK_MIN_VOTES (+13 more)

### Community 32 - "Вход по коду из письма"
Cohesion: 0.20
Nodes (9): Вход: /v1/auth/*, Два режима auth/start: регистрация и вход, Код из письма: 6 цифр, 10 минут, 5 попыток, Путь: вошёл, нажал кнопку, в комнате, Расписание и вход в комнату: slots/join/leave, Путь пользователя, Таблицы комнат: slots, rooms, participations, Таблицы sessions и email_login_codes (+1 more)

### Community 33 - "Навык дизайна Apple"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 34 - "Ядро и модули"
Cohesion: 0.29
Nodes (7): Ядро соцсети, Модуль «Лента», Голос: LiveKit только звук, без записи, Модуль «Посты», Модуль «Голосовые комнаты», Модуль «Истории», Схема системы: клиент, сервер, LiveKit, PostgreSQL

### Community 35 - "Форматы уведомлений"
Cohesion: 0.25
Nodes (7): PushConfigResponse, pushConfigResponseSchema, pushMessageSchema, PushSubscribeRequest, pushSubscribeRequestSchema, PushUnsubscribeRequest, pushUnsubscribeRequestSchema

### Community 36 - "TypeScript приложения"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 37 - "RoomEntry.tsx"
Cohesion: 0.09
Nodes (22): getPersona(), getSlots(), joinRoom(), leaveRoom(), styles, describeRooms(), RoomsStatus, now (+14 more)

### Community 38 - "FeedList.tsx"
Cohesion: 0.16
Nodes (16): RootLayout(), FeedScreen(), FeedList(), FeedListProps, Row, styles, Circle(), CircleProps (+8 more)

### Community 39 - "Правила Expo"
Cohesion: 0.40
Nodes (4): EAS: сборка и обновления, Expo / React Native приложение, Пакеты Expo только через expo install, Expo Router (src/app)

### Community 40 - "Хранение фото и траты"
Cohesion: 0.40
Nodes (3): MediaStorage / core/media (загрузка и обработка фото), Хранилище и обработка фото, D8: хранилище фото для боевого запуска

### Community 41 - "Модерация комнат"
Cohesion: 0.40
Nodes (5): Автобан: 3 выгона за 7 дней, Голосование «Выгнать на 24 часа», Голосование «Выключить микрофон», «Заглушить для себя», Слабые места модерации (сговор троих)

### Community 42 - "Настройки pnpm"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 43 - "Уведомления и безопасность"
Cohesion: 0.50
Nodes (3): Уведомления: /v1/push/*, Безопасность и данные, Вопросы к юристу (C1-C12)

### Community 53 - "session.tsx"
Cohesion: 0.24
Nodes (12): getAccount(), getProfile(), logout(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState (+4 more)

### Community 54 - "call.tsx"
Cohesion: 0.19
Nodes (35): Navigation(), LoginScreen(), Mode, LoadState, PostScreen(), ProfileEditScreen(), ProfileSetupScreen(), LoadState (+27 more)

### Community 55 - "stories/api.ts"
Cohesion: 0.09
Nodes (14): author, story, okResponseSchema, authorSchema, postPhotoSchema, CreateStoryRequest, createStoryRequestSchema, storiesResponseSchema (+6 more)

### Community 56 - "schema/index.ts"
Cohesion: 0.16
Nodes (19): id(), time(), emailLoginCodes, mediaFiles, profiles, sessions, postComments, postLikes (+11 more)

### Community 57 - "config.ts"
Cohesion: 0.19
Nodes (15): ScheduleConfig, closeFinishedRooms(), JobDeps, startBackgroundJobs(), liftExpiredMutes(), runReminderTick(), NOW, schedule (+7 more)

### Community 58 - "components.tsx"
Cohesion: 0.14
Nodes (17): TabsLayout(), ButtonProps, FieldProps, GlassProps, liquidGlass, styles, TAB_BAR, TabBarSpaceContext (+9 more)

### Community 59 - "rooms/routes.ts"
Cohesion: 0.16
Nodes (9): leaveRoom(), reportToAdmins(), setPersonalMute(), idParam, registerRoomsRoutes(), RoomsDeps, roomReportRequestSchema, RoomState (+1 more)

### Community 60 - "schema/index.ts"
Cohesion: 0.15
Nodes (15): accounts, personas, roomParticipations, roomPersonalMutes, roomReports, rooms, roomSanctions, roomVoteBallots (+7 more)

### Community 61 - "create.tsx"
Cohesion: 0.20
Nodes (13): CreateScreen(), Kind, KINDS, Picked, styles, createStory(), Picked, StoryComposer() (+5 more)

### Community 62 - "react"
Cohesion: 0.26
Nodes (10): PersonaState, usePersona(), dateFormat, disablePush(), enablePush(), getPushStatus(), PushStatus, PushCard() (+2 more)

### Community 63 - "mobile/package.json"
Cohesion: 0.15
Nodes (12): @app/shared@workspace:*, expo-constants@~58.0.16, expo-linking@~58.0.17, react-native-screens@~4.30.1, @app/shared, main, name, private (+4 more)

### Community 64 - "Ночной план (22 ноября 2026)"
Cohesion: 0.11
Nodes (11): FakeVoice, Как делается каждая часть, Ночной план (22 ноября 2026), Одна сессия за раз, Очередь, После части 5 — остановиться, Правила на эту ночь, Состояние (+3 more)

### Community 65 - "media.ts"
Cohesion: 0.24
Nodes (7): MEDIA_MAX_BYTES, MEDIA_PURPOSES, MEDIA_TYPES, MediaPurpose, mediaPurposeSchema, UploadMediaResponse, uploadMediaResponseSchema

### Community 66 - "shared/src/core/errors.ts"
Cohesion: 0.17
Nodes (7): ERROR_CODES, ErrorCode, ErrorResponse, errorResponseSchema, API_PREFIX, HealthResponse, healthResponseSchema

### Community 67 - "app.ts"
Cohesion: 0.12
Nodes (17): AppDeps, buildApp(), errorBody(), Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, VapidConfig (+9 more)

### Community 68 - "relativeTime.ts"
Cohesion: 0.25
Nodes (6): calendarDaysBetween(), dateFormat, dateYearFormat, plural(), startOfDay(), now

### Community 69 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, @types/react@~19.3.0, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, @types/react

### Community 70 - "Отчёт за ночь 22 ноября 2026"
Cohesion: 0.40
Nodes (4): Остановка: закончился лимит использования (около 06:35), Отчёт за ночь 22 ноября 2026, Часть 3. Лента и главный экран — готово, Часть 4. Истории — готово (после возобновления, около 15:00)

### Community 71 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

## Ambiguous Edges - Review These
- `Модуль «Посты»` → `Модуль «Голосовые комнаты»`  [AMBIGUOUS]
  apps/mobile/AGENTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **49 isolated node(s):** `expo/tsconfig.base`, `F1: название соцсети не выбрано`, `apps/server (Node.js + Fastify)`, `packages/shared (общие типы)`, `pnpm check (типы и автотесты)` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 424 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `schema/index.ts` to `Сервер постов и таблицы`, `core/routes.ts`, `Зависимости сервера`, `entry/service.ts`, `push/service.ts`, `Тесты входа и приглашения`, `client.ts`, `moderation/service.ts`, `Персона комнат и ник`, `config.ts`, `schema/index.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `F1: название соцсети не выбрано`, `apps/server (Node.js + Fastify)` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useColors` be split into smaller, more focused modules?**
  _Cohesion score 0.07966101694915254 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `useColors`, `Сервер постов и таблицы`, `dependencies`, `RoomEntry.tsx`, `FeedList.tsx`, `request`, `session.tsx`, `StoryViewer.tsx`, `call.tsx`, `Форматы профиля`, `Звук в браузере (LiveKit)`, `components.tsx`, `create.tsx`, `mobile/package.json`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `Сервер постов и таблицы` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `FakeVoice` connect `Ночной план (22 ноября 2026)` to `Тесты входа и приглашения`, `entry/service.ts`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Модуль «Посты»` and `Модуль «Голосовые комнаты»`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._