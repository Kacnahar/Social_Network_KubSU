# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 155 files · ~61,872 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 1035 nodes · 2804 edges · 53 communities (43 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.86)
- Token cost: 0 input · 144,218 output

## Community Hubs (Navigation)
- Экраны приложения и навигация
- Сервер постов и таблицы
- Аккаунт, роли и ошибки
- Зависимости приложения
- Зависимости сервера
- Вход в комнату и расписание
- Напоминания и тесты ролей
- Сборка и настройки сервера
- Тесты входа и приглашения
- Клиент API ядра
- Настройки приложения Expo
- Структура кода приложения
- Тесты анонимности и хранилище фото
- Клиент API комнат
- Настройки TypeScript
- Жёсткие правила и анонимность
- Модули соцсети
- Клиент API постов
- Аккаунт и коды приглашения
- Персона комнат и ник
- Общий пакет типов
- Админка и журнал
- Аккаунт и мост identity
- Автопроверка GitHub
- Форматы профиля
- Звук в браузере (LiveKit)
- Запросы входа и профиля
- Корневой пакет
- Уведомления в браузере
- Три личности человека
- Текущий этап и документы
- Время поста
- Вход по коду из письма
- Навык дизайна Apple
- Ядро и модули
- Форматы уведомлений
- TypeScript приложения
- Хранилище фото на диске
- Отправка уведомлений
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

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 42 edges
2. `Body()` - 41 edges
3. `Button()` - 41 edges
4. `request()` - 34 edges
5. `ApiError` - 34 edges
6. `useSignedIn()` - 33 edges
7. `useSession()` - 30 edges
8. `Card()` - 30 edges
9. `react` - 29 edges
10. `Screen()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Как защищена анонимность` --semantically_similar_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED] [semantically similar]
  docs/PROGRESS.md → CLAUDE.md
- `API: роли и отказы 403 forbidden` --implements--> `Роли: студент, преподаватель, гость`  [EXTRACTED]
  docs/API.md → CLAUDE.md
- `Часть 2: посты, лайки, комментарии` --implements--> `Модуль «Посты»`  [EXTRACTED]
  docs/ROADMAP.md → CLAUDE.md
- `F10: статус «в сети» и риск деанонимизации` --conceptually_related_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED]
  docs/OPEN_QUESTIONS.md → CLAUDE.md
- `F5: что открывается на ступенях раскрытия` --conceptually_related_to--> `Ник комнат нельзя связать с аккаунтом и профилем`  [INFERRED]
  docs/OPEN_QUESTIONS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Модули соцсети первой версии** — docs_architecture_rooms_module, docs_architecture_posts_module, docs_architecture_feed_module, docs_architecture_stories_module [EXTRACTED 1.00]
- **Три личности человека в системе** — claude_account, claude_social_profile, claude_rooms_persona [EXTRACTED 1.00]
- **Модули соцсети: комнаты, посты, лента, истории** — claude_module_rooms, claude_module_posts, claude_module_feed, claude_module_stories [EXTRACTED 1.00]
- **Механизмы защиты анонимности персоны** — claude_core_identity, claude_persona_links, claude_anonymity_test, claude_rule_anonymity [INFERRED 0.85]

## Communities (53 total, 10 thin omitted)

### Community 0 - "Экраны приложения и навигация"
Cohesion: 0.05
Nodes (137): HomeScreen(), styles, Navigation(), RootLayout(), LoginScreen(), Mode, NewPostScreen(), Picked (+129 more)

### Community 1 - "Сервер постов и таблицы"
Cohesion: 0.06
Nodes (63): findProfileId(), ProfileRef, mediaFiles, profiles, postComments, postLikes, postPhotos, postReports (+55 more)

### Community 2 - "Аккаунт, роли и ошибки"
Cohesion: 0.08
Nodes (58): deleteAccount(), forbidden(), getAccountStanding(), requireCapability(), AuthDeps, authenticate(), endSession(), findUsableInviteId() (+50 more)

### Community 3 - "Зависимости приложения"
Cohesion: 0.05
Nodes (51): dependencies, @app/shared@workspace:*, expo@~58.0.26, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-glass-effect@~58.0.5, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4 (+43 more)

### Community 4 - "Зависимости сервера"
Cohesion: 0.06
Nodes (46): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+38 more)

### Community 5 - "Вход в комнату и расписание"
Cohesion: 0.11
Nodes (28): ScheduleConfig, isBanned(), Db, closeFinishedRooms(), joinSlot(), leaveRoom(), pickRoom(), Room (+20 more)

### Community 6 - "Напоминания и тесты ролей"
Cohesion: 0.12
Nodes (23): broadcastPush(), isAllowedPushEndpoint(), personaLinks, id(), time(), accounts, pushSubscriptions, sessions (+15 more)

### Community 7 - "Сборка и настройки сервера"
Cohesion: 0.11
Nodes (21): AppDeps, buildApp(), errorBody(), Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, VapidConfig (+13 more)

### Community 8 - "Тесты входа и приглашения"
Cohesion: 0.13
Nodes (14): loadConfig(), createInviteCode(), createDb(), inviteCodes, NOW, schedule, CapturingMailer, createTestContext() (+6 more)

### Community 9 - "Клиент API ядра"
Cohesion: 0.10
Nodes (22): API_URL, networkError(), RequestOptions, AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse (+14 more)

