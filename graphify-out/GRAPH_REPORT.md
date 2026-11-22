# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 210 files · ~93,734 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 1422 nodes · 4236 edges · 81 communities (59 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.83)
- Token cost: 0 input · 14,000 output

## Community Hubs (Navigation)
- Приложение: экран комнаты и модерация
- Комнаты: правила модерации и персона
- Приложение: общие элементы экрана
- Сервер: настройки и зависимости
- Сервер: вход в комнату и расписание
- Сервер: посты
- Сервер: сборка приложения и уведомления
- Приложение: посты
- Сервер: админка
- Сервер: схема базы и тесты админки
- Приложение: оболочка и навигация
- Сервер: аккаунт, бан, фото
- Сервер: тесты запуска и входа
- Общий договор: ядро
- Приложение: профиль
- Общий договор: посты и истории
- Приложение: профиль и выбор срока бана
- Документы: запросы админки и аккаунта
- Приложение: настройки Expo
- Приложение: истории
- Общий договор: админка
- Приложение: запросы комнат
- Приложение: запросы и тексты админки
- Приложение: запросы к серверу
- Сервер: тесты анонимности и фото
- Сервер: вход и приглашения
- Документы: три личности и качество
- Приложение: экран админки
- Приложение: лента
- Настройки TypeScript
- Группа 30
- Группа 31
- Группа 32
- Группа 33
- Группа 34
- Группа 35
- Группа 36
- Группа 37
- Группа 38
- Группа 39
- Группа 40
- Группа 41
- Группа 42
- Группа 43
- Группа 44
- Группа 45
- Группа 46
- Группа 47
- Группа 48
- Группа 49
- Группа 50
- Группа 51
- Группа 52
- Группа 53
- Группа 54
- Группа 55
- Группа 56
- Группа 57
- Группа 58
- Группа 59
- Группа 60
- Группа 61
- Группа 62
- Группа 63
- Группа 64
- Группа 65
- Группа 66
- Группа 67
- Группа 68
- Группа 69
- Группа 71
- Группа 72
- Группа 73
- Группа 74
- Группа 75
- Группа 76
- Группа 77
- Группа 78
- Группа 79
- Группа 80

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 64 edges
2. `Button()` - 60 edges
3. `request()` - 58 edges
4. `useSignedIn()` - 57 edges
5. `Body()` - 55 edges
6. `ApiError` - 52 edges
7. `react` - 47 edges
8. `ErrorText()` - 41 edges
9. `Card()` - 40 edges
10. `useSession()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Как делается часть: shared, сервер, тесты, приложение, браузер, документы` --semantically_similar_to--> `Конец задачи: pnpm check, merge main, статус «на проверке», /graphify, PR`  [INFERRED] [semantically similar]
  docs/NIGHT_PLAN.md → CLAUDE.md
- `Роли и отказы 403 forbidden` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/API.md → CLAUDE.md
- `Роли и права в одном месте общего кода` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `А1. Роли и таблица прав` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md
- `persona_links — мост (читает только core/identity)` --semantically_similar_to--> `persona_links — единственная связь аккаунта с персоной (core/identity)`  [INFERRED] [semantically similar]
  docs/DATA_MODEL.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Три личности: аккаунт, профиль, персона комнат** — docs_data_model_accounts, docs_data_model_profiles, docs_data_model_personas, docs_data_model_bridge [EXTRACTED 0.95]
- **Процесс совместной работы: старт, финиш, чужое, конфликты** — claude_collab, claude_task_start, claude_task_end, claude_hands_off, claude_conflicts, docs_roadmap_task_table [EXTRACTED 0.90]
- **Модули соцсети: комнаты, посты, лента, истории** — claude_mod_rooms, claude_mod_posts, claude_mod_feed, claude_mod_stories [EXTRACTED 0.95]

## Communities (81 total, 22 thin omitted)

### Community 0 - "Приложение: экран комнаты и модерация"
Cohesion: 0.06
Nodes (48): JoinState, Room(), RoomScreen(), styles, Unsupported(), castBallot(), clockFormat, dayFormat (+40 more)

### Community 1 - "Комнаты: правила модерации и персона"
Cohesion: 0.06
Nodes (60): getOrCreatePersonaId(), roomPersonalMutes, leaveRoom(), applyPassedVote(), blockedUntil(), castBallot(), countBallots(), expireDueVotes() (+52 more)

