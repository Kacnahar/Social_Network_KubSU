# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 194 files · ~83,363 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (top: (none) 2, .example 1)

## Summary
- 1529 nodes · 4047 edges · 109 communities (73 shown, 36 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 228 edges (avg confidence: 0.81)
- Token cost: 0 input · 22,000 output

## Community Hubs (Navigation)
- Комнаты: правила модерации и расписание
- Приложение: оболочка, сессия, навигация
- Приложение: общие элементы экрана и микрофон
- Сервер: настройки и зависимости
- Приложение: посты
- Приложение: запросы комнат и историй
- Сервер: вход в комнату и персона
- Сервер: тесты анонимности и запуска
- Сервер: аккаунт, удаление, фото
- Приложение: вход в комнату и шар
- Приложение: вход и регистрация
- Сервер: сборка приложения и маршруты
- Документы: санкции и модерация
- Приложение: лента
- Сервер: напоминания и уведомления
- Документы: запросы и коды ошибок
- Приложение: экран комнаты
- Сервер: посты
- Документы: таблицы ядра
- Общий договор: посты
- Приложение: настройки Expo
- Документы: экран модерации комнаты
- Сервер: истории и лента
- Документы: решения о звуке
- Документы: маршруты приложения
- Документы: вход по коду
- Сервер: схема базы
- Общий договор: ядро и запросы
- Настройки TypeScript
- Сервер: вход и приглашения
- Документы: ядро и модули
- Документы: сроки хранения
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
- Группа 70
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
- Группа 81
- Группа 83
- Группа 84
- Группа 85
- Группа 86
- Группа 87
- Группа 88
- Группа 89
- Группа 90
- Группа 91
- Группа 92
- Группа 93
- Группа 94
- Группа 95
- Группа 96
- Группа 97
- Группа 98
- Группа 99
- Группа 100
- Группа 101
- Группа 102
- Группа 103
- Группа 104
- Группа 105
- Группа 106
- Группа 107
- Группа 108

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 57 edges
2. `useSignedIn()` - 51 edges
3. `Button()` - 51 edges
4. `request()` - 47 edges
5. `Body()` - 47 edges
6. `ApiError` - 47 edges
7. `react` - 42 edges
8. `ErrorText()` - 35 edges
9. `Card()` - 34 edges
10. `useSession()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `А4. Соцсеть и анонимность комнат` --semantically_similar_to--> `Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md
- `Три личности одного человека` --semantically_similar_to--> `Три личности: аккаунт, профиль соцсети, персона комнат`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Что строим: студенческая соцсеть, комнаты — один модуль` --semantically_similar_to--> `Три личности: аккаунт, профиль соцсети, персона комнат`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Роли и права в одном месте общего кода` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `Запреты проверяет сервер; чего нельзя — не видно` --semantically_similar_to--> `Запреты проверяет сервер, а не экран`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]
- **Правила анонимности комнат** — claude_rule1, claude_rule2, claude_rule4, claude_rule6, claude_persona_links, claude_anon_test [EXTRACTED 1.00]
- **Цепочка аккаунт → мост → персона** — docs_data_model_accounts, docs_data_model_persona_links, docs_data_model_room_personas [EXTRACTED 1.00]
- **Решения по модерации комнат (T85–T93)** — docs_decisions_t85, docs_decisions_t86, docs_decisions_t87, docs_decisions_t88, docs_decisions_t89, docs_decisions_t90, docs_decisions_t91, docs_decisions_t92, docs_decisions_t93 [EXTRACTED 1.00]

## Communities (109 total, 36 thin omitted)

### Community 0 - "Комнаты: правила модерации и расписание"
Cohesion: 0.06
Nodes (59): clockFormat, dayFormat, kickButtonTitle(), NO_VOTES_TEXT, VOTE_BUSY_HINT, voteHint(), votesWord(), Mode (+51 more)

### Community 1 - "Приложение: оболочка, сессия, навигация"
Cohesion: 0.13
Nodes (45): Navigation(), RootLayout(), LoadState, PostScreen(), ProfileEditScreen(), ProfileSetupScreen(), LoadState, ProfileByIdScreen() (+37 more)

### Community 2 - "Приложение: общие элементы экрана и микрофон"
Cohesion: 0.08
Nodes (38): TabsLayout(), Props, styles, createStyles(), Orb(), OrbProps, useLoop(), useSlots() (+30 more)

