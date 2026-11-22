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

- `src/lib` и `src/ui` — ядро соцсети (API-клиент, сессия, общие компоненты и тема).
- `src/features/<модуль>` — модули соцсети; сейчас `rooms` (голосовые комнаты) и `posts` (посты, лайки, комментарии).
- Модуль может импортировать из ядра, ядро из модулей — нет. Единственное исключение — главный экран `src/app/index.tsx`: он подключает «комнатную» секцию `features/rooms/RoomsHomeSection` (рисуется только у роли с правом `rooms`). Персону комнат грузит сам модуль (`features/rooms/usePersona`), сессия её не знает.
- Модули друг из друга ничего не импортируют (`posts` не знает про `rooms` и наоборот).
- Ещё исключения — экраны, подключающие модули: `src/app/index.tsx`, `src/app/profile/index.tsx` и `src/app/profiles/[profileId].tsx` (`features/posts/ProfilePosts` — список постов под профилем).
- Экраны модуля лежат в `src/app/<модуль>/` (например, `src/app/rooms/`), экраны ядра — прямо в `src/app/`.
- Запросы модуля живут в его `api.ts` и пользуются `request` из `src/lib/api.ts`.
