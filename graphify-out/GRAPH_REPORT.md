# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 138 files · ~51,607 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 887 nodes · 2228 edges · 55 communities (40 shown, 15 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.83)
- Token cost: 0 input · 138,898 output

## Community Hubs (Navigation)
- Экраны приложения и навигация
- Ядро сервера: аккаунт, роли, профиль
- Зависимости приложения
- Зависимости сервера
- Настройки приложения Expo
- Сборка сервера
- Клиент API комнат
- Клиент API ядра
- Настройки сервера
- Настройки TypeScript
- Правила анонимности и документы
- Общий пакет типов
- Тесты входа, профиля и базы
- Запросы приложения к серверу
- Автопроверка GitHub
- Форматы профиля
- Фоновые задачи комнат
- Напоминания и тесты ролей
- Хранение и обработка фото
- Модули: посты, лента, истории
- Общие форматы входа
- Звук в браузере (LiveKit)
- Сессия пользователя
- Хранилище фото на диске
- Профиль и вход в документах
- Корневой пакет
- Жёсткие правила проекта
- Тесты анонимности и запуска
- Устройство кода и дизайн
- Правила ника комнат
- Структура кода приложения
- Проверка фото перед отправкой
- Три личности и текущий этап
- Навык дизайна Apple
- Роли и права
- Сервер звука и его подмена
- Ядро и модули
- Ошибки API
- TypeScript приложения
- Модерация комнат
- Настройки pnpm
- Правила Expo
- Название и вопросы к вузу
- Уведомления
- Навык Graphify
- Тест запуска сервера
- Тестовые коды приглашения
- Карта проекта Graphify
- Коды ошибок
- Будущие модули
- Косвенные утечки
- Структура репозитория
- Журнал админов
- Правила записей

