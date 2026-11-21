# Graph Report - Social_Network_KubSU  (2026-11-22)

## Corpus Check
- 10 files · ~5,472 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: (none) 1)

## Summary
- 91 nodes · 86 edges · 11 communities (9 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2273d87`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Модель данных
- Открытые вопросы
- Проект: анонимные голосовые комнаты для студентов (пилот)
- API
- Архитектура
- Правила модерации
- Зона аккаунта (не видна никому, кроме сервера и админов)
- Модерация
- Метрики и админка
- .claude/CLAUDE.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `Проект: анонимные голосовые комнаты для студентов (пилот)` - 10 edges
2. `Архитектура` - 10 edges
3. `Правила модерации` - 10 edges
4. `API` - 9 edges
5. `Модель данных` - 8 edges
6. `Зона аккаунта (не видна никому, кроме сервера и админов)` - 8 edges
7. `Открытые вопросы` - 6 edges
8. `Модерация` - 5 edges
9. `«Ещё раз», раскрытие, чат` - 5 edges
10. `Расписание и комнаты` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (11 total, 2 thin omitted)

### Community 0 - "Модель данных"
Cohesion: 0.13
Nodes (14): chat_messages — сообщения чата, marks — тайные отметки «хочу пообщаться ещё», match_reveals — открытые ступени, matches — взаимные мэтчи («Знакомые по комнатам»), personas — персона, profiles — данные для ступеней раскрытия, room_participations — кто был в комнате, rooms — комнаты (+6 more)

### Community 1 - "Открытые вопросы"
Cohesion: 0.15
Nodes (10): Журнал решений, Продукт (решено управляющим), Процесс, Техника (2026-11-22), A. К управляющему — продукт, B. К вузу, C. К юристу (до этапа 5), D. Технические — требуют согласования трат (+2 more)

### Community 2 - "Проект: анонимные голосовые комнаты для студентов (пилот)"
Cohesion: 0.18
Nodes (10): graphify, Деньги и лимиты, Документация — источник правды, Жёсткие правила (нарушать нельзя), Как общаться, Качество, После каждой задачи, Проект: анонимные голосовые комнаты для студентов (пилот) (+2 more)

### Community 3 - "API"
Cohesion: 0.18
Nodes (9): API, Общие правила, События в реальном времени (WebSocket `/v1/ws`), Этап 1 — вход и ник, Этап 2 — расписание и push, Этап 3 — голосовые комнаты, Этап 4 — модерация, Этап 5 — «ещё раз», раскрытие, чат (+1 more)

### Community 4 - "Архитектура"
Cohesion: 0.20
Nodes (10): 1. Что строим, 2. Схема, 3. Части системы, 4. Структура репозитория, 5. Как устроена анонимность, 6. Основной сценарий, 7. Голос, 8. Безопасность и данные (+2 more)

### Community 5 - "Правила модерации"
Cohesion: 0.20
Nodes (10): 1. «Выгнать на 24 часа», 2. «Выключить микрофон», 3. Ограничения на голосования, 4. «Заглушить для себя», 5. Автоматический бан, 6. Чего нет, 7. Связь с админами, 8. Что пишется в журнал (+2 more)

### Community 6 - "Зона аккаунта (не видна никому, кроме сервера и админов)"
Cohesion: 0.25
Nodes (8): account_sanctions — санкции по аккаунту, accounts — аккаунт, email_login_codes — одноразовые коды входа, invite_codes — коды приглашений, persona_links — мост «аккаунт ↔ персона», push_tokens — адреса для push, sessions — сессии входа, Зона аккаунта (не видна никому, кроме сервера и админов)

### Community 7 - "Модерация"
Cohesion: 0.40
Nodes (5): personal_mutes — «заглушить для себя», reports — «Сообщить админам», vote_ballots — отдельные голоса, votes — голосования, Модерация

### Community 8 - "Метрики и админка"
Cohesion: 0.50
Nodes (4): admin_audit_log — журнал действий админов, admins — админы, events — события для метрик, Метрики и админка

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Модель данных` connect `Модель данных` to `Метрики и админка`, `Зона аккаунта (не видна никому, кроме сервера и админов)`, `Модерация`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `Модель данных` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Архитектура` connect `Архитектура` to `Открытые вопросы`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `Правила модерации` connect `Правила модерации` to `API`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._