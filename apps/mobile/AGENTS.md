This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Структура кода

- `src/lib` и `src/ui` — ядро соцсети (API-клиент, сессия, общие компоненты, тема, нижняя панель вкладок `ui/TabBar.tsx`).
- `src/features/<модуль>` — модули соцсети: `rooms` (голосовые комнаты), `posts` (посты, лайки, комментарии), `feed` (лента всех постов), `stories` (истории).
- Модуль может импортировать из ядра, ядро из модулей — нет. Персону комнат грузит сам модуль (`features/rooms/usePersona`), сессия её не знает.
- Модули друг из друга ничего не импортируют. Единственное разрешённое обращение модуля к модулю: `feed` берёт из `posts` карточку поста (лента показывает посты), а из `stories` — ряд кружков и хук историй (лента собирает главный экран). Общие вещи (`useFail`, `formatPostTime` в `lib/relativeTime.ts`) живут в ядре `src/lib`. `posts` и `rooms` не знают ни про `feed`, ни друг про друга.
- Экраны в `src/app` подключают модули (это не нарушение): ленту и строку войса — `(tabs)/index.tsx`, меню войса — `(tabs)/voice.tsx`, посты под профилем — `(tabs)/profile.tsx` и `profiles/[profileId].tsx`.
- Нижнее меню — группа `src/app/(tabs)/` на `Tabs` из expo-router со своей панелью `ui/TabBar.tsx`: `index` (Лента, `/`), `voice` (Войс, `/voice`, только право `rooms`), `create` (Создать, `/create`, только право `publish`), `profile` (Профиль, `/profile`). Недоступные роли вкладки скрыты через `Tabs.Protected` в `(tabs)/_layout.tsx`, прямой адрес ведёт на ленту. Панель плавает над содержимым; экраны (`Screen`, `ListScreen`) сами оставляют под ней место через `TabBarSpaceProvider`.
- Вне вкладок (на весь экран, без панели): `login`, `verify`, `profile/setup`, `profile/edit`, `profiles/[profileId]`, `posts/[postId]`, `rooms/nickname`, `rooms/call`, `stories/[profileId]` (просмотр историй автора, чёрный фон). Доступ к ним задаётся группами `Stack.Protected` в `app/_layout.tsx`.
- Экраны модуля, не входящие во вкладки, лежат в `src/app/<модуль>/` (например, `src/app/rooms/`).
- Запросы модуля живут в его `api.ts` и пользуются `request` из `src/lib/api.ts`.
- Комната (`rooms/call`): состояние (голосование, мои запреты, личные заглушки) опрашивает `useRoomState` каждые 2,5 с, пока звонок подключён и экран открыт; действия участника — `ParticipantActions`, баннер — `VoteBanner`, тексты и расчёты — `moderation.ts`. «Заглушить для себя» глушит звук только у меня через `Call.setLocallyMuted` (громкость участника в LiveKit); остальные слышат его как обычно.
- Админка (`features/admin`, экран `src/app/admin/index.tsx`, вход — пункт «Админка» в профиле, только при `account.isAdmin`): разбор жалоб на записи и из комнат, журнал. Сервер сам проверяет права: на 403 экран показывает «только для админов». Жёсткое правило: раздел «Комнаты» показывает только ники, «Записи» — только профили; не смешивать в одной карточке. Тексты и расчёты — в `format.ts`; из `features/posts` берётся только то, что нужно показать запись (`Avatar` из `ui`, картинки через `mediaUrl`).
