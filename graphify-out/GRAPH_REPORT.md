# Graph Report - Social_Network_KubSU  (2026-11-28)

## Corpus Check
- 366 files · ~261,798 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .wasm 1)

## Summary
- 3150 nodes · 10145 edges · 121 communities (100 shown, 21 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 533 edges (avg confidence: 0.85)
- Token cost: 0 input · 596,684 output

## Graph Freshness
- Built from commit: `d3a189b7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- rooms/api.ts
- Комнаты: правила модерации и персона
- RoomControls.tsx
- Сервер: настройки и зависимости
- ha
- Сервер: посты
- features/rooms/moderation.ts
- call.tsx
- Сервер: админка
- ref_vitest
- src/index.ts
- Сервер: аккаунт, бан, фото
- EditProfile.tsx
- core/routes.ts
- react
- anonymity.test.ts
- Button
- Документы: запросы админки и аккаунта
- Приложение: настройки Expo
- type
- admin.ts
- icons.tsx
- voice.web.ts
- lib/api.ts
- app.ts
- auth/service.ts
- Документы: три личности и качество
- build
- useColors
- Настройки TypeScript
- Группа 30
- TabBar.tsx
- Группа 32
- Группа 33
- Группа 34
- Группа 35
- client.ts
- Группа 37
- Группа 38
- Группа 39
- Группа 40
- Группа 41
- mobile/package.json
- Группа 43
- Группа 44
- VoteBanner.tsx
- Ka
- Группа 47
- Группа 48
- terrain.ts
- AdForm.tsx
- draco_wasm_wrapper.js
- Группа 52
- Группа 53
- pts
- Группа 55
- ProfileBody.tsx
- Группа 57
- Группа 58
- draco_decoder.js
- v
- Группа 61
- build_campus.py
- Группа 63
- Группа 64
- ma
- wing
- map3d-osm.mjs
- ki
- cone
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
- W
- commentThreads.ts
- AvatarCropper.tsx
- FullCatalogHome.tsx
- Scene.tsx
- corridors
- places.ts
- controls.ts
- geo.ts
- signup.tsx
- ParticipantList.tsx
- AdItem.tsx
- testData.ts
- math
- DiskMediaStorage
- events.ts
- createWasm
- ExceptionInfo
- A
- Greeting.tsx
- feed/api.test.ts
- forum.ts
- giphy.ts
- dogleg
- forum-new.tsx
- 3D-карта: какие фото нужны
- stairs
- FeedList.tsx
- store.ts
- callRuntimeCallbacks
- scheduleExample.ts
- design-screen.md
- parking
- design-architect.md
- design-reviewer.md
- emscripten_realloc_buffer
- intArrayFromString
- design-fixer-small.md
- relativeTime.test.ts
- react-native-svg

## God Nodes (most connected - your core abstractions)
1. `useColors()` - 236 edges
2. `ha()` - 234 edges
3. `ja()` - 144 edges
4. `react-native` - 114 edges
5. `react` - 111 edges
6. `useSignedIn()` - 94 edges
7. `Ka()` - 94 edges
8. `type` - 87 edges
9. `Button()` - 84 edges
10. `v()` - 79 edges

## Surprising Connections (you probably didn't know these)
- `Как делается часть: shared, сервер, тесты, приложение, браузер, документы` --semantically_similar_to--> `Конец задачи: pnpm check, merge main, статус «на проверке», /graphify, PR`  [INFERRED] [semantically similar]
  docs/NIGHT_PLAN.md → CLAUDE.md
- `persona_links — мост (читает только core/identity)` --semantically_similar_to--> `persona_links — единственная связь аккаунта с персоной (core/identity)`  [INFERRED] [semantically similar]
  docs/DATA_MODEL.md → CLAUDE.md
- `Роли и отказы 403 forbidden` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/API.md → CLAUDE.md
- `Роли и права в одном месте общего кода` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → CLAUDE.md
- `А1. Роли и таблица прав` --semantically_similar_to--> `Роли: студент, преподаватель, гость`  [INFERRED] [semantically similar]
  docs/MODERATION_RULES.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Процесс совместной работы: старт, финиш, чужое, конфликты** — claude_collab, claude_task_start, claude_task_end, claude_hands_off, claude_conflicts, docs_roadmap_task_table [EXTRACTED 0.90]
- **Модули соцсети: комнаты, посты, лента, истории** — claude_mod_rooms, claude_mod_posts, claude_mod_feed, claude_mod_stories [EXTRACTED 0.95]
- **Три личности: аккаунт, профиль, персона комнат** — docs_data_model_accounts, docs_data_model_profiles, docs_data_model_personas, docs_data_model_bridge [EXTRACTED 0.95]
- **Принципы текучего интерфейса Apple** — _claude_skills_apple_design_skill_interruptibility, _claude_skills_apple_design_skill_springs, _claude_skills_apple_design_skill_momentum_projection, _claude_skills_apple_design_skill_direct_manipulation [EXTRACTED 1.00]

## Communities (121 total, 21 thin omitted)

### Community 0 - "rooms/api.ts"
Cohesion: 0.12
Nodes (11): reportToAdmins(), setPersonalMute(), startVote(), kickButtonTitle(), VOTE_BUSY_HINT, Mode, ParticipantActions(), Props (+3 more)

### Community 1 - "Комнаты: правила модерации и персона"
Cohesion: 0.05
Nodes (47): ApiError, closeFinishedRooms(), joinSlot(), leaveRoom(), pickRoom(), Room, RoomDeps, roomNotOpen() (+39 more)

### Community 2 - "RoomControls.tsx"
Cohesion: 0.25
Nodes (9): MicButton(), MicIcon(), Props, styles, RoomControls(), RoomControlsProps, Side(), SideProps (+1 more)

### Community 3 - "Сервер: настройки и зависимости"
Cohesion: 0.06
Nodes (44): dependencies, @app/shared@workspace:*, drizzle-orm@^0.45.4, @electric-sql/pglite@^0.5.17, fastify@^5.0.0, @fastify/cors@^11.0.0, @fastify/rate-limit@^11.3.0, livekit-server-sdk@^2.20.1 (+36 more)

### Community 4 - "ha"
Cohesion: 0.04
Nodes (76): ha(), Ab(), Ae(), ah(), $b(), Bb(), bg(), bh() (+68 more)

### Community 5 - "Сервер: посты"
Cohesion: 0.06
Nodes (65): authenticate(), findProfileId(), mediaFiles, profiles, postComments, postLikes, postPhotos, postReports (+57 more)

### Community 6 - "features/rooms/moderation.ts"
Cohesion: 0.10
Nodes (26): clockFormat, dayFormat, NO_VOTES_TEXT, voteHint(), votesWord(), plural(), activeVoteSchema, AUTOBAN_DAYS (+18 more)

### Community 7 - "call.tsx"
Cohesion: 0.19
Nodes (19): JoinState, Room(), RoomFrame(), RoomNote(), RoomScreen(), styles, Unsupported(), getRoomState() (+11 more)

### Community 8 - "Сервер: админка"
Cohesion: 0.13
Nodes (35): AdminRouteDeps, idParam, PersonaParams, ProfileParams, registerAdminRoutes(), ReportParams, statusQuery, StatusQuery (+27 more)

### Community 9 - "ref_vitest"
Cohesion: 0.06
Nodes (54): newPost(), newReportedPost(), loadConfig(), STUDENT, TEACHER, createInviteCode(), broadcastPush(), PushGateway (+46 more)

### Community 10 - "src/index.ts"
Cohesion: 0.07
Nodes (40): VoiceScreen(), getSlots(), createStyles(), Orb(), OrbProps, useLoop(), RoomEntry(), styles (+32 more)

### Community 11 - "Сервер: аккаунт, бан, фото"
Cohesion: 0.08
Nodes (40): AccountStanding, dateFormat, forbidden(), getAccountStanding(), requireCapability(), requireNotBanned(), endSession(), isEmaillessGuest() (+32 more)

### Community 12 - "EditProfile.tsx"
Cohesion: 0.06
Nodes (62): ProfileEditScreen(), ProfileSetupScreen(), useAdminList(), RoleIcon(), styles, COURSES, EditProfile(), ErrorLine() (+54 more)

### Community 13 - "core/routes.ts"
Cohesion: 0.03
Nodes (69): AuthDeps, CoreDeps, idParam, AccountResponse, accountResponseSchema, AuthStartRequest, authStartRequestSchema, AuthStartResponse (+61 more)

### Community 14 - "react"
Cohesion: 0.10
Nodes (37): ComposeScreen(), Picked, styles, LoadState, StoriesScreen(), GifPicker(), GifPreview(), GifTile() (+29 more)

### Community 15 - "anonymity.test.ts"
Cohesion: 0.15
Nodes (3): sourceFiles(), serverDir, decryptEmail()

### Community 16 - "Button"
Cohesion: 0.05
Nodes (79): AdminRoute(), AboutBody(), AccountBody(), Choice(), GUEST_ITEMS, ItemBody(), LanguageBody(), NotificationsBody() (+71 more)

### Community 17 - "Документы: запросы админки и аккаунта"
Cohesion: 0.09
Nodes (25): Админка: раздел «Комнаты» — только ники, «Записи» — только профили, Аккаунт: GET/DELETE /v1/account, role, isAdmin, Админка: /v1/admin/* (жалобы, баны, журнал), admin_audit_log — журнал админов, T100: бан в соцсети на 1–30 дней — нельзя публиковать, комментировать, лайкать, T101: жалоба хранит автора записи — можно банить после удаления записи, T102: бан в соцсети закрывает и комнаты; обратное неверно, T103: забаненный может менять профиль; жалобы на профиль — вопрос G10 (+17 more)

### Community 18 - "Приложение: настройки Expo"
Cohesion: 0.08
Nodes (24): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, typedRoutes, expo (+16 more)

### Community 19 - "type"
Cohesion: 0.05
Nodes (97): Empty(), FriendsScreen(), styles, DateFieldProps, styles, RoleCardProps, styles, styles (+89 more)

### Community 20 - "admin.ts"
Cohesion: 0.06
Nodes (42): ACCOUNT_BAN_DAY_OPTIONS, BAN_DAY_OPTIONS, blockedUntilText(), logSubline(), MAX_PREVIEW_PHOTOS, offenderBannedText(), photoPreview(), postReporterLabel() (+34 more)

### Community 21 - "icons.tsx"
Cohesion: 0.09
Nodes (36): SettingsScreen(), styles, MyProfileScreen(), styles, useTabBarSpace(), Dot, DOTS, Emblem() (+28 more)

### Community 22 - "voice.web.ts"
Cohesion: 0.21
Nodes (10): call, voiceSupported, listParticipants(), ROOM_EVENTS, toParticipant(), useCall(), voiceSupported, Call (+2 more)

### Community 23 - "lib/api.ts"
Cohesion: 0.07
Nodes (52): styles, WelcomeScreen(), addComment(), createPost(), deleteComment(), deletePost(), getComments(), getProfilePosts() (+44 more)

### Community 24 - "app.ts"
Cohesion: 0.07
Nodes (28): AppDeps, buildApp(), errorBody(), DEV_EMAIL_ENCRYPTION_KEY, envSchema, flag, ScheduleConfig, VapidConfig (+20 more)

### Community 25 - "auth/service.ts"
Cohesion: 0.18
Nodes (26): checkSignup(), displayNameOfSignup(), findUsableInviteId(), inviteIsUsable(), Session, startGuestSession(), startLogin(), verifyLogin() (+18 more)

### Community 26 - "Документы: три личности и качество"
Cohesion: 0.10
Nodes (22): Три личности: аккаунт, профиль соцсети, персона комнат, persona_links — единственная связь аккаунта с персоной (core/identity), Качество: автотесты, anonymity.test.ts, обход t.routes по ролям, boot.test.ts, Роли: студент, преподаватель, гость, Ник комнат нельзя связать с аккаунтом и профилем ни в одном ответе, Запреты проверяет сервер, а не экран, Коды ошибок API, Общие правила API: JSON, Bearer, нет accountId и почты, ошибки (+14 more)

### Community 27 - "build"
Cohesion: 0.05
Nodes (22): bench(), bench_plain(), build(), clear_of_extras(), free(), on_drive(), paved(), wall_gap() (+14 more)

### Community 28 - "useColors"
Cohesion: 0.06
Nodes (92): AdScreen(), styles, CHOICES, NewAdChooser(), styles, EventsScreen(), styles, ForumScreen() (+84 more)

### Community 29 - "Настройки TypeScript"
Cohesion: 0.10
Nodes (17): compilerOptions, types, extends, include, extends, include, compilerOptions, esModuleInterop (+9 more)

### Community 30 - "Группа 30"
Cohesion: 0.13
Nodes (19): Правила импорта: модуль → ядро; feed берёт из posts и stories, Структура кода: lib/ui — ядро, features/<модуль> — модули, Деление на ядро и модули; зависимости только модуль → ядро, Модуль «Лента» (единственный, кому можно обращаться к другому модулю), Модуль «Посты», Модуль «Голосовые комнаты», Модуль «Истории» (24 часа, maintenance.ts), requireProfile — «кто я» для модулей соцсети (+11 more)

### Community 31 - "TabBar.tsx"
Cohesion: 0.06
Nodes (49): TabsLayout(), unstable_settings, TAB_BAR, TabBarSpaceProvider(), CatalogIcon(), FeedIcon(), MapIcon(), VoiceIcon() (+41 more)

### Community 32 - "Группа 32"
Cohesion: 0.12
Nodes (18): Экраны вне вкладок: login, verify, profile/setup, posts, rooms, stories, Expo Router: маршруты в src/app, Нижнее меню (tabs): Лента, Войс, Создать, Профиль; Tabs.Protected, Команды: pnpm check, dev:server, dev:web, livekit, drizzle-kit, тестовые коды, Типовые конфликты: graphify-out, drizzle, DECISIONS (T-номера), ROADMAP, Документация — источник правды, Работа с помощниками: рутина на Sonnet, безопасность не отдавать, Главный экран: истории, строка войса, лента, нижнее меню (+10 more)

### Community 33 - "Группа 33"
Cohesion: 0.07
Nodes (29): dependencies, @app/shared@workspace:*, expo-blur@~58.0.6, expo-constants@~58.0.16, expo-glass-effect@~58.0.5, expo-image-manipulator@~58.0.16, expo-image-picker@~58.0.10, expo-linear-gradient@~58.0.4 (+21 more)

### Community 34 - "Группа 34"
Cohesion: 0.10
Nodes (37): deleteAccount(), findAbandonedGuestIds(), deleteMedia(), MediaDeps, stories, storyViews, purgeAbandonedGuests(), purgeUnusedMedia() (+29 more)

### Community 35 - "Группа 35"
Cohesion: 0.13
Nodes (17): dependencies, zod@^4.0.0, devDependencies, typescript@~6.0.3, vitest@^4.0.0, typescript, vitest, zod (+9 more)

### Community 36 - "client.ts"
Cohesion: 0.22
Nodes (16): isUniqueViolation(), changeAvailableAt(), getPersona(), loadPersona(), nicknameTaken(), setNickname(), toResponse(), checkNickname() (+8 more)

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

### Community 42 - "mobile/package.json"
Cohesion: 0.10
Nodes (23): expo@~58.0.26, expo-gl@~58.0.4, livekit-client@^2.25.0, react-dom@19.3.0, @react-three/fiber@^9.8.2, devDependencies, @types/react@~19.3.0, @types/three@^0.187.0 (+15 more)

### Community 43 - "Группа 43"
Cohesion: 0.20
Nodes (14): Лента: GET /v1/feed, Фото: POST /v1/media, GET /v1/media/:id, Посты: /v1/posts/* (лайки, комментарии, жалобы), Истории: /v1/stories/*, accounts — закрытый аккаунт, persona_links — мост (читает только core/identity), Лента — без своих таблиц, Группы таблиц: ядро, комнаты, мост, посты/истории (+6 more)

### Community 44 - "Группа 44"
Cohesion: 0.14
Nodes (13): engines, node, name, packageManager, private, scripts, check, dev:mobile (+5 more)

### Community 45 - "VoteBanner.tsx"
Cohesion: 0.33
Nodes (8): castBallot(), secondsLeft(), voteAboutMeText(), voteBannerText(), Props, styles, VoteBanner(), ActiveVote

### Community 46 - "Ka"
Cohesion: 0.13
Nodes (51): c(), Ad(), ag(), Be(), Bf(), Cg(), de(), Df() (+43 more)

### Community 47 - "Группа 47"
Cohesion: 0.33
Nodes (11): getPushConfig(), subscribePush(), unsubscribePush(), base64UrlToBytes(), currentSubscription(), disablePush(), enablePush(), getPushStatus() (+3 more)

### Community 48 - "Группа 48"
Cohesion: 0.17
Nodes (12): Остановка: закончился лимит около 06:35, Итог ночи: 303 автотеста, денег не потрачено, Часть 3: лента, нижнее меню, строка войса — готово, Найдено: кнопка-шар была вложена в кнопку-строку, Часть 3 проверена в браузере тремя ролями, Часть 4: истории — готово, Часть 4: проверено автотестами и в браузере, Не проверено: выбор фото и жесты на телефоне (+4 more)

### Community 49 - "terrain.ts"
Cohesion: 0.09
Nodes (46): inPolygon(), bounds, square, HINT, MODES, PLACES, styles, canStand() (+38 more)

### Community 50 - "AdForm.tsx"
Cohesion: 0.09
Nodes (39): NewAd_job(), NewAd_rent(), NewAd_sell(), NewAd_service(), AdForm(), styles, AD_CATEGORIES, AD_DESCRIPTION_MAX (+31 more)

### Community 51 - "draco_wasm_wrapper.js"
Cohesion: 0.10
Nodes (24): Yh(), B(), C(), D(), E(), G(), H(), I() (+16 more)

### Community 52 - "Группа 52"
Cohesion: 0.24
Nodes (10): Совместная работа: два человека, общая память — только GitHub, Правила graphify: query перед grep, update после изменений, Чужое не трогать: не менять чужие задачи, без force-push, без секретов, Конец задачи: pnpm check, merge main, статус «на проверке», /graphify, PR, Начало задачи: pull main, ветка автор/задача, черновик PR, строка в ROADMAP, Отметка .claude/night-heartbeat — одна сессия за раз, Ночной план 22.11.2026 — выполнен, правила отменены, Правила ночи: без остановок, без трат, не ломать сделанное (+2 more)

### Community 53 - "Группа 53"
Cohesion: 0.22
Nodes (9): Навык apple-design, Прямое манипулирование и отклик, Восемь принципов дизайна Apple, Прерываемость анимаций, Материалы и глубина (translucency), Проекция импульса и передача скорости, Reduced motion и доступность, Пружинные анимации (springs) (+1 more)

### Community 54 - "pts"
Cohesion: 0.07
Nodes (21): bridge_shell(), I(), bridges(), road_length(), facade_holes(), internet_door(), korp_l(), korp_l_building() (+13 more)

### Community 55 - "Группа 55"
Cohesion: 0.29
Nodes (7): scripts, android, ios, start, test, typecheck, web

### Community 56 - "ProfileBody.tsx"
Cohesion: 0.25
Nodes (6): ProfileBodyProps, styles, Tab, TABS, styles, UnderlineTabsProps

### Community 57 - "Группа 57"
Cohesion: 0.29
Nodes (6): compilerOptions, noUncheckedIndexedAccess, strict, extends, include, expo/tsconfig.base

### Community 59 - "draco_decoder.js"
Cohesion: 0.08
Nodes (24): AttributeOctahedronTransform(), AttributeQuantizationTransform(), AttributeTransformData(), castObject(), Decoder(), DecoderBuffer(), destroy(), DracoFloat32Array() (+16 more)

### Community 60 - "v"
Cohesion: 0.16
Nodes (39): Ba(), Ca(), Db(), Eb(), Eg(), Gc(), ic(), If() (+31 more)

### Community 61 - "Группа 61"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, nodeLinker, packages

### Community 62 - "build_campus.py"
Cohesion: 0.12
Nodes (20): bake(), light_setup(), main(), make_materials(), material(), minimap(), minimaps(), noise() (+12 more)

### Community 65 - "ma"
Cohesion: 0.20
Nodes (32): $a(), Aa(), ai(), Bd(), Cd(), Cf(), $d(), Da() (+24 more)

### Community 66 - "wing"
Cohesion: 0.10
Nodes (17): area2(), center_block(), P(), Q(), cut_facade(), back(), facade(), Q() (+9 more)

### Community 67 - "map3d-osm.mjs"
Cohesion: 0.08
Nodes (24): bounds, BOX, buildings, centerInside(), clipLine(), context, fence, FENCE_WAYS (+16 more)

### Community 68 - "ki"
Cohesion: 0.21
Nodes (28): ac(), bc(), $c(), Cb(), cc(), ei(), Ga(), Hh() (+20 more)

### Community 69 - "cone"
Cohesion: 0.13
Nodes (21): bush(), cone(), hall(), block(), box(), diploma(), flat(), I() (+13 more)

### Community 81 - "W"
Cohesion: 0.12
Nodes (19): church(), block(), G(), GK(), quad(), rect(), vec(), dome() (+11 more)

### Community 82 - "commentThreads.ts"
Cohesion: 0.10
Nodes (31): CommentsDemoScreen(), styles, LoadState, PostScreen(), PostWithComments(), PostWithCommentsProps, styles, useGuestExit() (+23 more)

### Community 83 - "AvatarCropper.tsx"
Cohesion: 0.18
Nodes (24): AvatarCropper(), dist(), Props, Pt, styles, ZoomSlider(), zoomValue(), baseScale() (+16 more)

### Community 84 - "FullCatalogHome.tsx"
Cohesion: 0.20
Nodes (23): CatalogScreen(), styles, AdRow(), AskGlyph(), BriefcaseGlyph(), ChatGlyph(), HomeGlyph(), SellGlyph() (+15 more)

### Community 85 - "Scene.tsx"
Cohesion: 0.11
Nodes (25): friction(), orbitEye(), alive(), CLEAR_GLASS, clouds(), cubeMaterial, cubeTilt, cubeUniforms (+17 more)

### Community 86 - "corridors"
Cohesion: 0.19
Nodes (23): corridors(), arrow(), bench(), block(), board(), box(), cooler(), door_ts() (+15 more)

### Community 87 - "places.ts"
Cohesion: 0.10
Nodes (21): createControls(), campus, pointsOf(), Map3DScreen(), Indoor, indoor, maps, MiniMap (+13 more)

### Community 88 - "controls.ts"
Cohesion: 0.14
Nodes (21): BODY_RADIUS, Controls, EYE_HEIGHT, FOV, MapMode, WALK_SPEED, clamp(), createGestures() (+13 more)

### Community 89 - "geo.ts"
Cohesion: 0.13
Nodes (19): isBlocked(), near(), Obstacle, obstacleOf(), walk(), Box, boxOf(), closestOnSegment() (+11 more)

### Community 90 - "signup.tsx"
Cohesion: 0.06
Nodes (58): RegisterRoleScreen(), styles, GENDERS, SignupScreen(), styles, DateField(), parseSignupRole(), SIGNUP_STEPS (+50 more)

### Community 91 - "ParticipantList.tsx"
Cohesion: 0.38
Nodes (6): ParticipantList(), Props, SpeakingRing(), styles, Tile(), TileProps

### Community 92 - "AdItem.tsx"
Cohesion: 0.15
Nodes (17): AdRowProps, styles, AdPhoto(), SectionIcon(), styles, Ad, KIND_LABEL, SECTION_LABEL (+9 more)

### Community 93 - "testData.ts"
Cohesion: 0.16
Nodes (16): DEFAULT_SORT, SORT_OPTIONS, SortMode, sortPeople(), names(), FACULTIES, FIRST, LAST (+8 more)

### Community 94 - "math"
Cohesion: 0.12
Nodes (11): audit(), road_gap(), seg_dist(), wall_dist(), east_frame(), east_part(), fence(), gazebo() (+3 more)

### Community 96 - "events.ts"
Cohesion: 0.18
Nodes (13): MONTHS, styles, EVENT_FILTERS, EventFilter, filterEvents(), formatEventDate(), MONTHS, pad() (+5 more)

### Community 97 - "createWasm"
Cohesion: 0.16
Nodes (17): abort(), _abort(), addOnInit(), addRunDependency(), assert(), createWasm(), instantiateArrayBuffer(), instantiateAsync() (+9 more)

### Community 100 - "Greeting.tsx"
Cohesion: 0.22
Nodes (9): WeatherGlyph(), Greeting(), styles, firstNameOf(), greetingFor(), formatTemp(), TEST_WEATHER, Weather (+1 more)

### Community 102 - "forum.ts"
Cohesion: 0.20
Nodes (9): FORUM_CATEGORIES, listeners, repliesLabel(), subscribe(), Topic, TOPIC_TEXT_MAX, TOPIC_TITLE_MAX, topics (+1 more)

### Community 103 - "giphy.ts"
Cohesion: 0.21
Nodes (10): Gif, searchTestGifs(), splitColumns(), TEST_GIFS, fetchGifs(), GIPHY_KEY, GiphyImage, GiphyItem (+2 more)

### Community 104 - "dogleg"
Cohesion: 0.23
Nodes (7): dogleg(), block(), box(), I(), O(), zone(), Part

### Community 106 - "forum-new.tsx"
Cohesion: 0.15
Nodes (18): NewTopicScreen(), styles, LoginScreen(), VerifyScreen(), addTopic(), ForumCategory, authStart(), CodeField() (+10 more)

### Community 107 - "3D-карта: какие фото нужны"
Cohesion: 0.18
Nodes (10): 1. Главный вход и центральный блок (самое важное), 2. Крылья главного корпуса, 3. Внутренние дворы, 3D-карта: какие фото нужны, 4. Площадь и территория, 5. Футбольное поле (для следующего блока), 6. Остальные здания на территории, 7. Внутри корпуса (понадобится позже) (+2 more)

### Community 108 - "stairs"
Cohesion: 0.38
Nodes (10): stairs(), block(), box(), flat(), I(), O(), rail(), wall_d() (+2 more)

### Community 110 - "FeedList.tsx"
Cohesion: 0.16
Nodes (15): getFeed(), FeedListProps, styles, FeedPage, mergeFirstPage(), Feed, FeedState, useFeed() (+7 more)

### Community 111 - "store.ts"
Cohesion: 0.28
Nodes (6): ads, base, listeners, subscribe(), useAd(), useAds()

### Community 112 - "callRuntimeCallbacks"
Cohesion: 0.32
Nodes (8): addOnPostRun(), addOnPreRun(), callRuntimeCallbacks(), initRuntime(), postRun(), preRun(), run(), doRun()

### Community 114 - "scheduleExample.ts"
Cohesion: 0.29
Nodes (6): EXAMPLE_GROUPS, ExampleGroup, Lesson, ScheduleDay, WEEK_A, WEEK_B

### Community 116 - "design-screen.md"
Cohesion: 0.33
Nodes (5): Границы, Общие правила (обязательны), Перед работой, Проверка перед отчётом, Что ты делаешь

### Community 118 - "design-architect.md"
Cohesion: 0.40
Nodes (4): Как работать, Общие правила (обязательны), Перед работой, Проверка перед отчётом

### Community 119 - "design-reviewer.md"
Cohesion: 0.40
Nodes (4): Как проверять, Общие правила (обязательны), Формат ответа, Что искать

### Community 120 - "emscripten_realloc_buffer"
Cohesion: 0.50
Nodes (4): emscripten_realloc_buffer(), _emscripten_resize_heap(), getHeapMax(), updateMemoryViews()

### Community 121 - "intArrayFromString"
Cohesion: 0.50
Nodes (4): ensureString(), intArrayFromString(), lengthBytesUTF8(), stringToUTF8Array()

### Community 122 - "design-fixer-small.md"
Cohesion: 0.50
Nodes (3): Границы, Общие правила (обязательны), Что ты делаешь

## Ambiguous Edges - Review These
- `P17–P19: проект — соцсеть, комнаты — модуль; три личности` → `Стек T1–T16: Expo, Fastify, pnpm, PostgreSQL+Drizzle, LiveKit, WebSocket, Docker Compose`  [AMBIGUOUS]
  docs/DECISIONS.md · relation: conceptually_related_to

## Knowledge Gaps
- **90 isolated node(s):** `expo/tsconfig.base`, `Аккаунт: GET/DELETE /v1/account, role, isAdmin`, `T101: жалоба хранит автора записи — можно банить после удаления записи`, `T103: забаненный может менять профиль; жалобы на профиль — вопрос G10`, `Б7. Связь с админами: «Сообщить админам», почта` (+85 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 920 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `D()` connect `draco_wasm_wrapper.js` to `AvatarCropper.tsx`, `Ka`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Are the 178 inferred relationships involving `ha()` (e.g. with `ac()` and `Ad()`) actually correct?**
  _`ha()` has 178 INFERRED edges - model-reasoned connections that need verification._
- **What connects `expo/tsconfig.base`, `Аккаунт: GET/DELETE /v1/account, role, isAdmin`, `T101: жалоба хранит автора записи — можно банить после удаления записи` to the rest of the system?**
  _90 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `rooms/api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Why does `Fa()` connect `Ka` to `ma`, `ha`, `ki`, `draco_wasm_wrapper.js`, `v`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `ja()` (e.g. with `ha()` and `e()`) actually correct?**
  _`ja()` has 2 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `P17–P19: проект — соцсеть, комнаты — модуль; три личности` and `Стек T1–T16: Expo, Fastify, pnpm, PostgreSQL+Drizzle, LiveKit, WebSocket, Docker Compose`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._