### Community 2 - "Приложение: общие элементы экрана"
Cohesion: 0.08
Nodes (51): heightFor(), PostPhotos(), styles, MicButton(), MicIcon(), Props, styles, kickButtonTitle() (+43 more)

### Community 3 - "Сервер: настройки и зависимости"
Cohesion: 0.06
Nodes (45): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+37 more)

### Community 4 - "Сервер: вход в комнату и расписание"
Cohesion: 0.07
Nodes (32): ScheduleConfig, isUniqueViolation(), roomParticipations, slotReminders, NOW, START, closeFinishedRooms(), joinSlot() (+24 more)

### Community 5 - "Сервер: посты"
Cohesion: 0.11
Nodes (40): authenticate(), findProfileId(), cursorQuery, registerFeedRoutes(), cursorQuery, idParam, PostsDeps, registerPostsRoutes() (+32 more)

### Community 6 - "Сервер: сборка приложения и уведомления"
Cohesion: 0.08
Nodes (27): AppDeps, buildApp(), errorBody(), Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, VapidConfig (+19 more)

### Community 7 - "Приложение: посты"
Cohesion: 0.11
Nodes (29): LoadState, addComment(), deleteComment(), deletePost(), getComments(), getPost(), likePost(), reportComment() (+21 more)

### Community 8 - "Сервер: админка"
Cohesion: 0.13
Nodes (35): AdminRouteDeps, idParam, PersonaParams, ProfileParams, registerAdminRoutes(), ReportParams, statusQuery, StatusQuery (+27 more)

### Community 9 - "Сервер: схема базы и тесты админки"
Cohesion: 0.13
Nodes (25): newPost(), newReportedPost(), id(), time(), adminAuditLog, mediaFiles, profiles, postComments (+17 more)

### Community 10 - "Приложение: оболочка и навигация"
Cohesion: 0.25
Nodes (25): Navigation(), RootLayout(), LoginScreen(), Mode, PostScreen(), LoadState, ProfileByIdScreen(), NicknameGate() (+17 more)

### Community 11 - "Сервер: аккаунт, бан, фото"
Cohesion: 0.19
Nodes (28): deleteAccount(), forbidden(), getAccountStanding(), requireCapability(), requireNotBanned(), endSession(), ApiError, unauthorized() (+20 more)

### Community 12 - "Сервер: тесты запуска и входа"
Cohesion: 0.15
Nodes (15): loadConfig(), createInviteCode(), PushGateway, PushTarget, createDb(), inviteCodes, CapturingMailer, CapturingPush (+7 more)

### Community 13 - "Общий договор: ядро"
Cohesion: 0.08
Nodes (23): accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse, authStartResponseSchema, AuthVerifyRequest, authVerifyRequestSchema, AuthVerifyResponse (+15 more)

### Community 14 - "Приложение: профиль"
Cohesion: 0.17
Nodes (24): ProfileEditScreen(), ProfileSetupScreen(), CreateScreen(), Kind, KINDS, Picked, styles, createPost() (+16 more)

### Community 15 - "Общий договор: посты и истории"
Cohesion: 0.07
Nodes (26): Author, authorSchema, COMMENT_TEXT_MAX, COMMENTS_PAGE_SIZE, commentSchema, commentsPageSchema, CreateCommentRequest, CreatePostRequest (+18 more)

### Community 16 - "Приложение: профиль и выбор срока бана"
Cohesion: 0.17
Nodes (21): MyProfileScreen(), BanControl(), Props, Props, styles, Props, RoomReportCard(), styles (+13 more)

