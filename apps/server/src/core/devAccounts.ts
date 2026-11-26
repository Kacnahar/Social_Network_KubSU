// ТОЛЬКО для разработки: тестовые аккаунты 1@mail.ru, 2@mail.ru (студенты) и 3@mail.ru (преподаватель).
// Входят по постоянному коду 0000 (см. startLogin). В продакшене настройка DEV_TEST_ACCOUNTS запрещена.

import { TEST_LOGIN_EMAILS, type Signup } from '@app/shared';
import type { Config } from '../config';
import type { Db } from '../db/client';
import { displayNameOfSignup } from './auth/service';
import { encryptEmail, hashEmail } from './crypto';
import { createAccount, findAccountIdByEmailHash } from './identity';
import { createInitialProfile } from './profile/service';

const PEOPLE: Record<(typeof TEST_LOGIN_EMAILS)[number], Signup> = {
  '1@mail.ru': { role: 'student', lastName: 'Соколова', firstName: 'Анна', gender: 'female', birthDate: '2006-04-12' },
  '2@mail.ru': { role: 'student', lastName: 'Орлов', firstName: 'Максим', gender: 'male', birthDate: '2005-09-30' },
  '3@mail.ru': { role: 'teacher', lastName: 'Лебедева', firstName: 'Елена', patronymic: 'Викторовна', staffId: 'T-0042' },
};

export async function ensureDevTestAccounts(db: Db, config: Config, now: Date): Promise<void> {
  for (const email of TEST_LOGIN_EMAILS) {
    const emailHash = hashEmail(email, config.emailHashKey);
    if (await findAccountIdByEmailHash(db, emailHash)) continue;
    const signup = PEOPLE[email];
    await db.transaction(async (tx) => {
      const accountId = await createAccount(tx, {
        emailHash,
        emailEncrypted: encryptEmail(email, config.emailEncryptionKey),
        role: signup.role,
        now,
        person: {
          lastName: signup.lastName,
          firstName: signup.firstName,
          patronymic: signup.role === 'teacher' ? signup.patronymic : null,
          gender: signup.role === 'student' ? signup.gender : null,
          staffId: signup.role === 'teacher' ? signup.staffId : null,
        },
      });
      await createInitialProfile(
        tx,
        accountId,
        { displayName: displayNameOfSignup(signup), birthDate: signup.role === 'student' ? signup.birthDate : null },
        now,
      );
    });
  }
}
