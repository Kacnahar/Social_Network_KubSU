import { randomUUID } from 'node:crypto';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

export const id = () => uuid('id').primaryKey().$defaultFn(() => randomUUID());
export const time = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