### Community 17 - "Документы: запросы админки и аккаунта"
Cohesion: 0.09
Nodes (25): Админка: раздел «Комнаты» — только ники, «Записи» — только профили, Аккаунт: GET/DELETE /v1/account, role, isAdmin, Админка: /v1/admin/* (жалобы, баны, журнал), admin_audit_log — журнал админов, T100: бан в соцсети на 1–30 дней — нельзя публиковать, комментировать, лайкать, T101: жалоба хранит автора записи — можно банить после удаления записи, T102: бан в соцсети закрывает и комнаты; обратное неверно, T103: забаненный может менять профиль; жалобы на профиль — вопрос G10 (+17 more)

### Community 18 - "Приложение: настройки Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 19 - "Приложение: истории"
Cohesion: 0.17
Nodes (17): LoadState, createStory(), deleteStory(), getStories(), getStoryViewers(), markStoryViewed(), author, story (+9 more)

### Community 20 - "Общий договор: админка"
Cohesion: 0.11
Nodes (21): ADMIN_ACTION_LABEL, ADMIN_ACTIONS, ADMIN_PAGE_SIZE, ADMIN_ROOMS_BAN_MAX_DAYS, AdminAccountBanRequest, adminAccountBanRequestSchema, AdminAction, AdminLogEntry (+13 more)

### Community 21 - "Приложение: запросы комнат"
Cohesion: 0.18
Nodes (17): getPersona(), getRoomState(), getSlots(), joinRoom(), leaveRoom(), reportToAdmins(), setNickname(), setPersonalMute() (+9 more)

### Community 22 - "Приложение: запросы и тексты админки"
Cohesion: 0.17
Nodes (18): banAccount(), unbanAccount(), ACCOUNT_BAN_DAY_OPTIONS, BAN_DAY_OPTIONS, blockedUntilText(), MAX_PREVIEW_PHOTOS, offenderBannedText(), photoPreview() (+10 more)

### Community 23 - "Приложение: запросы к серверу"
Cohesion: 0.14
Nodes (16): API_URL, ApiError, authVerify(), deleteAccount(), fetchHealth(), getProfile(), getProfileById(), logout() (+8 more)

### Community 24 - "Сервер: тесты анонимности и фото"
Cohesion: 0.11
Nodes (6): sourceFiles(), serverDir, MediaStorage, MemoryMediaStorage, sessions, slots

### Community 25 - "Сервер: вход и приглашения"
Cohesion: 0.20
Nodes (20): AuthDeps, findUsableInviteId(), inviteIsUsable(), Session, startLogin(), verifyLogin(), decryptEmail(), encryptEmail() (+12 more)

### Community 26 - "Документы: три личности и качество"
Cohesion: 0.10
Nodes (22): Три личности: аккаунт, профиль соцсети, персона комнат, persona_links — единственная связь аккаунта с персоной (core/identity), Качество: автотесты, anonymity.test.ts, обход t.routes по ролям, boot.test.ts, Роли: студент, преподаватель, гость, Ник комнат нельзя связать с аккаунтом и профилем ни в одном ответе, Запреты проверяет сервер, а не экран, Коды ошибок API, Общие правила API: JSON, Bearer, нет accountId и почты, ошибки (+14 more)

### Community 27 - "Приложение: экран админки"
Cohesion: 0.19
Nodes (17): AdminRoute(), AdminList(), AdminScreen(), ListProps, LogSection(), PostsSection(), RoomsSection(), Section (+9 more)

### Community 28 - "Приложение: лента"
Cohesion: 0.18
Nodes (16): FeedScreen(), FeedList(), FeedListProps, Row, styles, FeedPage, mergeFirstPage(), Feed (+8 more)

### Community 29 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 30 - "Группа 30"
Cohesion: 0.13
Nodes (19): Правила импорта: модуль → ядро; feed берёт из posts и stories, Структура кода: lib/ui — ядро, features/<модуль> — модули, Деление на ядро и модули; зависимости только модуль → ядро, Модуль «Лента» (единственный, кому можно обращаться к другому модулю), Модуль «Посты», Модуль «Голосовые комнаты», Модуль «Истории» (24 часа, maintenance.ts), requireProfile — «кто я» для модулей соцсети (+11 more)

### Community 31 - "Группа 31"
Cohesion: 0.15
Nodes (16): TabsLayout(), ButtonProps, FieldProps, GlassProps, liquidGlass, styles, TAB_BAR, TabBarSpaceContext (+8 more)

### Community 32 - "Группа 32"
Cohesion: 0.12
Nodes (18): Экраны вне вкладок: login, verify, profile/setup, posts, rooms, stories, Expo Router: маршруты в src/app, Нижнее меню (tabs): Лента, Войс, Создать, Профиль; Tabs.Protected, Команды: pnpm check, dev:server, dev:web, livekit, drizzle-kit, тестовые коды, Типовые конфликты: graphify-out, drizzle, DECISIONS (T-номера), ROADMAP, Документация — источник правды, Работа с помощниками: рутина на Sonnet, безопасность не отдавать, Главный экран: истории, строка войса, лента, нижнее меню (+10 more)

### Community 33 - "Группа 33"
Cohesion: 0.11
Nodes (18): dependencies, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4, expo-linking@~58.0.17, expo-router@~58.0.32, expo-secure-store@~58.0.3, expo-status-bar@~58.0.5, react@19.3.0 (+10 more)

### Community 34 - "Группа 34"
Cohesion: 0.25
Nodes (16): ProfileRef, idParam, registerStoriesRoutes(), createStory(), deleteStory(), isActive(), listStories(), listViewers() (+8 more)

### Community 35 - "Группа 35"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 36 - "Группа 36"
Cohesion: 0.18
Nodes (11): AccountStanding, dateFormat, deletePersonaOfAccount(), findPersonaId(), Db, DbHandle, DbOrTx, migrationsFolder (+3 more)

### Community 37 - "Группа 37"
Cohesion: 0.12
Nodes (17): Жёсткие правила (нарушать нельзя), Удаление аккаунта удаляет всё, Не делать функции вне этапа: друзья, сообщения, группы, новости, Звук не записывается (egress LiveKit не ставить), Невзаимные отметки не видит никто, Без телефона и документов; без зарубежных облаков; EXIF стирать, Будущие модули: друзья, сообщения, группы, новости, LiveKit (свой сервер) (+9 more)

### Community 38 - "Группа 38"
Cohesion: 0.14
Nodes (16): Отложено: письма D3, хранилище фото D8, телефоны D4, админка (остальное), Деньги и лимиты: платные траты только с согласия, Стек: pnpm-монорепо, PostgreSQL+Drizzle, LiveKit, российский хостинг, Где мы сейчас: части 0–6 сделаны, остановка после каждой части, Уведомления: /v1/push/*, Части системы и их состояние, push_subscriptions, Расписание и push T30–T35: пн/ср/пт 20:00, Web Push, проверка адреса подписки (+8 more)

### Community 39 - "Группа 39"
Cohesion: 0.12
Nodes (16): Название соцсети не выбрано; без имени и логотипа КубГУ, Комнаты: «Ещё раз» и раскрытие (marks, matches, reveal) — позже, room_marks, matches, reveal_cards, chat_messages — позже, Решить: название проекта (F1), Решить: «ещё раз» и раскрытие (F5), нужен юрист, Решить: подтверждение студента (G1), Проверка вдвоём с живым звуком, Решить: деньги D1–D8 (+8 more)

### Community 40 - "Группа 40"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 41 - "Группа 41"
Cohesion: 0.14
Nodes (15): Экран комнаты: useRoomState опрашивает каждые 2,5 с, Вход: /v1/auth/start, verify, logout; два режима, Путь «вошёл → кнопка → в комнате», Профиль: /v1/profile, /v1/profiles/:id, События в реальном времени (WebSocket) — позже, Комнаты: модерация /v1/rooms/:id/state, votes, ballot, mutes, reports, Комнаты: персона /v1/rooms/me, ник, Комнаты: расписание и вход /v1/rooms/slots, join, leave (+7 more)

### Community 42 - "Группа 42"
Cohesion: 0.18
Nodes (13): expo-blur@~58.0.6, devDependencies, @types/react@~19.3.0, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, main (+5 more)

### Community 43 - "Группа 43"
Cohesion: 0.20
Nodes (14): Лента: GET /v1/feed, Фото: POST /v1/media, GET /v1/media/:id, Посты: /v1/posts/* (лайки, комментарии, жалобы), Истории: /v1/stories/*, accounts — закрытый аккаунт, persona_links — мост (читает только core/identity), Лента — без своих таблиц, Группы таблиц: ядро, комнаты, мост, посты/истории (+6 more)

### Community 44 - "Группа 44"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 45 - "Группа 45"
Cohesion: 0.24
Nodes (11): getAccount(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState, useRole(), clearToken() (+3 more)

### Community 46 - "Группа 46"
Cohesion: 0.24
Nodes (10): livekit-client@^2.25.0, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call, CallParticipant (+2 more)

### Community 47 - "Группа 47"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 48 - "Группа 48"
Cohesion: 0.17
Nodes (12): Остановка: закончился лимит около 06:35, Итог ночи: 303 автотеста, денег не потрачено, Часть 3: лента, нижнее меню, строка войса — готово, Найдено: кнопка-шар была вложена в кнопку-строку, Часть 3 проверена в браузере тремя ролями, Часть 4: истории — готово, Часть 4: проверено автотестами и в браузере, Не проверено: выбор фото и жесты на телефоне (+4 more)

### Community 49 - "Группа 49"
Cohesion: 0.18
Nodes (8): banFromRooms(), closeRoomReport(), dismissPostReport(), liftRoomsBan(), removeReportedRecord(), author, postReport, roomReport

### Community 50 - "Группа 50"
Cohesion: 0.33
Nodes (8): deleteMedia(), stories, storyViews, purgeUnusedMedia(), runMaintenance(), startMaintenance(), purgeExpiredStories(), NOW

### Community 51 - "Группа 51"
Cohesion: 0.24
Nodes (7): MEDIA_MAX_BYTES, MEDIA_PURPOSES, MEDIA_TYPES, MediaPurpose, mediaPurposeSchema, UploadMediaResponse, uploadMediaResponseSchema

### Community 52 - "Группа 52"
Cohesion: 0.24
Nodes (10): Совместная работа: два человека, общая память — только GitHub, Правила graphify: query перед grep, update после изменений, Чужое не трогать: не менять чужие задачи, без force-push, без секретов, Конец задачи: pnpm check, merge main, статус «на проверке», /graphify, PR, Начало задачи: pull main, ветка автор/задача, черновик PR, строка в ROADMAP, Отметка .claude/night-heartbeat — одна сессия за раз, Ночной план 22.11.2026 — выполнен, правила отменены, Правила ночи: без остановок, без трат, не ломать сделанное (+2 more)

### Community 53 - "Группа 53"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 54 - "Группа 54"
Cohesion: 0.25
Nodes (7): PushConfigResponse, pushConfigResponseSchema, pushMessageSchema, PushSubscribeRequest, pushSubscribeRequestSchema, PushUnsubscribeRequest, pushUnsubscribeRequestSchema

### Community 55 - "Группа 55"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

### Community 56 - "Группа 56"
Cohesion: 0.52
Nodes (5): banDateText(), dateFormat, pausedBodyText(), pausedUntilText(), timeFormat

### Community 57 - "Группа 57"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 61 - "Группа 61"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

## Ambiguous Edges - Review These
- `Стек T1–T16: Expo, Fastify, pnpm, PostgreSQL+Drizzle, LiveKit, WebSocket, Docker Compose` → `P17–P19: проект — соцсеть, комнаты — модуль; три личности`  [AMBIGUOUS]
  docs/DECISIONS.md · relation: conceptually_related_to

## Knowledge Gaps
- **90 isolated node(s):** `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости`, `Материалы и глубина (translucency)`, `Типографика: tracking и leading` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 429 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `Сервер: схема базы и тесты админки` to `Комнаты: правила модерации и персона`, `Группа 34`, `Сервер: настройки и зависимости`, `Группа 36`, `Сервер: посты`, `Сервер: сборка приложения и уведомления`, `Сервер: вход в комнату и расписание`, `Сервер: админка`, `Сервер: аккаунт, бан, фото`, `Сервер: тесты запуска и входа`, `Группа 50`, `Сервер: вход и приглашения`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Приложение: экран комнаты и модерация` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Приложение: общие элементы экрана` to `Приложение: экран комнаты и модерация`, `Группа 33`, `Приложение: посты`, `Группа 42`, `Приложение: оболочка и навигация`, `Группа 45`, `Приложение: профиль`, `Группа 46`, `Приложение: профиль и выбор срока бана`, `Приложение: истории`, `Приложение: запросы комнат`, `Приложение: экран админки`, `Приложение: лента`, `Группа 31`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `Комнаты: правила модерации и персона` be split into smaller, more focused modules?**
  _Cohesion score 0.06151062867480778 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Приложение: общие элементы экрана` to `Приложение: экран комнаты и модерация`, `Группа 33`, `Приложение: посты`, `Группа 42`, `Приложение: оболочка и навигация`, `Группа 45`, `Приложение: профиль`, `Приложение: профиль и выбор срока бана`, `Приложение: истории`, `Приложение: экран админки`, `Приложение: лента`, `Группа 31`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Стек T1–T16: Expo, Fastify, pnpm, PostgreSQL+Drizzle, LiveKit, WebSocket, Docker Compose` and `P17–P19: проект — соцсеть, комнаты — модуль; три личности`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._