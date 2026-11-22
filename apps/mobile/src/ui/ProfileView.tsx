import type { Profile } from '@app/shared';
import { StyleSheet, View } from 'react-native';
import { Avatar } from './Avatar';
import { Body, Card, Title } from './components';
import { RoleBadge } from './RoleBadge';

// Карточка профиля — одна и та же для своего и чужого
export function ProfileView({ profile }: { profile: Profile }) {
  const meta = [profile.faculty, profile.course !== null ? `${profile.course} курс` : null].filter(Boolean).join(' · ');
  return (
    <Card>
      <View style={styles.head}>
        <Avatar avatarUrl={profile.avatarUrl} name={profile.displayName} size={96} />
        <RoleBadge role={profile.role} />
      </View>
      <Title>{profile.displayName}</Title>
      {meta ? <Body muted>{meta}</Body> : null}
      {profile.about ? <Body>{profile.about}</Body> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { gap: 12, alignItems: 'flex-start' },
});