### Community 10 - "Настройки приложения Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 11 - "Структура кода приложения"
Cohesion: 0.10
Nodes (15): Структура кода приложения: lib, ui, features, Экраны-исключения, подключающие модули, Разделение на ядро и модули, Главный экран: истории, кнопка войса, лента, Модуль «Лента», Orb и RoomEntry (круглая кнопка входа в комнату), Студенческая соцсеть (проект), Стек: pnpm, PostgreSQL + Drizzle, LiveKit (+7 more)

### Community 12 - "Тесты анонимности и хранилище фото"
Cohesion: 0.12
Nodes (4): sourceFiles(), serverDir, MediaStorage, MemoryMediaStorage

### Community 13 - "Клиент API комнат"
Cohesion: 0.15
Nodes (13): getPersona(), getSlots(), joinRoom(), leaveRoom(), PersonaState, useSlots(), RoomPersonaResponse, roomPersonaResponseSchema (+5 more)

### Community 14 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 15 - "Жёсткие правила и анонимность"
Cohesion: 0.11
Nodes (14): Автотест анонимности (anonymity.test.ts), Жёсткие правила, LiveKit (голос на своём сервере), Удаление аккаунта удаляет всё, «Ещё раз», отметки, мэтчи, раскрытие ступеней, Косвенные утечки персоны, Сроки хранения данных, Таблица room_marks (тайные отметки) (+6 more)

### Community 16 - "Модули соцсети"
Cohesion: 0.12
Nodes (14): Модуль «Посты», Модуль «Голосовые комнаты», requireCapability (core/account.ts), requireProfile (core/profile/service.ts), Роль Гость, Роль Студент, Роль Преподаватель, Роли: студент, преподаватель, гость (+6 more)

### Community 17 - "Клиент API постов"
Cohesion: 0.23
Nodes (15): addComment(), createPost(), deleteComment(), deletePost(), getComments(), getPost(), getProfilePosts(), likePost() (+7 more)

### Community 18 - "Аккаунт и коды приглашения"
Cohesion: 0.13
Nodes (16): Тестовые коды приглашения (TEST/TEACHER/GUEST-2026), Аккаунт: /v1/account, Коды ошибок API, Запрос ленты GET /v1/feed, Фото: /v1/media, API: общие правила, Запросы модуля Посты: посты, лайки, комментарии, жалобы, Профиль: /v1/profile, /v1/profiles/:id (+8 more)

### Community 19 - "Персона комнат и ник"
Cohesion: 0.24
Nodes (15): changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), checkNickname(), NICKNAME_CHANGE_INTERVAL_DAYS (+7 more)

### Community 20 - "Общий пакет типов"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 21 - "Админка и журнал"
Cohesion: 0.12
Nodes (14): Админка /v1/admin, Таблицы admins и admin_audit_log, Будущие модули: друзья, сообщения, группы, новости, Модерация записей соцсети не решена, B8: согласовывать соцсеть или пилот комнат, D4: аккаунт разработчика Apple, F6: бан из комнат — только комнаты или вся соцсеть, G10: модерация постов и комментариев (+6 more)

### Community 22 - "Аккаунт и мост identity"
Cohesion: 0.20
Nodes (10): AccountStanding, deletePersonaOfAccount(), findPersonaId(), getOrCreatePersonaId(), DbHandle, DbOrTx, isUniqueViolation(), migrationsFolder (+2 more)

### Community 23 - "Автопроверка GitHub"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 24 - "Форматы профиля"
Cohesion: 0.16
Nodes (11): MyProfileResponse, myProfileResponseSchema, PROFILE_ABOUT_MAX, PROFILE_COURSE_MAX, PROFILE_FACULTY_MAX, PROFILE_NAME_MAX, profileSchema, UpdateProfileRequest (+3 more)

### Community 25 - "Звук в браузере (LiveKit)"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 26 - "Запросы входа и профиля"
Cohesion: 0.18
Nodes (11): authVerify(), fetchHealth(), getAccount(), getProfile(), getProfileById(), logout(), profile, SessionProvider() (+3 more)

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

### Community 31 - "Время поста"
Cohesion: 0.29
Nodes (7): calendarDaysBetween(), dateFormat, dateYearFormat, formatPostTime(), plural(), startOfDay(), now

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

### Community 38 - "Отправка уведомлений"
Cohesion: 0.47
Nodes (4): PushGateway, PushTarget, CapturingPush, PushMessage

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

## Ambiguous Edges - Review These
- `Модуль «Голосовые комнаты»` → `Модуль «Посты»`  [AMBIGUOUS]
  apps/mobile/AGENTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **49 isolated node(s):** `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости`, `Материалы и глубина (translucency)`, `Типографика: tracking и leading` (+44 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 312 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Экраны приложения и навигация` to `Звук в браузере (LiveKit)`, `Зависимости приложения`, `Клиент API комнат`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости` to the rest of the system?**
  _49 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Экраны приложения и навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.052090334722408926 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Напоминания и тесты ролей` to `Сервер постов и таблицы`, `Аккаунт, роли и ошибки`, `Зависимости сервера`, `Вход в комнату и расписание`, `Сборка и настройки сервера`, `Тесты входа и приглашения`, `Персона комнат и ник`, `Аккаунт и мост identity`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Сервер постов и таблицы` be split into smaller, more focused modules?**
  _Cohesion score 0.05755693581780538 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Экраны приложения и навигация` to `Запросы входа и профиля`, `Зависимости приложения`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Модуль «Голосовые комнаты»` and `Модуль «Посты»`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._