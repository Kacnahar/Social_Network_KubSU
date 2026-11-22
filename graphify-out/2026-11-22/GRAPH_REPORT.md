# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 200 files · ~91,000 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 1640 nodes · 4495 edges · 97 communities (67 shown, 30 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 229 edges (avg confidence: 0.81)
- Token cost: 0 input · 582,684 output

## Graph Freshness
- Built from commit: `3cee1aa8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Комнаты: правила модерации и расписание
- Приложение: оболочка, сессия, навигация
- Приложение: общие элементы экрана и микрофон
- Сервер: настройки и зависимости
- request
- rooms/api.ts
- VoiceGateway
- Сервер: тесты анонимности и запуска
- Сервер: аккаунт, удаление, фото
- Приложение: вход в комнату и шар
- create.tsx
- push/service.ts
- Документы: санкции и модерация
- ErrorText
- client.ts
- Документы: запросы и коды ошибок
- useColors
- posts/service.ts
- Документы: таблицы ядра
- admin/service.ts
- Приложение: настройки Expo
- Документы: экран модерации комнаты
- stories/service.ts
- Что нужно решить управляющему
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
- AdminScreen.tsx
- Группа (tabs): index, voice, create, profile
- Группа 36
- Группа 37
- Группа 38
- Группа 39
- Группа 40
- Группа 41
- Группа 42
- Группа 43
- stories/api.ts
- Модуль импортирует ядро; ядро и модули друг друга — нет
- Группа 46
- Группа 47
- Группа 48
- P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1)
- Группа 50
- Группа 51
- F5. Что открывается на ступенях раскрытия
- T31. Web Push для напоминаний: в тексте только название и время
- Часть 5: модерация комнат голосованием — готово
- ApiError
- Группа 56
- Группа 57
- Группа 58
- Правила ночи: не останавливаться, не тратить, не выдумывать, не ломать
- Группа 61
- Группа 62
- Группа 63
- Группа 64
- Группа 65
- Группа 68
- Группа 69
- Группа 71
- Группа 73
- Группа 74
- Группа 75
- Группа 77
- Группа 78
- Группа 79
- Группа 80
- Группа 81
- Группа 83
- Группа 84
- Группа 85
- Группа 86
- Группа 88
- Группа 89
- Группа 91
- Группа 93
- Группа 94
- Группа 95
- Группа 97
- Группа 98
- Группа 99
- Группа 101
- Группа 102
- Группа 103
- Группа 104
- Группа 105
- Группа 107
- Группа 108

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 64 edges
2. `Button()` - 58 edges
3. `useSignedIn()` - 57 edges
4. `request()` - 56 edges
5. `Body()` - 53 edges
6. `ApiError` - 50 edges
7. `react` - 46 edges
8. `ErrorText()` - 41 edges
9. `Card()` - 40 edges
10. `react-native` - 34 edges

## Surprising Connections (you probably didn't know these)
- `А4. Соцсеть и анонимность комнат` --semantically_similar_to--> `Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md
- `persona_links — мост аккаунт ↔ персона` --semantically_similar_to--> `Таблица persona_links — единственная связь аккаунта с персоной`  [INFERRED] [semantically similar]
  docs/DATA_MODEL.md → CLAUDE.md
