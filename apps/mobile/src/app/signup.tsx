import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DateField } from '../features/auth/DateField';
import { SIGNUP_STEPS, parseSignupRole, toSignup } from '../features/auth/registration';
import {
  TEACHER_ID_MAX,
  emptySignupValues,
  validateSignup,
  type Gender,
  type SignupField,
  type SignupValues,
} from '../features/auth/signupForm';
import { authStart } from '../lib/api';
import { useSession } from '../lib/session';
import { Checkbox } from '../ui/Checkbox';
import { ErrorText, Field } from '../ui/components';
import { Segmented } from '../ui/Segmented';
import { StepScreen } from '../ui/StepScreen';
import { type, useColors } from '../ui/theme';

const GENDERS = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
] as const;

// Шаг 2 регистрации: анкета целиком — своя для студента и для преподавателя
export default function SignupScreen() {
  const router = useRouter();
  const colors = useColors();
  const { setPendingLogin } = useSession();
  const role = parseSignupRole(useLocalSearchParams<{ role?: string }>().role);
  const [values, setValues] = useState<SignupValues>(emptySignupValues);
  // Ошибку под полем показываем после того, как человек из него вышел, — не раньше
  const [touched, setTouched] = useState<Partial<Record<SignupField, boolean>>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Анкета зависит от роли: без неё возвращаем к выбору
  if (!role) return <Redirect href="/register" />;

  const errors = validateSignup(role, values);
  const valid = Object.keys(errors).length === 0;
  const set = (patch: Partial<SignupValues>) => setValues((current) => ({ ...current, ...patch }));
  const touch = (field: SignupField) => setTouched((current) => ({ ...current, [field]: true }));
  const shown = (field: SignupField) => (touched[field] ? errors[field] : undefined);

  const thisYear = new Date().getFullYear();

  const submit = async () => {
    if (!valid) return;
    const signup = toSignup(role, values);
    if (signup === null) return;
    const email = values.email.trim().toLowerCase();
    setError(null);
    setLoading(true);
    try {
      // Роль и анкета уходят на сервер вместе с почтой; аккаунт и профиль появятся после кода из письма
      const response = await authStart({ email, signup });
      setPendingLogin({ email, signup, devCode: response.devCode });
      router.push('/verify');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StepScreen
      title={role === 'student' ? 'Анкета студента' : 'Анкета преподавателя'}
      subtitle="Заполните все поля — это займёт минуту"
      step={{ current: 2, total: SIGNUP_STEPS }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/register'))}
      primary={{ title: 'Далее', onPress: () => void submit(), loading, disabled: !valid }}
    >
      <View style={styles.fields}>
        <Field
          label="Фамилия"
          value={values.lastName}
          onChangeText={(lastName) => set({ lastName })}
          onBlur={() => touch('lastName')}
          autoCapitalize="words"
          autoComplete="family-name"
          returnKeyType="next"
          error={shown('lastName')}
        />
        <Field
          label="Имя"
          value={values.firstName}
          onChangeText={(firstName) => set({ firstName })}
          onBlur={() => touch('firstName')}
          autoCapitalize="words"
          autoComplete="given-name"
          returnKeyType="next"
          error={shown('firstName')}
        />

        {role === 'teacher' ? (
          <View style={styles.group}>
            <Field
              label="Отчество"
              value={values.noPatronymic ? '' : values.patronymic}
              onChangeText={(patronymic) => set({ patronymic })}
              onBlur={() => touch('patronymic')}
              autoCapitalize="words"
              autoComplete="additional-name"
              returnKeyType="next"
              editable={!values.noPatronymic}
              style={values.noPatronymic ? styles.inactive : undefined}
              error={values.noPatronymic ? undefined : shown('patronymic')}
            />
            <Checkbox label="Нет отчества" checked={values.noPatronymic} onChange={(noPatronymic) => set({ noPatronymic })} />
          </View>
        ) : null}

        <Field
          label="Почта"
          value={values.email}
          onChangeText={(email) => set({ email })}
          onBlur={() => touch('email')}
          keyboardType="email-address"
          autoComplete="email"
          inputMode="email"
          placeholder="name@mail.ru"
          hint="Пришлём код для входа. Другие пользователи почту не увидят"
          error={shown('email')}
        />

        {role === 'student' ? (
          <>
            <View style={styles.group}>
              <Text style={[type.subhead, styles.label, { color: colors.muted }]}>Пол</Text>
              {/* Пока ничего не выбрано, ни одна половина не подсвечена */}
              <Segmented<Gender | ''> options={GENDERS} value={values.gender ?? ''} onChange={(gender) => set({ gender: gender || null })} />
            </View>
            <DateField
              label="Дата рождения"
              value={values.birthDate}
              onChange={(birthDate) => {
                set({ birthDate });
                touch('birthDate');
              }}
              initial={{ day: 1, month: 1, year: thisYear - 18 }}
              error={shown('birthDate')}
            />
          </>
        ) : (
          <Field
            label="Идентификационный номер"
            value={values.teacherId}
            onChangeText={(teacherId) => set({ teacherId })}
            onBlur={() => touch('teacherId')}
            autoCapitalize="characters"
            maxLength={TEACHER_ID_MAX}
            hint="Номер преподавателя, который вам выдал вуз"
            error={shown('teacherId')}
          />
        )}

        <ErrorText>{error}</ErrorText>
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 18 },
  group: { gap: 8 },
  label: { fontWeight: '500', marginLeft: 16 },
  inactive: { opacity: 0.45 },
});