## God Nodes (most connected - your core abstractions)
1. `Body()` - 30 edges
2. `Button()` - 30 edges
3. `useColors()` - 30 edges
4. `ApiError` - 27 edges
5. `useSession()` - 26 edges
6. `Screen()` - 23 edges
7. `drizzle-orm` - 23 edges
8. `react` - 22 edges
9. `request()` - 22 edges
10. `useSignedIn()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `Таблица persona_links (мост)` --semantically_similar_to--> `persona_links (единственный мост)`  [INFERRED] [semantically similar]
  docs/DATA_MODEL.md → CLAUDE.md
- `Как защищена анонимность (сводка)` --semantically_similar_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED] [semantically similar]
  docs/PROGRESS.md → CLAUDE.md
- `Три личности: аккаунт, профиль, персона` --semantically_similar_to--> `Персона комнат (анонимный ник)`  [INFERRED] [semantically similar]
  docs/DATA_MODEL.md → CLAUDE.md
- `Вопросы к юристу (C1–C12)` --references--> `Студенческая соцсеть (проект)`  [INFERRED]
  docs/OPEN_QUESTIONS.md → CLAUDE.md
- `T41–T49: решения по голосовым комнатам` --rationale_for--> `Модуль «Голосовые комнаты»`  [EXTRACTED]
  docs/DECISIONS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Модули соцсети первой версии** — docs_architecture_rooms_module, docs_architecture_posts_module, docs_architecture_feed_module, docs_architecture_stories_module [EXTRACTED 1.00]
- **Три личности: аккаунт, профиль, персона комнат** — claude_account, claude_profile, claude_persona, claude_persona_links [EXTRACTED 1.00]
- **Порядок частей строительства соцсети** — docs_roadmap_part1_roles_profile, docs_roadmap_part2_posts, docs_roadmap_part3_feed, docs_roadmap_part4_stories [EXTRACTED 1.00]
- **Цепочка проверки ролей: правила, сервер, тесты** — claude_roles, claude_server_role_checks, claude_role_tests, docs_api_roles_table [INFERRED 0.85]

## Communities (55 total, 15 thin omitted)

### Community 0 - "Экраны приложения и навигация"
Cohesion: 0.06
Nodes (106): HomeScreen(), styles, Navigation(), RootLayout(), LoginScreen(), Mode, ProfileEditScreen(), MyProfileScreen() (+98 more)

### Community 1 - "Ядро сервера: аккаунт, роли, профиль"
Cohesion: 0.06
Nodes (93): AccountStanding, deleteAccount(), forbidden(), getAccountStanding(), isBanned(), requireCapability(), AuthDeps, authenticate() (+85 more)

### Community 2 - "Зависимости приложения"
Cohesion: 0.05
Nodes (52): dependencies, @app/shared@workspace:*, expo@~58.0.26, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-glass-effect@~58.0.5, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4 (+44 more)

### Community 3 - "Зависимости сервера"
Cohesion: 0.06
Nodes (46): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+38 more)

### Community 4 - "Настройки приложения Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 5 - "Сборка сервера"
Cohesion: 0.14
Nodes (15): AppDeps, buildApp(), errorBody(), Config, ConsoleMailer, Mailer, PushGateway, PushTarget (+7 more)

### Community 6 - "Клиент API комнат"
Cohesion: 0.12
Nodes (16): getPersona(), getSlots(), joinRoom(), leaveRoom(), PersonaState, okResponseSchema, RoomPersonaResponse, roomPersonaResponseSchema (+8 more)

### Community 7 - "Клиент API ядра"
Cohesion: 0.17
Nodes (19): setNickname(), authVerify(), fetchHealth(), getProfileById(), getPushConfig(), networkError(), request(), subscribePush() (+11 more)

### Community 8 - "Настройки сервера"
Cohesion: 0.14
Nodes (14): DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, loadConfig(), VapidConfig, VoiceConfig, createWebPushGateway(), generateVapidKeys() (+6 more)

### Community 9 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 10 - "Правила анонимности и документы"
Cohesion: 0.12
Nodes (13): Автотест анонимности (anonymity.test.ts), Документация — источник правды, Работа с помощниками на дешёвой модели, Персона комнат (анонимный ник), Общие правила API (нет accountId и почты в ответах), API: список запросов, Роли и отказы (403 forbidden), Модель данных (PostgreSQL) (+5 more)

### Community 11 - "Общий пакет типов"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 12 - "Тесты входа, профиля и базы"
Cohesion: 0.22
Nodes (6): createInviteCode(), inviteCodes, NOW, START, TestContext, slotsResponseSchema

### Community 13 - "Запросы приложения к серверу"
Cohesion: 0.17
Nodes (12): API_URL, RequestOptions, API_PREFIX, HealthResponse, healthResponseSchema, PushConfigResponse, pushConfigResponseSchema, pushMessageSchema (+4 more)

### Community 14 - "Автопроверка GitHub"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 15 - "Форматы профиля"
Cohesion: 0.15
Nodes (12): MyProfileResponse, myProfileResponseSchema, PROFILE_ABOUT_MAX, PROFILE_COURSE_MAX, PROFILE_FACULTY_MAX, PROFILE_NAME_MAX, profileSchema, UpdateProfileRequest (+4 more)

### Community 16 - "Фоновые задачи комнат"
Cohesion: 0.23
Nodes (12): ScheduleConfig, closeFinishedRooms(), JobDeps, startBackgroundJobs(), NOW, schedule, ensureDevLiveSlot(), generateSlots() (+4 more)

### Community 17 - "Напоминания и тесты ролей"
Cohesion: 0.18
Nodes (11): broadcastPush(), pushSubscriptions, slotReminders, slots, keys, NOW, START, ReminderDeps (+3 more)

### Community 18 - "Хранение и обработка фото"
Cohesion: 0.18
Nodes (13): MediaStorage и core/media (хранение фото), Никаких платных трат без согласования, Стирание служебных данных из фото, Фото: /v1/media, Хранилище и обработка фото, Таблица media_files, Таблицы модуля «Посты», Таблица profiles (+5 more)

### Community 19 - "Модули: посты, лента, истории"
Cohesion: 0.17
Nodes (13): Модуль «Лента»: /v1/feed, Модуль «Посты»: /v1/posts, Модуль «Истории»: /v1/stories, Модерация записей соцсети не решена, G10: модерация постов и жалобы, Что проверяется в каждой части, Будущие модули (друзья, группы, сообщения, новости), План работ (+5 more)

### Community 20 - "Общие форматы входа"
Cohesion: 0.14
Nodes (12): AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse, authStartResponseSchema, AuthVerifyRequest, authVerifyRequestSchema (+4 more)

### Community 21 - "Звук в браузере (LiveKit)"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 22 - "Сессия пользователя"
Cohesion: 0.24
Nodes (12): getAccount(), getProfile(), logout(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState (+4 more)

### Community 23 - "Хранилище фото на диске"
Cohesion: 0.18
Nodes (3): DiskMediaStorage, MediaStorage, MemoryMediaStorage

### Community 24 - "Профиль и вход в документах"
Cohesion: 0.15
Nodes (11): Профиль соцсети (открытая личность), Вход: /v1/auth (два режима), Путь «вошёл → кнопка → в комнате», Профиль: /v1/profile, /v1/profiles, Модуль комнат: /v1/rooms, «Ещё раз», отметки и раскрытие — позже, Модерация комнат (голосования, жалобы) — позже, Расписание и вход: /v1/rooms/slots (+3 more)

### Community 25 - "Корневой пакет"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 26 - "Жёсткие правила проекта"
Cohesion: 0.15
Nodes (11): Удаление аккаунта удаляет всё, Просмотр связи ник↔аккаунт админом с причиной и журналом, Жёсткие правила проекта, Аккаунт: /v1/account, Админка: /v1/admin, Таблица accounts, Таблица invite_codes, Таблица persona_links (мост) (+3 more)

### Community 28 - "Устройство кода и дизайн"
Cohesion: 0.17
Nodes (7): Дизайн: стиль Apple и «жидкое стекло», Круглая кнопка входа в комнату (Orb, RoomEntry), Модуль «Голосовые комнаты», Стек: pnpm, PostgreSQL, Drizzle, LiveKit, Готовые элементы ui/components.tsx и theme.ts, F6–F7: бан из комнат и чат после раскрытия, livekit-server --dev (сервер звука)

### Community 29 - "Правила ника комнат"
Cohesion: 0.27
Nodes (9): checkNickname(), NICKNAME_CHANGE_INTERVAL_DAYS, NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH, NICKNAME_PROBLEM_TEXT, nicknameKey(), NicknameProblem, normalizeNickname() (+1 more)

### Community 30 - "Структура кода приложения"
Cohesion: 0.20
Nodes (9): Структура кода приложения (lib, ui, features), Исключение: index.tsx подключает RoomsHomeSection, Главный экран (истории, кнопка войса, лента), Путь пользователя, apps/mobile (Expo + React Native), apps/server (Node.js + Fastify), packages/shared (общие типы), pnpm check (типы и автотесты) (+1 more)

### Community 31 - "Проверка фото перед отправкой"
Cohesion: 0.27
Nodes (7): checkPhoto(), MEDIA_MAX_BYTES, MEDIA_PURPOSES, MEDIA_TYPES, MediaPurpose, mediaPurposeSchema, uploadMediaResponseSchema

### Community 32 - "Три личности и текущий этап"
Cohesion: 0.24
Nodes (8): Аккаунт (закрытая личность), core/identity (читает мост), Где мы сейчас (части 0–4), persona_links (единственный мост), Студенческая соцсеть (проект), Как модуль комнат не выдаёт человека, Безопасность и данные, Вопросы к юристу (C1–C12)

### Community 33 - "Навык дизайна Apple"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 34 - "Роли и права"
Cohesion: 0.28
Nodes (7): Роль «Гость», Роль «Студент», Роль «Преподаватель», Автотесты ролей (отказы), Роли: студент, преподаватель, гость, Проверка ролей на сервере (requireCapability / can), G1: подтверждение статуса студента

### Community 36 - "Ядро и модули"
Cohesion: 0.29
Nodes (7): Ядро соцсети, Модуль «Лента», Голос: LiveKit только звук, без записи, Модуль «Посты», Модуль «Голосовые комнаты», Модуль «Истории», Схема системы: клиент, сервер, LiveKit, PostgreSQL

### Community 37 - "Ошибки API"
Cohesion: 0.29
Nodes (4): ERROR_CODES, ErrorCode, ErrorResponse, errorResponseSchema

### Community 38 - "TypeScript приложения"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 39 - "Модерация комнат"
Cohesion: 0.40
Nodes (5): Автобан: 3 выгона за 7 дней, Голосование «Выгнать на 24 часа», Голосование «Выключить микрофон», «Заглушить для себя», Слабые места модерации (сговор троих)

### Community 40 - "Настройки pnpm"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 42 - "Название и вопросы к вузу"
Cohesion: 0.67
Nodes (3): Не использовать название и логотип КубГУ, F1: название соцсети, Вопросы к вузу (B1–B8)

## Knowledge Gaps
- **48 isolated node(s):** `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости`, `Материалы и глубина (translucency)`, `Типографика: tracking и leading` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 270 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Экраны приложения и навигация` to `Зависимости приложения`, `Звук в браузере (LiveKit)`, `Клиент API комнат`, `Сессия пользователя`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Экраны приложения и навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.05981371338794748 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Ядро сервера: аккаунт, роли, профиль` to `Зависимости сервера`, `Сборка сервера`, `Тесты входа, профиля и базы`, `Фоновые задачи комнат`, `Напоминания и тесты ролей`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `Ядро сервера: аккаунт, роли, профиль` be split into smaller, more focused modules?**
  _Cohesion score 0.05573668684986803 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Экраны приложения и навигация` to `Зависимости приложения`, `Сессия пользователя`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `Зависимости приложения` be split into smaller, more focused modules?**
  _Cohesion score 0.05079825834542816 - nodes in this community are weakly interconnected._