- `Роли и права в одном месте общего кода` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Запреты проверяет сервер; чего нельзя — не видно` --semantically_similar_to--> `Запреты проверяет сервер, а не экран`  [INFERRED] [semantically similar]
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

## Communities (97 total, 30 thin omitted)

### Community 0 - "Комнаты: правила модерации и расписание"
Cohesion: 0.05
Nodes (60): clockFormat, dayFormat, formatBlockedUntil(), isInFuture(), minutesLeft(), NO_VOTES_TEXT, secondsLeft(), VOTE_BUSY_HINT (+52 more)

### Community 1 - "Приложение: оболочка, сессия, навигация"
Cohesion: 0.13
Nodes (48): Navigation(), RootLayout(), LoginScreen(), Mode, LoadState, PostScreen(), ProfileEditScreen(), ProfileSetupScreen() (+40 more)

### Community 2 - "Приложение: общие элементы экрана и микрофон"
Cohesion: 0.09
Nodes (35): FeedScreen(), TabsLayout(), MicButton(), MicIcon(), Props, styles, createStyles(), Orb() (+27 more)

### Community 3 - "Сервер: настройки и зависимости"
Cohesion: 0.06
Nodes (45): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+37 more)

### Community 4 - "request"
Cohesion: 0.23
Nodes (15): addComment(), createPost(), deleteComment(), deletePost(), getComments(), getPost(), getProfilePosts(), likePost() (+7 more)

### Community 5 - "rooms/api.ts"
Cohesion: 0.15
Nodes (16): castBallot(), getPersona(), getRoomState(), getSlots(), joinRoom(), leaveRoom(), reportToAdmins(), setNickname() (+8 more)

### Community 7 - "Сервер: тесты анонимности и запуска"
Cohesion: 0.12
Nodes (14): sourceFiles(), serverDir, loadConfig(), createInviteCode(), MemoryMediaStorage, createDb(), inviteCodes, CapturingMailer (+6 more)

### Community 8 - "Сервер: аккаунт, удаление, фото"
Cohesion: 0.09
Nodes (48): AccountStanding, deleteAccount(), forbidden(), getAccountStanding(), isBanned(), requireCapability(), endSession(), ApiError (+40 more)

### Community 9 - "Приложение: вход в комнату и шар"
Cohesion: 0.24
Nodes (11): RoomEntry(), styles, describeRooms(), RoomsStatus, now, SlotRow(), styles, formatSlotStart() (+3 more)

### Community 10 - "create.tsx"
Cohesion: 0.17
Nodes (18): CreateScreen(), Kind, KINDS, Picked, styles, Picked, StoryComposer(), styles (+10 more)

### Community 11 - "push/service.ts"
Cohesion: 0.05
Nodes (53): buildApp(), errorBody(), Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, ScheduleConfig, VapidConfig (+45 more)

### Community 12 - "Документы: санкции и модерация"
Cohesion: 0.14
Nodes (22): P6. Модерация голосованием участников, без ведущего, T86. Пороги голосований: выгнать ≥3 и ≥1/3, микрофон 2 голоса, окно 60 с, T87. «Выгнали» закрывает вход во все комнаты на 24 часа, T89. Выключенный микрофон не возвращается перезаходом, T90. Кто голосовал — не раскрывается, T92. «Заглушить для себя» — только у меня, сохраняется, T93. «Сообщить админам» записывает жалобу, Связь с админами: «Сообщить админам», почта, действия админа (+14 more)

### Community 13 - "ErrorText"
Cohesion: 0.15
Nodes (29): MyProfileScreen(), FeedList(), FeedListProps, Row, styles, CommentsCardProps, State, styles (+21 more)

### Community 14 - "client.ts"
Cohesion: 0.09
Nodes (35): AppDeps, authenticate(), deletePersonaOfAccount(), findPersonaId(), getOrCreatePersonaId(), findProfileId(), Db, DbHandle (+27 more)

### Community 15 - "Документы: запросы и коды ошибок"
Cohesion: 0.10
Nodes (27): Исключение: feed берёт карточку поста из posts и кружки из stories, Коды ошибок, Модуль «Лента»: GET /v1/feed, Фото: POST/GET /v1/media, Модуль «Посты»: /v1/posts/*, Отказ profile_required — заполните профиль, Модуль «Истории»: /v1/stories/*, P24. Посты: текст и до 10 фото, лайки, комментарии (+19 more)

### Community 16 - "useColors"
Cohesion: 0.08
Nodes (42): heightFor(), PostPhotos(), styles, kickButtonTitle(), Mode, ParticipantActions(), Props, styles (+34 more)

### Community 17 - "posts/service.ts"
Cohesion: 0.06
Nodes (56): getFeed(), post, FeedPage, mergeFirstPage(), Feed, FeedState, useFeed(), cursorQuery (+48 more)

### Community 18 - "Документы: таблицы ядра"
Cohesion: 0.10
Nodes (28): accounts — закрытый аккаунт (email_encrypted, email_hash, role, status), admins и admin_audit_log — журнал админов (позже), Лента не имеет таблиц, Три группы таблиц: ядро, комнаты, мост (плюс посты и истории), media_files — загруженные фото, persona_links — мост аккаунт ↔ персона, post_comments — комментарии, post_likes — лайки (+20 more)

### Community 19 - "admin/service.ts"
Cohesion: 0.06
Nodes (59): banFromRooms(), closeRoomReport(), dismissPostReport(), liftRoomsBan(), listAdminLog(), listPostReports(), listRoomReports(), removeReportedRecord() (+51 more)

### Community 20 - "Приложение: настройки Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 21 - "Документы: экран модерации комнаты"
Cohesion: 0.06
Nodes (33): Call.setLocallyMuted — «заглушить для себя», ParticipantActions, VoteBanner, moderation.ts, useRoomState — опрос состояния комнаты каждые 2,5 с, Приложение: Expo + React Native + TypeScript, База: PostgreSQL + Drizzle (при разработке встроенная), Всё серверное — на российском хостинге, Почта: российский сервис, не подключена, Push: Web Push в браузере, телефоны позже (+25 more)

### Community 22 - "stories/service.ts"
Cohesion: 0.10
Nodes (35): deleteMedia(), MediaDeps, stories, storyViews, purgeUnusedMedia(), runMaintenance(), startMaintenance(), idParam (+27 more)

### Community 23 - "Что нужно решить управляющему"
Cohesion: 0.20
Nodes (10): Название соцсети не выбрано; КубГУ не использовать, Решить: название проекта (F1), Решить: «ещё раз» и раскрытие (F5), нужен юрист, Решить: жалобы и удаление чужих записей (G10), Решить: деньги D1–D8, Что нужно решить управляющему, B2. Можно ли использовать название «КубГУ», D1. Российский хостинг (+2 more)

### Community 24 - "Документы: маршруты приложения"
Cohesion: 0.09
Nodes (24): Профиль соцсети — открытая личность, requireCapability и can() — проверка прав ролей, requireProfile(db, accountId, capability), Автотесты ролей (обход t.routes), Роли: студент, преподаватель, гость, Правило 9: удаление аккаунта удаляет всё, Роли и права в одном месте общего кода, P22. Одна роль на аккаунт: студент, преподаватель, гость (+16 more)

### Community 25 - "Вход: /v1/auth/start, verify, logout"
Cohesion: 0.28
Nodes (9): Вход: /v1/auth/start, verify, logout, Защита кода из письма: 6 цифр, 10 минут, 5 попыток, Режим разработки: devCode в ответе, Два режима auth/start: регистрация и вход, T23. Вход в два режима: с приглашением и без, T24. Почта шифруется AES-256-GCM, поиск по HMAC-отпечатку, T25. Приглашение тратится при подтверждении кода, T26. Режим разработки показывает код входа на экране (+1 more)

### Community 26 - "Сервер: схема базы"
Cohesion: 0.17
Nodes (19): newPost(), newReportedPost(), id(), time(), adminAuditLog, mediaFiles, profiles, postComments (+11 more)

### Community 27 - "Общий договор: ядро и запросы"
Cohesion: 0.09
Nodes (24): API_URL, deleteAccount(), RequestOptions, AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse (+16 more)

### Community 28 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 29 - "Сервер: вход и приглашения"
Cohesion: 0.14
Nodes (21): AuthDeps, findUsableInviteId(), inviteIsUsable(), Session, startLogin(), verifyLogin(), decryptEmail(), encryptEmail() (+13 more)

### Community 30 - "Документы: ядро и модули"
Cohesion: 0.26
Nodes (13): Ядро и модули: единое разделение кода, maintenance.ts — фоновая уборка сервера, Модуль «Лента» (единственный, кому можно обращаться к другому модулю), Модуль «Посты», Модуль «Истории» (срок жизни 24 часа), Уже сделано: вход, комнаты, дизайн, разделение ядро/модули, Оценки часов — грубые ориентиры для команды из двух человек, Часть 1. Соцсеть — делаем сейчас, остановка после каждой части (+5 more)

### Community 31 - "Документы: сроки хранения"
Cohesion: 0.20
Nodes (12): email_login_codes — одноразовые коды входа, invite_codes — коды приглашений с ролью, Сроки хранения данных, room_chat_messages — чат после второй ступени (позже), room_marks — тайные отметки (позже), room_matches и room_match_reveals (позже), room_reveal_cards — что открывается на ступенях (позже), P14. Сообщения чата удаляются через 90 дней (+4 more)

### Community 32 - "Группа 32"
Cohesion: 0.27
Nodes (9): checkNickname(), NICKNAME_CHANGE_INTERVAL_DAYS, NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH, NICKNAME_PROBLEM_TEXT, nicknameKey(), NicknameProblem, normalizeNickname() (+1 more)

### Community 33 - "Группа 33"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 34 - "AdminScreen.tsx"
Cohesion: 0.08
Nodes (43): AdminRoute(), AdminList(), AdminScreen(), ListProps, LogSection(), PostsSection(), RoomsSection(), Section (+35 more)

### Community 35 - "Группа (tabs): index, voice, create, profile"
Cohesion: 0.18
Nodes (12): Expo Router: маршруты в src/app, ui/TabBar.tsx — плавающая панель вкладок, Группа (tabs): index, voice, create, profile, Tabs.Protected скрывает вкладки недоступных ролей, Главный экран: истории, строка войса, лента, Orb и RoomEntry — круглая «живая» кнопка входа в комнату, Нижнее меню: Лента, Войс, Создать, Профиль, P27. Главный экран и нижнее меню (+4 more)

### Community 36 - "Группа 36"
Cohesion: 0.12
Nodes (17): Решить: подтверждение студента (G1), A10. Любая почта или определённые домены, A9. Одно общее приглашение или у каждого куратора свой код, F10. Показывать ли статус «в сети», F11. Узнавание друзей по голосу — предупреждать ли, F13. Кто создаёт группы и публикует новости, F8. Поиск людей и видимость списков друзей, G1. Как подтверждать, что человек — студент (+9 more)

### Community 37 - "Группа 37"
Cohesion: 0.12
Nodes (16): dependencies, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4, expo-linking@~58.0.17, expo-router@~58.0.32, expo-secure-store@~58.0.3 (+8 more)

### Community 38 - "Группа 38"
Cohesion: 0.17
Nodes (12): livekit-client@^2.25.0, call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported (+4 more)

### Community 39 - "Группа 39"
Cohesion: 0.13
Nodes (16): core/identity — единственный читатель persona_links, Таблица persona_links — единственная связь аккаунта с персоной, Правило 6: просмотр связи ник↔профиль админом — с причиной и журналом, Общие правила: JSON, HTTPS, Bearer-токен, ошибки по-русски, Ни один ответ не содержит accountId или почту, Только модуль комнат отдаёт personaId и ник, Роли и отказы: 403 forbidden, Баны и подсчёт «выгнали из 3 комнат» — по аккаунту (+8 more)

### Community 40 - "Группа 40"
Cohesion: 0.15
Nodes (21): Админка /v1/admin (позже), Будущие модули: друзья, сообщения, группы, новости, account_sanctions — санкции (позже), T68. Публикация требует профиля и подходящей роли, T69. Жаловаться может любой вошедший, включая гостя, T85. Голосования и баны ведутся по персоне, а не по аккаунту, T88. Автобан: 3 комнаты за 7 дней — 7 дней без комнат, Автобан: 3 разных комнаты за 7 дней — бан на 7 дней (+13 more)

### Community 41 - "Группа 41"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 42 - "Группа 42"
Cohesion: 0.15
Nodes (11): MyProfileResponse, myProfileResponseSchema, PROFILE_ABOUT_MAX, PROFILE_COURSE_MAX, PROFILE_FACULTY_MAX, PROFILE_NAME_MAX, profileSchema, UpdateProfileRequest (+3 more)

### Community 43 - "Группа 43"
Cohesion: 0.36
Nodes (8): Дизайн в стиле Apple с «жидким стеклом», Фон экранов — один ровный цвет, Card — стеклянная поверхность (нативное стекло на iOS 26+), ui/theme.ts — цвета, шрифты, радиусы, ui/components.tsx — готовые элементы экранов, T36. Оформление в стиле Apple с «жидким стеклом», T37. Нативное стекло только на iOS 26+, T40. Однотонный фон без градиентов

### Community 44 - "stories/api.ts"
Cohesion: 0.31
Nodes (7): createStory(), deleteStory(), getStories(), getStoryViewers(), markStoryViewed(), author, story

### Community 45 - "Модуль импортирует ядро; ядро и модули друг друга — нет"
Cohesion: 0.15
Nodes (13): api.ts в каждом модуле через request из lib/api.ts, Модуль импортирует ядро; ядро и модули друг друга — нет, Экраны src/app подключают модули — это не нарушение, Общие useFail и formatPostTime живут в src/lib, Структура: lib/ui — ядро, features/<модуль> — модули, features/rooms/usePersona — модуль сам грузит персону, Модуль пользуется ядром, ядро о модулях не знает; модули друг о друге не знают, Ядро и модули (схема) (+5 more)

### Community 46 - "Группа 46"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 47 - "Группа 47"
Cohesion: 0.15
Nodes (12): @app/shared@workspace:*, react-native-safe-area-context@~5.11.1, react-native-screens@~4.30.1, react-native-web@^0.21.4, @app/shared, main, name, private (+4 more)

### Community 48 - "Группа 48"
Cohesion: 0.16
Nodes (14): Аккаунт (почта, вход, баны) — только сервер и админы, anonymity.test.ts — автотест анонимности, Модуль «Голосовые комнаты», Персона комнат — анонимный ник, только у студентов, Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем, Правило 2: соцсеть не выдаёт персону косвенно, Правило 3: звук не записывается (без LiveKit egress), Правило 4: невзаимные отметки не видит никто (+6 more)

### Community 49 - "P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1)"
Cohesion: 0.22
Nodes (10): Что строим: студенческая соцсеть, комнаты — один модуль, P1. Главная функция — анонимные голосовые комнаты (отменено P17), P17. Проект — соцсеть; комнаты — один из модулей (отменяет P1), P19. Порядок работ — в ROADMAP.md, P20. Состав соцсети: аккаунт, профиль, посты, истории, лента, P29. Порядок частей: документы, профиль, посты, лента, истории, T50. Код разделён на ядро и модули, T51. Запросы комнат под /v1/rooms, пакеты @app/* (+2 more)

### Community 50 - "Группа 50"
Cohesion: 0.32
Nodes (7): getAccount(), getProfile(), logout(), SessionProvider(), clearToken(), loadToken(), saveToken()

### Community 51 - "Группа 51"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 52 - "F5. Что открывается на ступенях раскрытия"
Cohesion: 0.11
Nodes (20): Отказы модерации: vote_in_progress, vote_cooldown, vote_not_possible, room_blocked, Профиль: /v1/profile и /v1/profiles/:id, События в реальном времени (WebSocket, позже), Модуль «Голосовые комнаты»: /v1/rooms/* (только студентам), «Ещё раз» и раскрытие: recent, marks, matches (позже), Модерация: state, votes, ballot, mutes, reports, Персона: GET /v1/rooms/me, PUT nickname, Расписание и вход: slots, join, leave (+12 more)

### Community 53 - "T31. Web Push для напоминаний: в тексте только название и время"
Cohesion: 0.09
Nodes (25): Отложено: письма D3, хранилище D8, push на iPhone D4, админка, Работа с помощниками на дешёвой модели (не безопасность и схема данных), Никаких платных трат без согласования, Где мы сейчас: части 0–5 соцсети сделаны, Уведомления: /v1/push/*, Ошибки: GlitchTip на своём сервере, P12. Серверы и голос на российском хостинге (152-ФЗ), T11. GlitchTip вместо облачного Sentry (+17 more)

### Community 54 - "Часть 5: модерация комнат голосованием — готово"
Cohesion: 0.08
Nodes (25): После части 5 — остановиться, 06:35 — достигнут лимит использования, Часть 5. Модерация комнат голосованием, 15:10 — очередь выполнена, Раздел «Состояние»: хронология сессий, Истории отмечены «сделано» преждевременно — нужна проверка, Проверка вдвоём с живым звуком, Остановка: закончился лимит около 06:35 (+17 more)

### Community 55 - "ApiError"
Cohesion: 0.25
Nodes (7): ApiError, authVerify(), fetchHealth(), getProfileById(), networkError(), profile, updateProfile()

### Community 56 - "Группа 56"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 57 - "Группа 57"
Cohesion: 0.13
Nodes (17): Интерфейс MediaStorage — подменяемое хранилище фото, Правило 5: без телефона, документов и зарубежных облаков; стирать EXIF, Открытый профиль — вопросы юристу C8–C12, Обработка фото: уменьшение и стирание места съёмки, Хранилище фото: диск при разработке, облако для запуска (D8), Безопасность и данные: почта зашифрована, секреты в окружении, T55. Фото на диске за интерфейсом хранилища, T56. Фото пересохраняются: уменьшение и стирание EXIF (+9 more)

### Community 58 - "Группа 58"
Cohesion: 0.25
Nodes (7): boot.test.ts — тест настоящего запуска сервера, Команды: pnpm check, dev:server, dev:web, livekit-server --dev, После каждой задачи — /graphify ., Тестовые коды приглашения TEST/TEACHER/GUEST-2026, W2. Graphify локально, /graphify . после каждой задачи, Как делается часть: shared, сервер, тесты, приложение, браузер, документы, graphify, Как посмотреть: тестовые коды и «Тестовая комната»

### Community 59 - "Правила ночи: не останавливаться, не тратить, не выдумывать, не ломать"
Cohesion: 0.11
Nodes (19): CLAUDE.md — инструкция проекта, Правило 8: не делать функции вне текущего этапа, docs/API.md — список запросов, docs/ARCHITECTURE.md — архитектура, docs/DECISIONS.md — журнал решений, docs/MODERATION_RULES.md — роли, записи, модерация, pnpm check зелёный перед каждым коммитом, Спорное — значение по умолчанию из OPEN_QUESTIONS (+11 more)

### Community 61 - "Группа 61"
Cohesion: 0.29
Nodes (7): devDependencies, @types/react@~19.3.0, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, @types/react

### Community 62 - "Группа 62"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

### Community 63 - "Группа 63"
Cohesion: 0.29
Nodes (4): ERROR_CODES, ErrorCode, ErrorResponse, errorResponseSchema

### Community 64 - "Группа 64"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 69 - "Группа 69"
Cohesion: 0.33
Nodes (6): P11. Не собираем ФИО, телефон, документы, P21. Профиль после регистрации; частично отменяет P11, P28. Удаление аккаунта удаляет профиль, посты, истории, фото, F14. Закрыто: удаление аккаунта удаляет всё (P28), F2. Закрыто: поля профиля (P21), G7. Обязательные поля профиля

### Community 71 - "Группа 71"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 74 - "Группа 74"
Cohesion: 0.67
Nodes (3): ios/ и android/ не править руками (Continuous Native Generation), Нативные модули требуют development build, EAS: облачная сборка, отправка и OTA-обновления

### Community 77 - "Группа 77"
Cohesion: 0.67
Nodes (3): Файл как передача дел между сессиями Claude, Одна сессия за раз: отметка .claude/night-heartbeat (25 минут), Перед продолжением — git status и pnpm check, git stash -u при непонятном

## Knowledge Gaps
- **138 isolated node(s):** `expo/tsconfig.base`, `docs/NIGHT_PLAN.md — ночной план 22 ноября 2026`, `docs/NIGHT_REPORT.md — отчёт за ночь`, `A17. Ошибся в нике: ждать 30 дней или правка`, `G18. Видео в постах и историях` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 473 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AdminScreen.tsx` to `Приложение: оболочка, сессия, навигация`, `Приложение: общие элементы экрана и микрофон`, `Группа 37`, `rooms/api.ts`, `Группа 38`, `Приложение: вход в комнату и шар`, `create.tsx`, `ErrorText`, `Группа 47`, `useColors`, `posts/service.ts`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `docs/NIGHT_PLAN.md — ночной план 22 ноября 2026`, `docs/NIGHT_REPORT.md — отчёт за ночь` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Комнаты: правила модерации и расписание` be split into smaller, more focused modules?**
  _Cohesion score 0.051577152600170505 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Сервер: схема базы` to `Комнаты: правила модерации и расписание`, `Сервер: настройки и зависимости`, `Сервер: тесты анонимности и запуска`, `Сервер: аккаунт, удаление, фото`, `push/service.ts`, `client.ts`, `posts/service.ts`, `admin/service.ts`, `stories/service.ts`, `Сервер: вход и приглашения`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `Приложение: оболочка, сессия, навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.13224043715846995 - nodes in this community are weakly interconnected._
- **Why does `Часть 2. Довести до пилота` connect `Группа 40` to `Группа 36`, `F5. Что открывается на ступенях раскрытия`, `Часть 5: модерация комнат голосованием — готово`, `Документы: ядро и модули`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `Приложение: общие элементы экрана и микрофон` be split into smaller, more focused modules?**
  _Cohesion score 0.08826945412311266 - nodes in this community are weakly interconnected._