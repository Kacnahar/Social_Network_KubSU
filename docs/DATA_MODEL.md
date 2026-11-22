# Модель данных

Какие таблицы будут в базе (PostgreSQL) и что в них хранится. Названия полей — рабочие, уточняются при написании кода.

Уже созданы (этап 1): `accounts`, `invite_codes`, `email_login_codes`, `sessions`, `persona_links`, `personas`. Точное описание — в `apps/server/src/db/schema.ts`. Остальные таблицы появятся на своих этапах.

Правило: таблицы делятся на **зону аккаунта** (знает, кто человек) и **зону персоны** (знает только ник). Мост между ними один — `persona_links`.

## Зона аккаунта (не видна никому, кроме сервера и админов)

### accounts — аккаунт
| Поле | Что это |
|---|---|
| id | внутренний идентификатор, наружу не выходит |
| email_encrypted | почта в зашифрованном виде |
| email_hash | хэш почты для поиска при входе, уникальный |
| invite_code_id | каким кодом приглашения воспользовался |
| status | active / banned |
| banned_until | до какого времени бан (если есть) |
| created_at | когда создан |

### invite_codes — коды приглашений
| Поле | Что это |
|---|---|
| id, code | сам код |
| label | пометка для нас (например, «куратор, ФКТиПМ») |
| max_uses, used_count | сколько раз можно использовать и сколько использовано |
| expires_at | срок действия |
| created_by_admin_id | кто создал |

### email_login_codes — одноразовые коды входа
email_hash, code_hash, invite_code_id (если это регистрация), deliverable (отправлялось ли письмо), expires_at (10 минут), attempts (не больше 5), created_at. Одна запись на почту: новый код заменяет старый.

### sessions — сессии входа
id, token_hash, account_id, expires_at, created_at. Токен непрозрачный (случайная строка), в нём нет данных об аккаунте.

### persona_links — мост «аккаунт ↔ персона»
account_id, persona_id. Одна персона на аккаунт. **Читает только модуль `identity`.**

### account_sanctions — санкции по аккаунту
| Поле | Что это |
|---|---|
| account_id | кого |
| type | room_block_24h / account_ban_7d / admin_ban |
| room_id | из какой комнаты выгнали (для подсчёта «3 разные комнаты») |
| starts_at, ends_at | срок |
| source | vote / auto / admin |

### push_tokens — адреса для push
account_id, platform (ios / android / web), token, created_at.

## Зона персоны (то, что видят собеседники)

### personas — персона
| Поле | Что это |
|---|---|
| id | публичный случайный идентификатор (`personaId`) |
| nickname | ник; пустой, пока человек его не выбрал |
| nickname_key | ник в нижнем регистре с «ё»→«е» — по нему проверяется уникальность |
| nickname_changed_at | когда менялся (смена не чаще раза в 30 дней) |
| created_at | когда создана |

### profiles — данные для ступеней раскрытия
| Поле | Ступень | Что это |
|---|---|---|
| persona_id | — | чья анкета |
| faculty, course, interests | 1 | факультет, курс, интересы |
| display_name, contact_link | 2 | имя (как человек сам назвался) и ссылка на VK/Telegram |

Заполняется по желанию; показывается только партнёру по взаимному мэтчу и только после открытия ступени.

## Расписание и комнаты

### slots — слоты расписания
id, starts_at, duration_minutes, title, status (scheduled / live / finished / cancelled).

### rooms — комнаты
id, slot_id, index (1 или 2), livekit_room_name, opened_at, closed_at.

### room_participations — кто был в комнате
room_id, persona_id, joined_at, left_at, spoke (брал ли слово), speak_seconds.
Нужна для: списка «с кем я был в комнате» (отметки), метрик, правил голосования.

Кто находится в комнате прямо сейчас — в Redis, а не в базе.

## Модерация

### votes — голосования
| Поле | Что это |
|---|---|
| id, room_id | где |
| type | kick / mute |
| target_persona_id | против кого |
| initiator_persona_id | кто начал |
| started_at, ends_at | окно голосования |
| participants_at_start | сколько человек было в комнате на старте |
| votes_count | сколько голосов «за» |
| result | passed / failed |

### vote_ballots — отдельные голоса
vote_id, voter_persona_id, created_at. Собеседникам не показываются, видны только в журнале админов.

### personal_mutes — «заглушить для себя»
persona_id, muted_persona_id. Действует только на устройстве/аккаунте того, кто заглушил.

### reports — «Сообщить админам»
id, reporter_persona_id, target_persona_id (необязательно), room_id (необязательно), text, status (new / in_progress / closed), created_at.

## «Ещё раз», раскрытие, чат

### marks — тайные отметки «хочу пообщаться ещё»
from_persona_id, to_persona_id, room_id, created_at.
- Можно поставить только тому, с кем был в одной комнате, и только 24 часа после её закрытия.
- Не отдаются ни в одном запросе API и не показываются в админке.
- Невзаимные удаляются после закрытия окна.

### matches — взаимные мэтчи («Знакомые по комнатам»)
id, persona_a_id, persona_b_id, room_id, created_at.

### match_reveals — открытые ступени
match_id, persona_id, step (1 или 2), opened_at. Каждый открывает свои ступени отдельно.

### chat_messages — сообщения чата
id, match_id, sender_persona_id, text, created_at. **Удаляются через 90 дней** автоматической задачей.
(Таблица появится только если юрист разрешит свой чат — см. OPEN_QUESTIONS.)

## Метрики и админка

### events — события для метрик
id, name, persona_id (необязательно), room_id (необязательно), props (JSON), created_at.
Без идентификатора аккаунта и без почты. Примеры: `room_joined`, `spoke_first_time`, `mark_sent`, `match_created`, `push_opened`.

### admins — админы
id, email, password_hash, totp_secret (2FA), role.

### admin_audit_log — журнал действий админов
id, admin_id, action, target, reason, created_at.
Сюда пишется **каждый** просмотр связи «ник ↔ аккаунт», каждый бан и разбан. Записи не редактируются и не удаляются.

## Сроки хранения

| Данные | Срок |
|---|---|
| Сообщения чата | 90 дней |
| Невзаимные отметки | до конца 24-часового окна |
| Одноразовые коды входа | 10 минут |
| События метрик | до конца пилота + отчёт (уточнить) |
| Журнал админов | не удаляется на время пилота |
| Аккаунт и всё связанное | до удаления по запросу пользователя |
