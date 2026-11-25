import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RoleCard } from '../features/auth/RoleCard';
import { SIGNUP_STEPS, type SignupRole } from '../features/auth/registration';
import { StepScreen } from '../ui/StepScreen';

// Шаг 1 регистрации: человек сам выбирает роль
export default function RegisterRoleScreen() {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole | null>(null);

  return (
    <StepScreen
      title="Кто вы?"
      subtitle="От этого зависит, что будет доступно в приложении"
      step={{ current: 1, total: SIGNUP_STEPS }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      primary={{
        title: 'Далее',
        disabled: role === null,
        onPress: () => {
          if (role) router.push({ pathname: '/signup', params: { role } });
        },
      }}
    >
      <View accessibilityRole="radiogroup" style={styles.cards}>
        <RoleCard
          role="student"
          title="Студент"
          caption="Лента, посты, комнаты"
          selected={role === 'student'}
          onPress={() => setRole('student')}
        />
        <RoleCard
          role="teacher"
          title="Преподаватель"
          caption="Лента и посты"
          selected={role === 'teacher'}
          onPress={() => setRole('teacher')}
        />
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 14 },
});
