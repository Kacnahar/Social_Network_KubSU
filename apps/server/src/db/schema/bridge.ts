// Единственная связь между аккаунтом (ядро) и анонимной персоной комнат.
// Читать эту таблицу можно только из core/identity — это проверяет автотест.

import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { accounts } from './core';
import { personas } from './rooms';

export const personaLinks = pgTable('persona_links', {
  accountId: uuid('account_id')
    .primaryKey()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  personaId: uuid('persona_id')
    .notNull()
    .unique()
    .references(() => personas.id, { onDelete: 'cascade' }),
});
