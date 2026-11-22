import {
  PROFILE_ABOUT_MAX,
  PROFILE_COURSE_MAX,
  PROFILE_FACULTY_MAX,
  PROFILE_NAME_MAX,
  ROLE_LABEL,
  updateProfileRequestSchema,
  type Profile,
} from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ApiError, updateProfile, uploadMedia } from '../lib/api';
import { checkPhoto, readPhoto } from '../lib/photo';
import { useSession, useSignedIn } from '../lib/session';
import { Avatar } from './Avatar';
import { Button, ErrorText, Field } from './components';
import { joinName, splitName } from './plural';
import { StepScreen } from './StepScreen';

type FieldErrors = Partial<Record<'displayName' | 'faculty' | 'course' | 'about', string>>;

const FIELD_TEXT = {
  displayName: `Введите имя, не длиннее ${PROFILE_NAME_MAX} знаков`,
  faculty: `Не больше ${PROFILE_FACULTY_MAX} знаков`,
  course: `Курс — число от 1 до ${PROFILE_COURSE_MAX}`,
  about: `Не больше ${PROFILE_ABOUT_MAX} знаков`,
};

type ProfileFormProps = {
  title: string;
  // Текущий профиль (при изменении) — из него берём начальные значения
  initial: Profile | null;
  onSaved: (profile: Profile) => void;
  // Нижняя кнопка: «Выйти» при первом заполнении, «Отмена» при изменении
  footer: { title: string; onPress: () => void };
  // Задан — сверху индикатор шагов регистрации
  step?: { current: number; total: number };
  // Круглая кнопка «назад» вверху (на экране редактирования)
  onBack?: () => void;
};

export function ProfileForm({ title, initial, onSaved, footer, step, onBack }: ProfileFormProps) {
  const { token, account } = useSignedIn();
  const { forgetSession } = useSession();
  const isStudent = account.role === 'student';

  // Сервер хранит имя одной строкой «Имя Фамилия»; в форме это два поля
  const [firstName, setFirstName] = useState(() => splitName(initial?.displayName ?? '').firstName);
  const [lastName, setLastName] = useState(() => splitName(initial?.displayName ?? '').lastName);
  const displayName = joinName(firstName, lastName);
  const [faculty, setFaculty] = useState(initial?.faculty ?? '');
  const [course, setCourse] = useState(initial?.course ? String(initial.course) : '');
  const [about, setAbout] = useState(initial?.about ?? '');
  // undefined — фото не трогали; null — убрать; строка — загруженное фото
  const [avatarMediaId, setAvatarMediaId] = useState<string | null | undefined>(undefined);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const hasPhoto = avatarMediaId === undefined ? Boolean(initial?.avatarUrl) : avatarMediaId !== null;
  const shownRemoteUrl = avatarMediaId === undefined ? (initial?.avatarUrl ?? null) : null;

  const pickPhoto = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const uri = result.canceled ? undefined : result.assets[0]?.uri;
      if (!uri) return;
      setUploading(true);
      const blob = await readPhoto(uri);
      const problem = checkPhoto(blob);
      if (problem) {
        setPhotoError(problem);
        return;
      }
      const uploaded = await uploadMedia(token, 'avatar', blob);
      setAvatarMediaId(uploaded.mediaId);
      setLocalUri(uri);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') {
        await forgetSession();
        return;
      }
      setPhotoError(caught instanceof ApiError ? caught.message : 'Не получилось загрузить фото. Попробуйте ещё раз');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setPhotoError(null);
    setAvatarMediaId(null);
    setLocalUri(null);
  };

  const submit = async () => {
    setError(null);
    const courseText = course.trim();
    const result = updateProfileRequestSchema.safeParse({
      displayName,
      faculty,
      about,
      // Курс есть только у студентов; у остальных поле не трогаем
      ...(isStudent ? { course: courseText === '' ? null : Number(courseText) } : {}),
      ...(avatarMediaId === undefined ? {} : { avatarMediaId }),
    });
    if (!result.success) {
      const next: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key === 'displayName' || key === 'faculty' || key === 'course' || key === 'about') next[key] = FIELD_TEXT[key];
        else setError('Проверьте заполненные поля');
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      onSaved(await updateProfile(token, result.data));
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') {
        await forgetSession();
        return;
      }
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setSaving(false);
    }
  };

  const fields = (
    <>
      <View style={styles.photo}>
        <Avatar avatarUrl={shownRemoteUrl} localUri={localUri} name={displayName} size={96} busy={uploading} />
        <View style={styles.photoActions}>
          <Button
            variant="secondary"
            title={hasPhoto ? 'Изменить фото' : 'Выбрать фото'}
            onPress={() => void pickPhoto()}
            disabled={saving || uploading}
          />
          {hasPhoto ? <Button variant="plain" title="Убрать" onPress={removePhoto} disabled={saving || uploading} /> : null}
        </View>
      </View>
      <ErrorText>{photoError}</ErrorText>

      <Field
        label="Имя"
        value={firstName}
        onChangeText={setFirstName}
        maxLength={PROFILE_NAME_MAX}
        autoCapitalize="words"
        autoComplete="given-name"
        error={errors.displayName}
      />
      <Field
        label="Фамилия"
        value={lastName}
        onChangeText={setLastName}
        maxLength={PROFILE_NAME_MAX}
        autoCapitalize="words"
        autoComplete="family-name"
      />
      <Field
        label="Факультет"
        value={faculty}
        onChangeText={setFaculty}
        maxLength={PROFILE_FACULTY_MAX}
        autoCapitalize="sentences"
        error={errors.faculty}
      />
      {isStudent ? (
        <Field
          label="Курс"
          value={course}
          onChangeText={(text) => setCourse(text.replace(/\D/g, ''))}
          maxLength={1}
          keyboardType="number-pad"
          hint={`Число от 1 до ${PROFILE_COURSE_MAX}`}
          error={errors.course}
        />
      ) : null}
      <Field
        label="О себе"
        value={about}
        onChangeText={setAbout}
        maxLength={PROFILE_ABOUT_MAX}
        autoCapitalize="sentences"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={styles.about}
        hint={`Осталось знаков: ${PROFILE_ABOUT_MAX - about.length}`}
        error={errors.about}
      />

      <ErrorText>{error}</ErrorText>
    </>
  );

  return (
    <StepScreen
      title={title}
      subtitle={
        initial === null
          ? `Это ваш открытый профиль, его увидят другие. Вы — ${ROLE_LABEL[account.role].toLowerCase()}`
          : `Роль: ${ROLE_LABEL[account.role].toLowerCase()}. Изменить её нельзя`
      }
      step={step}
      onBack={onBack}
      primary={{ title: step ? 'Готово' : 'Сохранить', onPress: () => void submit(), loading: saving, disabled: uploading }}
      footer={<Button variant="plain" title={footer.title} onPress={footer.onPress} disabled={saving} />}
    >
      <View style={styles.stepFields}>{fields}</View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  photo: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoActions: { flex: 1, gap: 4 },
  // numberOfLines на iOS не задаёт высоту, поэтому минимальную высоту ставим сами
  about: { minHeight: 110 },
  stepFields: { gap: 18 },
});