### Community 3 - "Сервер: настройки и зависимости"
Cohesion: 0.06
Nodes (45): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+37 more)

### Community 4 - "Приложение: посты"
Cohesion: 0.11
Nodes (37): addComment(), createPost(), deleteComment(), deletePost(), getComments(), getProfilePosts(), likePost(), reportComment() (+29 more)

### Community 5 - "Приложение: запросы комнат и историй"
Cohesion: 0.09
Nodes (34): castBallot(), getPersona(), getRoomState(), getSlots(), joinRoom(), leaveRoom(), reportToAdmins(), setNickname() (+26 more)

### Community 6 - "Сервер: вход в комнату и персона"
Cohesion: 0.08
Nodes (32): isBanned(), findPersonaId(), getOrCreatePersonaId(), isUniqueViolation(), closeFinishedRooms(), joinSlot(), leaveRoom(), pickRoom() (+24 more)

### Community 7 - "Сервер: тесты анонимности и запуска"
Cohesion: 0.11
Nodes (22): sourceFiles(), loadConfig(), ScheduleConfig, decryptEmail(), createInviteCode(), PushGateway, PushTarget, createDb() (+14 more)

### Community 8 - "Сервер: аккаунт, удаление, фото"
Cohesion: 0.16
Nodes (33): AccountStanding, deleteAccount(), forbidden(), getAccountStanding(), requireCapability(), endSession(), ApiError, unauthorized() (+25 more)

### Community 9 - "Приложение: вход в комнату и шар"
Cohesion: 0.12
Nodes (22): RoomEntry(), styles, describeRooms(), RoomsStatus, now, SlotList(), SlotRow(), styles (+14 more)

### Community 10 - "Приложение: вход и регистрация"
Cohesion: 0.14
Nodes (26): LoginScreen(), Mode, CreateScreen(), Kind, KINDS, Picked, styles, styles (+18 more)

### Community 11 - "Сервер: сборка приложения и маршруты"
Cohesion: 0.10
Nodes (21): AppDeps, buildApp(), errorBody(), Config, DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, VapidConfig (+13 more)

### Community 12 - "Документы: санкции и модерация"
Cohesion: 0.10
Nodes (32): account_sanctions — санкции (позже), room_sanctions — mute, room_block, rooms_ban (по персоне), P6. Модерация голосованием участников, без ведущего, T85. Голосования и баны ведутся по персоне, а не по аккаунту, T86. Пороги голосований: выгнать ≥3 и ≥1/3, микрофон 2 голоса, окно 60 с, T87. «Выгнали» закрывает вход во все комнаты на 24 часа, T88. Автобан: 3 комнаты за 7 дней — 7 дней без комнат, T89. Выключенный микрофон не возвращается перезаходом (+24 more)

### Community 13 - "Приложение: лента"
Cohesion: 0.13
Nodes (22): FeedScreen(), FeedList(), FeedListProps, Row, styles, Stories, useStories(), disablePush() (+14 more)

### Community 14 - "Сервер: напоминания и уведомления"
Cohesion: 0.12
Nodes (18): ALLOWED_PUSH_HOSTS, BroadcastDeps, broadcastPush(), isAllowedPushEndpoint(), DbHandle, migrationsFolder, Tx, personaLinks (+10 more)

