# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 203 files · ~93,017 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 1736 nodes · 4576 edges · 109 communities (78 shown, 31 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 229 edges (avg confidence: 0.81)
- Token cost: 0 input · 582,684 output

## Graph Freshness
- Built from commit: `e47b73e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- moderation/service.ts
- Приложение: оболочка, сессия, навигация
- Приложение: общие элементы экрана и микрофон
- Сервер: настройки и зависимости
- request
- rooms/api.ts
- entry/service.ts
- Сервер: тесты анонимности и запуска
- Сервер: аккаунт, удаление, фото
- AdminScreen.tsx
- create.tsx
- src/index.ts
- Документы: санкции и модерация
- ErrorText
- rooms/routes.ts
- Документы: запросы и коды ошибок
- useColors
- posts/service.ts
- Документы: таблицы ядра
- admin/service.ts
- Приложение: настройки Expo
- Документы: экран модерации комнаты
- stories/service.ts
- main.ts
- Документы: маршруты приложения
- Вход: /v1/auth/start, verify, logout
- Сервер: схема базы
- Общий договор: ядро и запросы
- Настройки TypeScript
- Сервер: вход и приглашения
- Документы: ядро и модули
- Документы: сроки хранения
- Группа 32
- Группа 33
- PostReportCard.tsx
- Группа (tabs): index, voice, create, profile
- Группа 36
- Группа 37
- Группа 38
- E9. Живой звук двух людей не проверен
- Группа 40
- Группа 41
- Группа 42
- Группа 43
- stories/api.ts
- Модуль импортирует ядро; ядро и модули друг друга — нет
- Группа 46
- Группа 47
- Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем
- P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1)
- session.tsx
- Группа 51
- F5. Что открывается на ступенях раскрытия
- T31. Web Push для напоминаний: в тексте только название и время
- Часть 3. Лента и главный экран
- lib/api.ts
- Группа 56
- Группа 57
- admin.ts
- Правила ночи: не останавливаться, не тратить, не выдумывать, не ломать
- schema/index.ts
- Группа 61
- Группа 62
- Группа 63
- Группа 64
- Группа 65
- posts/posts.ts
- features/rooms/moderation.ts
- Группа 68
- Группа 69
- app.ts
- Группа 71
- stories/api.ts
- useFeed.ts
- Группа 74
- Группа 75
- admin.test.ts
- Группа 77
- Группа 78
- Группа 79
- Группа 80
- Группа 81
- Группа 83
- Группа 84
- Группа 85
- Группа 86
- media.ts
- Группа 88
- Группа 89
- core/push.ts
- Группа 91
- PostPhotos.tsx
- Группа 93
- Группа 94
- Группа 95
- Mailer
- Группа 97
- Группа 98
- Группа 99
- T57. Ник и персона — только студентам при первом входе в «Войс»
- Группа 101
- Группа 102
- Группа 103
- Группа 104
- Группа 105
- MediaStorage
- Группа 107
- Группа 108

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
- `persona_links — мост аккаунт ↔ персона` --semantically_similar_to--> `Таблица persona_links — единственная связь аккаунта с персоной`  [INFERRED] [semantically similar]
  docs/DATA_MODEL.md → CLAUDE.md
- `Роли и права в одном месте общего кода` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Запреты проверяет сервер; чего нельзя — не видно` --semantically_similar_to--> `Запреты проверяет сервер, а не экран`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md
- `А4. Соцсеть и анонимность комнат` --semantically_similar_to--> `Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md
- `T50. Код разделён на ядро и модули` --semantically_similar_to--> `Ядро и модули: единое разделение кода`  [INFERRED] [semantically similar]
  docs/DECISIONS.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Правила анонимности комнат** — claude_rule1, claude_rule2, claude_rule4, claude_rule6, claude_persona_links, claude_anon_test [EXTRACTED 1.00]
- **Решения по модерации комнат (T85–T93)** — docs_decisions_t85, docs_decisions_t86, docs_decisions_t87, docs_decisions_t88, docs_decisions_t89, docs_decisions_t90, docs_decisions_t91, docs_decisions_t92, docs_decisions_t93 [EXTRACTED 1.00]
- **Цепочка аккаунт → мост → персона** — docs_data_model_accounts, docs_data_model_persona_links, docs_data_model_room_personas [EXTRACTED 1.00]

## Communities (109 total, 31 thin omitted)

### Community 0 - "moderation/service.ts"
Cohesion: 0.11
Nodes (31): roomParticipations, rooms, applyPassedVote(), castBallot(), countBallots(), expireDueVotes(), getRoomState(), loadOpenRoom() (+23 more)

### Community 1 - "Приложение: оболочка, сессия, навигация"
Cohesion: 0.14
Nodes (42): Navigation(), RootLayout(), LoginScreen(), Mode, PostScreen(), LoadState, ProfileByIdScreen(), JoinState (+34 more)

### Community 2 - "Приложение: общие элементы экрана и микрофон"
Cohesion: 0.10
Nodes (33): FeedScreen(), TabsLayout(), FeedList(), FeedListProps, Row, styles, VoiceBar(), getStories() (+25 more)

### Community 3 - "Сервер: настройки и зависимости"
Cohesion: 0.06
Nodes (45): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+37 more)

### Community 4 - "request"
Cohesion: 0.14
Nodes (27): LoadState, addComment(), createPost(), deleteComment(), deletePost(), getComments(), getPost(), getProfilePosts() (+19 more)

### Community 5 - "rooms/api.ts"
Cohesion: 0.17
Nodes (17): getPersona(), getRoomState(), getSlots(), joinRoom(), leaveRoom(), reportToAdmins(), setPersonalMute(), startVote() (+9 more)

### Community 6 - "entry/service.ts"
Cohesion: 0.13
Nodes (16): isUniqueViolation(), joinSlot(), pickRoom(), Room, RoomDeps, roomNotOpen(), voiceUnavailable(), blockedUntil() (+8 more)

### Community 7 - "Сервер: тесты анонимности и запуска"
Cohesion: 0.18
Nodes (12): loadConfig(), createInviteCode(), createDb(), inviteCodes, CapturingMailer, createTestContext(), TEST_INVITE, TEST_INVITE_BY_ROLE (+4 more)

### Community 8 - "Сервер: аккаунт, удаление, фото"
Cohesion: 0.07
Nodes (35): AccountStanding, dateFormat, deleteAccount(), forbidden(), getAccountStanding(), isBanned(), requireCapability(), requireNotBanned() (+27 more)

### Community 9 - "AdminScreen.tsx"
Cohesion: 0.11
Nodes (27): AdminRoute(), AdminList(), AdminScreen(), ListProps, LogSection(), PostsSection(), RoomsSection(), Section (+19 more)

### Community 10 - "create.tsx"
Cohesion: 0.14
Nodes (22): ProfileEditScreen(), ProfileSetupScreen(), CreateScreen(), Kind, KINDS, Picked, styles, createStory() (+14 more)

### Community 11 - "src/index.ts"
Cohesion: 0.09
Nodes (23): Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, ScheduleConfig, VapidConfig, VoiceConfig, DbHandle (+15 more)

### Community 12 - "Документы: санкции и модерация"
Cohesion: 0.11
Nodes (28): P6. Модерация голосованием участников, без ведущего, T86. Пороги голосований: выгнать ≥3 и ≥1/3, микрофон 2 голоса, окно 60 с, T87. «Выгнали» закрывает вход во все комнаты на 24 часа, T89. Выключенный микрофон не возвращается перезаходом, T90. Кто голосовал — не раскрывается, T92. «Заглушить для себя» — только у меня, сохраняется, T93. «Сообщить админам» записывает жалобу, Связь с админами: «Сообщить админам», почта, действия админа (+20 more)

### Community 13 - "ErrorText"
Cohesion: 0.22
Nodes (18): MyProfileScreen(), CommentsCard(), ProfilePosts(), State, styles, deleteAccount(), disablePush(), enablePush() (+10 more)

### Community 14 - "rooms/routes.ts"
Cohesion: 0.19
Nodes (13): findPersonaId(), getOrCreatePersonaId(), leaveRoom(), reportToAdmins(), setPersonalMute(), idParam, registerRoomsRoutes(), RoomsDeps (+5 more)

### Community 15 - "Документы: запросы и коды ошибок"
Cohesion: 0.09
Nodes (27): Исключение: feed берёт карточку поста из posts и кружки из stories, Коды ошибок, Фото: POST/GET /v1/media, Модуль «Посты»: /v1/posts/*, Отказ profile_required — заполните профиль, Модуль «Истории»: /v1/stories/*, P24. Посты: текст и до 10 фото, лайки, комментарии, P25. Истории живут 24 часа (+19 more)

### Community 16 - "useColors"
Cohesion: 0.07
Nodes (50): LikeButton(), MicButton(), MicIcon(), Props, styles, createStyles(), Orb(), OrbProps (+42 more)

### Community 17 - "posts/service.ts"
Cohesion: 0.10
Nodes (28): cursorQuery, idParam, PostsDeps, registerPostsRoutes(), addComment(), CommentRow, createPost(), cursorSchema (+20 more)

### Community 18 - "Документы: таблицы ядра"
Cohesion: 0.11
Nodes (27): accounts — закрытый аккаунт (email_encrypted, email_hash, role, status), admins и admin_audit_log — журнал админов (позже), Лента не имеет таблиц, Три группы таблиц: ядро, комнаты, мост (плюс посты и истории), media_files — загруженные фото, persona_links — мост аккаунт ↔ персона, post_comments — комментарии, post_likes — лайки (+19 more)

### Community 19 - "admin/service.ts"
Cohesion: 0.09
Nodes (30): AdminRouteDeps, idParam, PersonaParams, ProfileParams, registerAdminRoutes(), ReportParams, statusQuery, StatusQuery (+22 more)

### Community 20 - "Приложение: настройки Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 21 - "Документы: экран модерации комнаты"
Cohesion: 0.07
Nodes (28): Call.setLocallyMuted — «заглушить для себя», ParticipantActions, VoteBanner, moderation.ts, useRoomState — опрос состояния комнаты каждые 2,5 с, Приложение: Expo + React Native + TypeScript, База: PostgreSQL + Drizzle (при разработке встроенная), Всё серверное — на российском хостинге, Почта: российский сервис, не подключена, Push: Web Push в браузере, телефоны позже (+20 more)

### Community 22 - "stories/service.ts"
Cohesion: 0.17
Nodes (19): authenticate(), deleteMedia(), findProfileId(), cursorQuery, registerFeedRoutes(), idParam, registerStoriesRoutes(), createStory() (+11 more)

### Community 23 - "main.ts"
Cohesion: 0.10
Nodes (11): sourceFiles(), serverDir, MemoryMediaStorage, createWebPushGateway(), generateVapidKeys(), sessions, config, loadDevVapid() (+3 more)

### Community 24 - "Документы: маршруты приложения"
Cohesion: 0.14
Nodes (17): Профиль соцсети — открытая личность, requireCapability и can() — проверка прав ролей, requireProfile(db, accountId, capability), Автотесты ролей (обход t.routes), Роли: студент, преподаватель, гость, Правило 9: удаление аккаунта удаляет всё, Роли и отказы: 403 forbidden, Роли и права в одном месте общего кода (+9 more)

### Community 25 - "Вход: /v1/auth/start, verify, logout"
Cohesion: 0.28
Nodes (9): Вход: /v1/auth/start, verify, logout, Защита кода из письма: 6 цифр, 10 минут, 5 попыток, Режим разработки: devCode в ответе, Два режима auth/start: регистрация и вход, T23. Вход в два режима: с приглашением и без, T24. Почта шифруется AES-256-GCM, поиск по HMAC-отпечатку, T25. Приглашение тратится при подтверждении кода, T26. Режим разработки показывает код входа на экране (+1 more)

### Community 26 - "Сервер: схема базы"
Cohesion: 0.14
Nodes (22): id(), time(), adminAuditLog, mediaFiles, profiles, postComments, postLikes, postPhotos (+14 more)

### Community 27 - "Общий договор: ядро и запросы"
Cohesion: 0.13
Nodes (13): AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse, authStartResponseSchema, AuthVerifyRequest, authVerifyRequestSchema (+5 more)

### Community 28 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 29 - "Сервер: вход и приглашения"
Cohesion: 0.23
Nodes (18): findUsableInviteId(), inviteIsUsable(), Session, startLogin(), verifyLogin(), decryptEmail(), encryptEmail(), generateLoginCode() (+10 more)

### Community 30 - "Документы: ядро и модули"
Cohesion: 0.26
Nodes (13): Ядро и модули: единое разделение кода, maintenance.ts — фоновая уборка сервера, Модуль «Лента» (единственный, кому можно обращаться к другому модулю), Модуль «Посты», Модуль «Истории» (срок жизни 24 часа), Уже сделано: вход, комнаты, дизайн, разделение ядро/модули, Оценки часов — грубые ориентиры для команды из двух человек, Часть 1. Соцсеть — делаем сейчас, остановка после каждой части (+5 more)

### Community 31 - "Документы: сроки хранения"
Cohesion: 0.20
Nodes (12): email_login_codes — одноразовые коды входа, invite_codes — коды приглашений с ролью, Сроки хранения данных, room_chat_messages — чат после второй ступени (позже), room_marks — тайные отметки (позже), room_matches и room_match_reveals (позже), room_reveal_cards — что открывается на ступенях (позже), P14. Сообщения чата удаляются через 90 дней (+4 more)

### Community 32 - "Группа 32"
Cohesion: 0.24
Nodes (15): changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), checkNickname(), NICKNAME_CHANGE_INTERVAL_DAYS (+7 more)

### Community 33 - "Группа 33"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 34 - "PostReportCard.tsx"
Cohesion: 0.06
Nodes (36): banAccount(), dismissPostReport(), removeReportedRecord(), author, postReport, roomReport, unbanAccount(), ACCOUNT_BAN_DAY_OPTIONS (+28 more)

### Community 35 - "Группа (tabs): index, voice, create, profile"
Cohesion: 0.20
Nodes (11): Expo Router: маршруты в src/app, ui/TabBar.tsx — плавающая панель вкладок, Группа (tabs): index, voice, create, profile, Tabs.Protected скрывает вкладки недоступных ролей, Главный экран: истории, строка войса, лента, Orb и RoomEntry — круглая «живая» кнопка входа в комнату, Нижнее меню: Лента, Войс, Создать, Профиль, T39. Вход в комнату — одна круглая кнопка (+3 more)

### Community 36 - "Группа 36"
Cohesion: 0.09
Nodes (22): Решить: «ещё раз» и раскрытие (F5), нужен юрист, Решить: подтверждение студента (G1), Решить: жалобы и удаление чужих записей (G10), Решить: деньги D1–D8, Что нужно решить управляющему, A10. Любая почта или определённые домены, A9. Одно общее приглашение или у каждого куратора свой код, D1. Российский хостинг (+14 more)

### Community 37 - "Группа 37"
Cohesion: 0.12
Nodes (16): dependencies, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4, expo-linking@~58.0.17, expo-router@~58.0.32, expo-secure-store@~58.0.3 (+8 more)

### Community 38 - "Группа 38"
Cohesion: 0.17
Nodes (12): livekit-client@^2.25.0, call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported (+4 more)

### Community 39 - "E9. Живой звук двух людей не проверен"
Cohesion: 0.13
Nodes (16): core/identity — единственный читатель persona_links, Таблица persona_links — единственная связь аккаунта с персоной, Правило 6: просмотр связи ник↔профиль админом — с причиной и журналом, P18. Три личности: аккаунт, профиль, персона, P2. Постоянный ник, смена раз в месяц, P7. Звук не записываем, T44. Пропуск LiveKit: только микрофон, только personaId и ник, T45. Вход в комнату с выключенным микрофоном (+8 more)

### Community 40 - "Группа 40"
Cohesion: 0.15
Nodes (21): Админка /v1/admin (позже), Будущие модули: друзья, сообщения, группы, новости, account_sanctions — санкции (позже), room_sanctions — mute, room_block, rooms_ban (по персоне), T85. Голосования и баны ведутся по персоне, а не по аккаунту, T88. Автобан: 3 комнаты за 7 дней — 7 дней без комнат, Автобан: 3 разных комнаты за 7 дней — бан на 7 дней, Сговор троих — три друга выгоняют любого (+13 more)

### Community 41 - "Группа 41"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 42 - "Группа 42"
Cohesion: 0.14
Nodes (13): MyProfileResponse, myProfileResponseSchema, PROFILE_ABOUT_MAX, PROFILE_COURSE_MAX, PROFILE_FACULTY_MAX, PROFILE_NAME_MAX, profileSchema, UpdateProfileRequest (+5 more)

### Community 43 - "Группа 43"
Cohesion: 0.36
Nodes (8): Дизайн в стиле Apple с «жидким стеклом», Фон экранов — один ровный цвет, Card — стеклянная поверхность (нативное стекло на iOS 26+), ui/theme.ts — цвета, шрифты, радиусы, ui/components.tsx — готовые элементы экранов, T36. Оформление в стиле Apple с «жидким стеклом», T37. Нативное стекло только на iOS 26+, T40. Однотонный фон без градиентов

### Community 44 - "stories/api.ts"
Cohesion: 0.26
Nodes (9): deleteStory(), getStoryViewers(), markStoryViewed(), author, story, StoryViewer(), styles, TextButton() (+1 more)

### Community 45 - "Модуль импортирует ядро; ядро и модули друг друга — нет"
Cohesion: 0.15
Nodes (13): api.ts в каждом модуле через request из lib/api.ts, Модуль импортирует ядро; ядро и модули друг друга — нет, Экраны src/app подключают модули — это не нарушение, Общие useFail и formatPostTime живут в src/lib, Структура: lib/ui — ядро, features/<модуль> — модули, features/rooms/usePersona — модуль сам грузит персону, Модуль пользуется ядром, ядро о модулях не знает; модули друг о друге не знают, Ядро и модули (схема) (+5 more)

### Community 46 - "Группа 46"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 47 - "Группа 47"
Cohesion: 0.15
Nodes (12): @app/shared@workspace:*, react-native-safe-area-context@~5.11.1, react-native-screens@~4.30.1, react-native-web@^0.21.4, @app/shared, main, name, private (+4 more)

### Community 48 - "Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем"
Cohesion: 0.07
Nodes (33): Аккаунт (почта, вход, баны) — только сервер и админы, anonymity.test.ts — автотест анонимности, Модуль «Голосовые комнаты», Название соцсети не выбрано; КубГУ не использовать, Персона комнат — анонимный ник, только у студентов, Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем, Правило 2: соцсеть не выдаёт персону косвенно, Правило 3: звук не записывается (без LiveKit egress) (+25 more)

### Community 49 - "P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1)"
Cohesion: 0.20
Nodes (11): Что строим: студенческая соцсеть, комнаты — один модуль, P1. Главная функция — анонимные голосовые комнаты (отменено P17), P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1), P19. Порядок работ — в ROADMAP.md, P20. Состав соцсети: аккаунт, профиль, посты, истории, лента, P27. Главный экран и нижнее меню, P29. Порядок частей: документы, профиль, посты, лента, истории, T50. Код разделён на ядро и модули (+3 more)

### Community 50 - "session.tsx"
Cohesion: 0.27
Nodes (10): getAccount(), PendingLogin, SessionContext, SessionContextValue, SessionProvider(), SessionState, useRole(), clearToken() (+2 more)

### Community 51 - "Группа 51"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 52 - "F5. Что открывается на ступенях раскрытия"
Cohesion: 0.12
Nodes (19): Отказы модерации: vote_in_progress, vote_cooldown, vote_not_possible, room_blocked, Профиль: /v1/profile и /v1/profiles/:id, События в реальном времени (WebSocket, позже), Модуль «Голосовые комнаты»: /v1/rooms/* (только студентам), «Ещё раз» и раскрытие: recent, marks, matches (позже), Модерация: state, votes, ballot, mutes, reports, Расписание и вход: slots, join, leave, Путь «вошёл → кнопка → в комнате» (+11 more)

### Community 53 - "T31. Web Push для напоминаний: в тексте только название и время"
Cohesion: 0.16
Nodes (15): Отложено: письма D3, хранилище D8, push на iPhone D4, админка, Где мы сейчас: части 0–5 соцсети сделаны, Уведомления: /v1/push/*, T13. Push: Expo Push и Web Push, без личных данных в тексте, T31. Web Push для напоминаний: в тексте только название и время, T32. Адрес подписки только от известных push-сервисов, T33. Напоминание уходит ровно один раз и только пока правдиво, T34. Push в приложениях iPhone/Android отложен (+7 more)

### Community 54 - "Часть 3. Лента и главный экран"
Cohesion: 0.10
Nodes (20): boot.test.ts — тест настоящего запуска сервера, Команды: pnpm check, dev:server, dev:web, livekit-server --dev, После каждой задачи — /graphify ., Тестовые коды приглашения TEST/TEACHER/GUEST-2026, Модуль «Лента»: GET /v1/feed, W2. Graphify локально, /graphify . после каждой задачи, Как делается часть: shared, сервер, тесты, приложение, браузер, документы, graphify, 06:35 — достигнут лимит использования (+12 more)

### Community 55 - "lib/api.ts"
Cohesion: 0.18
Nodes (12): API_URL, authVerify(), fetchHealth(), getProfile(), getProfileById(), logout(), networkError(), RequestOptions (+4 more)

### Community 56 - "Группа 56"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 57 - "Группа 57"
Cohesion: 0.13
Nodes (17): Интерфейс MediaStorage — подменяемое хранилище фото, Правило 5: без телефона, документов и зарубежных облаков; стирать EXIF, Открытый профиль — вопросы юристу C8–C12, Обработка фото: уменьшение и стирание места съёмки, Хранилище фото: диск при разработке, облако для запуска (D8), Безопасность и данные: почта зашифрована, секреты в окружении, T55. Фото на диске за интерфейсом хранилища, T56. Фото пересохраняются: уменьшение и стирание EXIF (+9 more)

### Community 58 - "admin.ts"
Cohesion: 0.08
Nodes (25): ADMIN_ACCOUNT_BAN_MAX_DAYS, ADMIN_ACTION_LABEL, ADMIN_ACTIONS, ADMIN_PAGE_SIZE, ADMIN_ROOMS_BAN_MAX_DAYS, AdminAccountBanRequest, adminAccountBanRequestSchema, AdminAction (+17 more)

### Community 59 - "Правила ночи: не останавливаться, не тратить, не выдумывать, не ломать"
Cohesion: 0.07
Nodes (29): CLAUDE.md — инструкция проекта, Работа с помощниками на дешёвой модели (не безопасность и схема данных), Никаких платных трат без согласования, Правило 8: не делать функции вне текущего этапа, docs/API.md — список запросов, docs/ARCHITECTURE.md — архитектура, Ошибки: GlitchTip на своём сервере, docs/DECISIONS.md — журнал решений (+21 more)

### Community 60 - "schema/index.ts"
Cohesion: 0.16
Nodes (16): broadcastPush(), personaLinks, accounts, personas, roomPersonalMutes, roomReports, roomSanctions, roomVoteBallots (+8 more)

### Community 61 - "Группа 61"
Cohesion: 0.29
Nodes (7): devDependencies, @types/react@~19.3.0, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, @types/react

### Community 62 - "Группа 62"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

### Community 63 - "Группа 63"
Cohesion: 0.18
Nodes (6): ERROR_CODES, ErrorCode, ErrorResponse, errorResponseSchema, slotSchema, SlotsResponse

### Community 64 - "Группа 64"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 66 - "posts/posts.ts"
Cohesion: 0.10
Nodes (19): Author, COMMENT_TEXT_MAX, COMMENTS_PAGE_SIZE, commentSchema, CommentsPage, commentsPageSchema, CreateCommentRequest, createCommentRequestSchema (+11 more)

### Community 67 - "features/rooms/moderation.ts"
Cohesion: 0.16
Nodes (18): castBallot(), clockFormat, dayFormat, NO_VOTES_TEXT, secondsLeft(), VOTE_BUSY_HINT, voteAboutMeText(), voteBannerText() (+10 more)

### Community 69 - "Группа 69"
Cohesion: 0.33
Nodes (6): P11. Не собираем ФИО, телефон, документы, P21. Профиль после регистрации; частично отменяет P11, P28. Удаление аккаунта удаляет профиль, посты, истории, фото, F14. Закрыто: удаление аккаунта удаляет всё (P28), F2. Закрыто: поля профиля (P21), G7. Обязательные поля профиля

### Community 70 - "app.ts"
Cohesion: 0.15
Nodes (15): AppDeps, buildApp(), errorBody(), ALLOWED_PUSH_HOSTS, BroadcastDeps, isAllowedPushEndpoint(), PushGateway, PushTarget (+7 more)

### Community 71 - "Группа 71"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 72 - "stories/api.ts"
Cohesion: 0.15
Nodes (15): okResponseSchema, authorSchema, postPhotoSchema, CreateStoryRequest, createStoryRequestSchema, StoriesResponse, storiesResponseSchema, Story (+7 more)

### Community 73 - "useFeed.ts"
Cohesion: 0.19
Nodes (8): getFeed(), post, FeedPage, mergeFirstPage(), Feed, FeedState, useFeed(), Post

### Community 74 - "Группа 74"
Cohesion: 0.67
Nodes (3): ios/ и android/ не править руками (Continuous Native Generation), Нативные модули требуют development build, EAS: облачная сборка, отправка и OTA-обновления

### Community 77 - "Группа 77"
Cohesion: 0.67
Nodes (3): Файл как передача дел между сессиями Claude, Одна сессия за раз: отметка .claude/night-heartbeat (25 минут), Перед продолжением — git status и pnpm check, git stash -u при непонятном

### Community 87 - "media.ts"
Cohesion: 0.25
Nodes (7): MEDIA_MAX_BYTES, MEDIA_PURPOSES, MEDIA_TYPES, MediaPurpose, mediaPurposeSchema, UploadMediaResponse, uploadMediaResponseSchema

### Community 90 - "core/push.ts"
Cohesion: 0.25
Nodes (7): PushConfigResponse, pushConfigResponseSchema, pushMessageSchema, PushSubscribeRequest, pushSubscribeRequestSchema, PushUnsubscribeRequest, pushUnsubscribeRequestSchema

### Community 92 - "PostPhotos.tsx"
Cohesion: 0.47
Nodes (5): heightFor(), PostPhotos(), styles, mediaUrl(), PostPhoto

### Community 100 - "T57. Ник и персона — только студентам при первом входе в «Войс»"
Cohesion: 0.33
Nodes (6): Персона: GET /v1/rooms/me, PUT nickname, T27. Правила ника: 3–20 символов, уникальность без регистра и «ё», T54. Ник комнат выбирается сразу после регистрации (отменено T57), T57. Ник и персона — только студентам при первом входе в «Войс», T65. Профиль не обязателен для комнат на уровне сервера, F4. Закрыто: ник при первом входе в «Войс» (T57)

## Knowledge Gaps
- **138 isolated node(s):** `expo/tsconfig.base`, `docs/NIGHT_PLAN.md — ночной план 22 ноября 2026`, `docs/NIGHT_REPORT.md — отчёт за ночь`, `A17. Ошибся в нике: ждать 30 дней или правка`, `G18. Видео в постах и историях` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 552 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useColors` to `Приложение: оболочка, сессия, навигация`, `PostReportCard.tsx`, `Приложение: общие элементы экрана и микрофон`, `request`, `Группа 37`, `rooms/api.ts`, `Группа 38`, `features/rooms/moderation.ts`, `AdminScreen.tsx`, `create.tsx`, `useFeed.ts`, `stories/api.ts`, `ErrorText`, `Группа 47`, `session.tsx`, `PostPhotos.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `docs/NIGHT_PLAN.md — ночной план 22 ноября 2026`, `docs/NIGHT_REPORT.md — отчёт за ночь` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `moderation/service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10873440285204991 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Сервер: схема базы` to `moderation/service.ts`, `Группа 32`, `Сервер: настройки и зависимости`, `app.ts`, `Сервер: тесты анонимности и запуска`, `Сервер: аккаунт, удаление, фото`, `entry/service.ts`, `src/index.ts`, `admin.test.ts`, `posts/service.ts`, `admin/service.ts`, `stories/service.ts`, `schema/index.ts`, `Сервер: вход и приглашения`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `Приложение: оболочка, сессия, навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.1425339366515837 - nodes in this community are weakly interconnected._
- **Why does `Часть 1. Соцсеть — делаем сейчас, остановка после каждой части` connect `Документы: ядро и модули` to `Документы: маршруты приложения`, `P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1)`, `Группа 40`, `T31. Web Push для напоминаний: в тексте только название и время`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Should `Приложение: общие элементы экрана и микрофон` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._