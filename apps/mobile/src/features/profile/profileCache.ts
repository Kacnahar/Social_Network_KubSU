import type { Profile, ProfilePrivacy } from '@app/shared';
import type { DateParts } from '../auth/signupForm';
import { setNickname } from '../../ui/nicknameStore';
import { DEFAULT_EXTRAS } from './profileExtras';
import { setExtras } from './profileExtrasStore';
import { fromIsoDate } from './isoDate';

// Никнейм, кафедра, ссылки, дата рождения и «что видно в профиле» хранятся на сервере.
// Экраны по-прежнему читают их из хранилищ на устройстве (useNickname, useExtras) — сюда приходит свежий ответ сервера.
// privacy есть только у своего профиля; у чужого скрытые поля сервер просто не присылает.
export function rememberProfile(profile: Profile, privacy: ProfilePrivacy | null): void {
  const birth: DateParts | null = fromIsoDate(profile.birthDate);
  setNickname(profile.profileId, profile.username ?? '');
  setExtras(profile.profileId, {
    ...DEFAULT_EXTRAS,
    ...(privacy ?? { showBirth: birth !== null }),
    chair: profile.department ?? '',
    links: profile.links,
    birth,
  });
}