### Community 15 - "Документы: запросы и коды ошибок"
Cohesion: 0.10
Nodes (27): Исключение: feed берёт карточку поста из posts и кружки из stories, Коды ошибок, Модуль «Лента»: GET /v1/feed, Фото: POST/GET /v1/media, Модуль «Посты»: /v1/posts/*, Отказ profile_required — заполните профиль, Модуль «Истории»: /v1/stories/*, P24. Посты: текст и до 10 фото, лайки, комментарии (+19 more)

### Community 16 - "Приложение: экран комнаты"
Cohesion: 0.14
Nodes (22): JoinState, Room(), styles, MicButton(), MicIcon(), formatBlockedUntil(), isInFuture(), minutesLeft() (+14 more)

### Community 17 - "Сервер: посты"
Cohesion: 0.17
Nodes (26): ProfileRef, registerPostsRoutes(), addComment(), CommentRow, createPost(), cursorSchema, decodeCursor(), deleteComment() (+18 more)

### Community 18 - "Документы: таблицы ядра"
Cohesion: 0.11
Nodes (27): accounts — закрытый аккаунт (email_encrypted, email_hash, role, status), admins и admin_audit_log — журнал админов (позже), Лента не имеет таблиц, Три группы таблиц: ядро, комнаты, мост (плюс посты и истории), media_files — загруженные фото, persona_links — мост аккаунт ↔ персона, post_comments — комментарии, post_likes — лайки (+19 more)

### Community 19 - "Общий договор: посты"
Cohesion: 0.10
Nodes (22): cursorQuery, idParam, PostsDeps, Author, Comment, COMMENT_TEXT_MAX, COMMENTS_PAGE_SIZE, commentSchema (+14 more)

### Community 20 - "Приложение: настройки Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 21 - "Документы: экран модерации комнаты"
Cohesion: 0.09
Nodes (24): Call.setLocallyMuted — «заглушить для себя», ParticipantActions, VoteBanner, moderation.ts, useRoomState — опрос состояния комнаты каждые 2,5 с, Приложение: Expo + React Native + TypeScript, База: PostgreSQL + Drizzle (при разработке встроенная), Всё серверное — на российском хостинге, Почта: российский сервис, не подключена, Push: Web Push в браузере, телефоны позже (+16 more)

### Community 22 - "Сервер: истории и лента"
Cohesion: 0.19
Nodes (21): authenticate(), findProfileId(), Db, cursorQuery, registerFeedRoutes(), idParam, registerStoriesRoutes(), createStory() (+13 more)

### Community 23 - "Документы: решения о звуке"
Cohesion: 0.09
Nodes (23): P7. Звук не записываем, T44. Пропуск LiveKit: только микрофон, только personaId и ник, T45. Вход в комнату с выключенным микрофоном, T47. Голос пока только в браузере, T6. Голос — LiveKit на своём сервере, без записи, Решить: «ещё раз» и раскрытие (F5), нужен юрист, Решить: подтверждение студента (G1), Решить: жалобы и удаление чужих записей (G10) (+15 more)

### Community 24 - "Документы: маршруты приложения"
Cohesion: 0.11
Nodes (21): Expo Router: маршруты в src/app, Группа (tabs): index, voice, create, profile, Tabs.Protected скрывает вкладки недоступных ролей, Профиль соцсети — открытая личность, requireCapability и can() — проверка прав ролей, requireProfile(db, accountId, capability), Роли: студент, преподаватель, гость, Правило 9: удаление аккаунта удаляет всё (+13 more)

### Community 25 - "Документы: вход по коду"
Cohesion: 0.10
Nodes (22): Вход: /v1/auth/start, verify, logout, Защита кода из письма: 6 цифр, 10 минут, 5 попыток, Режим разработки: devCode в ответе, Профиль: /v1/profile и /v1/profiles/:id, Расписание и вход: slots, join, leave, Два режима auth/start: регистрация и вход, Путь «вошёл → кнопка → в комнате», Путь пользователя: регистрация, профиль, главный экран, комната (+14 more)

### Community 26 - "Сервер: схема базы"
Cohesion: 0.18
Nodes (16): id(), time(), emailLoginCodes, mediaFiles, profiles, sessions, postComments, postLikes (+8 more)

### Community 27 - "Общий договор: ядро и запросы"
Cohesion: 0.14
Nodes (16): API_URL, networkError(), RequestOptions, AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse (+8 more)

### Community 28 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 29 - "Сервер: вход и приглашения"
Cohesion: 0.25
Nodes (17): AuthDeps, findUsableInviteId(), inviteIsUsable(), Session, startLogin(), verifyLogin(), encryptEmail(), generateLoginCode() (+9 more)

### Community 30 - "Документы: ядро и модули"
Cohesion: 0.16
Nodes (19): Ядро и модули: единое разделение кода, maintenance.ts — фоновая уборка сервера, Модуль «Лента» (единственный, кому можно обращаться к другому модулю), Модуль «Посты», Модуль «Истории» (срок жизни 24 часа), P19. Порядок работ — в ROADMAP.md, P29. Порядок частей: документы, профиль, посты, лента, истории, T50. Код разделён на ядро и модули (+11 more)

### Community 31 - "Документы: сроки хранения"
Cohesion: 0.13
Nodes (19): email_login_codes — одноразовые коды входа, invite_codes — коды приглашений с ролью, Сроки хранения данных, room_chat_messages — чат после второй ступени (позже), room_marks — тайные отметки (позже), room_matches и room_match_reveals (позже), room_reveal_cards — что открывается на ступенях (позже), P14. Сообщения чата удаляются через 90 дней (+11 more)

### Community 32 - "Группа 32"
Cohesion: 0.24
Nodes (15): changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), checkNickname(), NICKNAME_CHANGE_INTERVAL_DAYS (+7 more)

### Community 33 - "Группа 33"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 34 - "Группа 34"
Cohesion: 0.13
Nodes (3): serverDir, MediaStorage, MemoryMediaStorage

### Community 35 - "Группа 35"
Cohesion: 0.13
Nodes (17): anonymity.test.ts — автотест анонимности, Отложено: письма D3, хранилище D8, push на iPhone D4, админка, Никаких платных трат без согласования, Где мы сейчас: части 0–5 соцсети сделаны, Автотесты ролей (обход t.routes), W3. Платные траты и тяжёлые запуски — только после согласования, Денег не тратить, ничего не покупать, D3. Сервис отправки писем (+9 more)

### Community 36 - "Группа 36"
Cohesion: 0.12
Nodes (17): Открытый профиль — вопросы юристу C8–C12, Обработка фото: уменьшение и стирание места съёмки, Хранилище фото: диск при разработке, облако для запуска (D8), Безопасность и данные: почта зашифрована, секреты в окружении, B8. Согласовывать сразу соцсеть или сначала пилот комнат, C2. Реестр организаторов распространения информации, C8. Соцсеть — другой уровень обязанностей (реестр, модерация), C9–C12. Открытый профиль, фото, преподаватели, список просмотров (+9 more)

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
Cohesion: 0.19
Nodes (16): Админка /v1/admin (позже), Будущие модули: друзья, сообщения, группы, новости, T68. Публикация требует профиля и подходящей роли, T69. Жаловаться может любой вошедший, включая гостя, A12. Автобан сделан, отменить некому; защита от сговора троих, A15. Кто будет админами, A16. Фильтр мата в никах, G10. Модерация записей: кто разбирает жалобы (+8 more)

### Community 41 - "Группа 41"
Cohesion: 0.12
Nodes (15): runs-on, steps, timeout-minutes, jobs, check, name, on, pull_request (+7 more)

### Community 42 - "Группа 42"
Cohesion: 0.15
Nodes (12): MyProfileResponse, myProfileResponseSchema, PROFILE_ABOUT_MAX, PROFILE_COURSE_MAX, PROFILE_FACULTY_MAX, PROFILE_NAME_MAX, profileSchema, UpdateProfileRequest (+4 more)

### Community 43 - "Группа 43"
Cohesion: 0.18
Nodes (14): ui/TabBar.tsx — плавающая панель вкладок, Дизайн в стиле Apple с «жидким стеклом», Фон экранов — один ровный цвет, Card — стеклянная поверхность (нативное стекло на iOS 26+), Главный экран: истории, строка войса, лента, Orb и RoomEntry — круглая «живая» кнопка входа в комнату, Нижнее меню: Лента, Войс, Создать, Профиль, ui/theme.ts — цвета, шрифты, радиусы (+6 more)

### Community 44 - "Группа 44"
Cohesion: 0.23
Nodes (11): deleteMedia(), postPhotos, stories, storyViews, purgeUnusedMedia(), runMaintenance(), startMaintenance(), purgeExpiredStories() (+3 more)

### Community 45 - "Группа 45"
Cohesion: 0.14
Nodes (14): Модуль пользуется ядром, ядро о модулях не знает; модули друг о друге не знают, Ядро и модули (схема), Ядро: вход, аккаунт и роли, профиль, фото, уведомления, админка, Лента — особый модуль без своих данных, Правила: модуль пользуется ядром; ядро отвечает на три вопроса, Модули: комнаты, посты, лента, истории, Что строим: студенческая соцсеть, комнаты — один модуль, Структура репозитория: apps, packages, infra, docs (+6 more)

### Community 46 - "Группа 46"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 47 - "Группа 47"
Cohesion: 0.15
Nodes (12): @app/shared@workspace:*, react-native-safe-area-context@~5.11.1, react-native-screens@~4.30.1, react-native-web@^0.21.4, @app/shared, main, name, private (+4 more)

### Community 48 - "Группа 48"
Cohesion: 0.17
Nodes (13): Аккаунт (почта, вход, баны) — только сервер и админы, Модуль «Голосовые комнаты», Название соцсети не выбрано; КубГУ не использовать, Персона комнат — анонимный ник, только у студентов, Жёсткое правило 1: ник комнат не связан с аккаунтом и профилем, Правило 2: соцсеть не выдаёт персону косвенно, Правило 3: звук не записывается (без LiveKit egress), Правило 4: невзаимные отметки не видит никто (+5 more)

### Community 49 - "Группа 49"
Cohesion: 0.24
Nodes (6): getFeed(), FeedPage, mergeFirstPage(), Feed, FeedState, useFeed()

### Community 50 - "Группа 50"
Cohesion: 0.21
Nodes (9): fetchHealth(), getAccount(), getProfile(), logout(), profile, SessionProvider(), clearToken(), loadToken() (+1 more)

### Community 51 - "Группа 51"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 52 - "Группа 52"
Cohesion: 0.18
Nodes (11): Отказы модерации: vote_in_progress, vote_cooldown, vote_not_possible, room_blocked, События в реальном времени (WebSocket, позже), Модуль «Голосовые комнаты»: /v1/rooms/* (только студентам), «Ещё раз» и раскрытие: recent, marks, matches (позже), Модерация: state, votes, ballot, mutes, reports, Персона: GET /v1/rooms/me, PUT nickname, T27. Правила ника: 3–20 символов, уникальность без регистра и «ё», T54. Ник комнат выбирается сразу после регистрации (отменено T57) (+3 more)

### Community 53 - "Группа 53"
Cohesion: 0.22
Nodes (11): Уведомления: /v1/push/*, T13. Push: Expo Push и Web Push, без личных данных в тексте, T31. Web Push для напоминаний: в тексте только название и время, T32. Адрес подписки только от известных push-сервисов, T33. Напоминание уходит ровно один раз и только пока правдиво, T34. Push в приложениях iPhone/Android отложен, T62. Напоминания о комнатах только студентам, C6. Push и сборка через зарубежные серверы (+3 more)

### Community 54 - "Группа 54"
Cohesion: 0.18
Nodes (11): 06:35 — достигнут лимит использования, Раздел «Состояние»: хронология сессий, Истории отмечены «сделано» преждевременно — нужна проверка, Остановка: закончился лимит около 06:35, Итог ночи: 303 автотеста, денег не потрачено, Часть 3: лента, нижнее меню, строка войса — готово, Найдено: кнопка-шар была вложена в кнопку-строку, Часть 3 проверена в браузере тремя ролями (+3 more)

### Community 55 - "Группа 55"
Cohesion: 0.18
Nodes (10): authorSchema, postPhotoSchema, CreateStoryRequest, createStoryRequestSchema, Story, STORY_CAPTION_MAX, STORY_TTL_HOURS, StoryGroup (+2 more)

### Community 56 - "Группа 56"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 57 - "Группа 57"
Cohesion: 0.28
Nodes (9): Интерфейс MediaStorage — подменяемое хранилище фото, Правило 5: без телефона, документов и зарубежных облаков; стирать EXIF, T55. Фото на диске за интерфейсом хранилища, T56. Фото пересохраняются: уменьшение и стирание EXIF, T63. Фото по длинному случайному адресу без входа, T64. JPEG/PNG/WebP, тип по содержимому, аватар 512 точек, D8. Хранилище фото для боевого запуска, G14. Ограничения на фото (HEIC не читается) (+1 more)

### Community 58 - "Группа 58"
Cohesion: 0.25
Nodes (7): boot.test.ts — тест настоящего запуска сервера, Команды: pnpm check, dev:server, dev:web, livekit-server --dev, После каждой задачи — /graphify ., Тестовые коды приглашения TEST/TEACHER/GUEST-2026, W2. Graphify локально, /graphify . после каждой задачи, Как делается часть: shared, сервер, тесты, приложение, браузер, документы, graphify, Как посмотреть: тестовые коды и «Тестовая комната»

### Community 59 - "Группа 59"
Cohesion: 0.25
Nodes (8): Правило 8: не делать функции вне текущего этапа, pnpm check зелёный перед каждым коммитом, Спорное — значение по умолчанию из OPEN_QUESTIONS, Правила ночи: не останавливаться, не тратить, не выдумывать, не ломать, Остановки между частями на ночь отменены, Не делать: друзья, сообщения, группы, «ещё раз», боевой запуск, Отправлять только в origin main своего репозитория, docs/OPEN_QUESTIONS.md — открытые вопросы

### Community 60 - "Группа 60"
Cohesion: 0.25
Nodes (7): PushConfigResponse, pushConfigResponseSchema, pushMessageSchema, PushSubscribeRequest, pushSubscribeRequestSchema, PushUnsubscribeRequest, pushUnsubscribeRequestSchema

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

### Community 66 - "Группа 66"
Cohesion: 0.29
Nodes (7): Работа с помощниками на дешёвой модели (не безопасность и схема данных), Ошибки: GlitchTip на своём сервере, P12. Серверы и голос на российском хостинге (152-ФЗ), T11. GlitchTip вместо облачного Sentry, T12. Метрики — своя таблица событий, T38. Сложное — основной модели, рутина — помощникам, D7. GlitchTip на своём сервере

### Community 67 - "Группа 67"
Cohesion: 0.33
Nodes (6): api.ts в каждом модуле через request из lib/api.ts, Модуль импортирует ядро; ядро и модули друг друга — нет, Экраны src/app подключают модули — это не нарушение, Общие useFail и formatPostTime живут в src/lib, Структура: lib/ui — ядро, features/<модуль> — модули, features/rooms/usePersona — модуль сам грузит персону

### Community 69 - "Группа 69"
Cohesion: 0.33
Nodes (6): P11. Не собираем ФИО, телефон, документы, P21. Профиль после регистрации; частично отменяет P11, P28. Удаление аккаунта удаляет профиль, посты, истории, фото, F14. Закрыто: удаление аккаунта удаляет всё (P28), F2. Закрыто: поля профиля (P21), G7. Обязательные поля профиля

### Community 70 - "Группа 70"
Cohesion: 0.33
Nodes (5): MEDIA_PURPOSES, MEDIA_TYPES, MediaPurpose, mediaPurposeSchema, uploadMediaResponseSchema

### Community 71 - "Группа 71"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 72 - "Группа 72"
Cohesion: 0.40
Nodes (5): apps/mobile (Expo + React Native), apps/server (Node.js + Fastify), packages/shared (общие типы), pnpm check (типы и автотесты), README: студенческая соцсеть

### Community 74 - "Группа 74"
Cohesion: 0.67
Nodes (3): ios/ и android/ не править руками (Continuous Native Generation), Нативные модули требуют development build, EAS: облачная сборка, отправка и OTA-обновления

### Community 77 - "Группа 77"
Cohesion: 0.67
Nodes (3): Файл как передача дел между сессиями Claude, Одна сессия за раз: отметка .claude/night-heartbeat (25 минут), Перед продолжением — git status и pnpm check, git stash -u при непонятном

## Knowledge Gaps
- **143 isolated node(s):** `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости`, `Материалы и глубина (translucency)`, `Типографика: tracking и leading` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 447 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Приложение: вход в комнату и шар` to `Комнаты: правила модерации и расписание`, `Приложение: оболочка, сессия, навигация`, `Приложение: общие элементы экрана и микрофон`, `Приложение: посты`, `Группа 37`, `Группа 38`, `Приложение: запросы комнат и историй`, `Приложение: вход и регистрация`, `Приложение: лента`, `Группа 47`, `Приложение: экран комнаты`, `Группа 49`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `expo/tsconfig.base`, `Навык graphify (/graphify)`, `Проекция импульса и передача скорости` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Комнаты: правила модерации и расписание` be split into smaller, more focused modules?**
  _Cohesion score 0.05780885780885781 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Сервер: напоминания и уведомления` to `Комнаты: правила модерации и расписание`, `Группа 32`, `Сервер: настройки и зависимости`, `Сервер: вход в комнату и персона`, `Сервер: тесты анонимности и запуска`, `Сервер: аккаунт, удаление, фото`, `Сервер: сборка приложения и маршруты`, `Группа 44`, `Сервер: посты`, `Сервер: истории и лента`, `Сервер: схема базы`, `Сервер: вход и приглашения`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `Приложение: оболочка, сессия, навигация` be split into smaller, more focused modules?**
  _Cohesion score 0.13220551378446116 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Приложение: общие элементы экрана и микрофон` to `Комнаты: правила модерации и расписание`, `Приложение: оболочка, сессия, навигация`, `Приложение: посты`, `Группа 37`, `Приложение: запросы комнат и историй`, `Приложение: вход в комнату и шар`, `Приложение: вход и регистрация`, `Приложение: лента`, `Группа 47`, `Приложение: экран комнаты`, `Группа 50`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Should `Приложение: общие элементы экрана и микрофон` be split into smaller, more focused modules?**
  _Cohesion score 0.08233117483811286 - nodes in this community are weakly interconnected._