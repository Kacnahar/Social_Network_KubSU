import type { Profile } from '@app/shared';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ProfilePosts } from '../features/posts/ProfilePosts';
import type { Rect } from './Popover';
import { ProfileView } from './ProfileView';
import { type, useColors } from './theme';
import { UnderlineTabs } from './UnderlineTabs';

type Tab = 'posts' | 'photos' | 'replies';
const TABS = [
  { value: 'posts', label: 'Посты' },
  { value: 'replies', label: 'Ответы' },
  { value: 'photos', label: 'Фото' },
] as const;

type ProfileBodyProps = {
  profile: Profile;
  isMine: boolean;
  onPlus?: (rect: Rect) => void;
  // Кнопки под шапкой: свои у своего и у чужого профиля
  actions: ReactNode;
};

// Общая часть своего и чужого профиля: шапка, кнопки, «Актуальное», вкладки Посты · Фото · Ответы
export function ProfileBody({ profile, isMine, onPlus, actions }: ProfileBodyProps) {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('posts');

  return (
    <View style={styles.wrap}>
      <ProfileView profile={profile} onPlus={onPlus} />
      {actions}

      <View>
        <UnderlineTabs options={TABS} value={tab} onChange={setTab} />
        {tab === 'replies' ? (
          <Text style={[type.body, styles.empty, { color: colors.muted }]}>Ответов пока нет</Text>
        ) : (
          <ProfilePosts profileId={profile.profileId} view={tab} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  empty: { textAlign: 'center', paddingVertical: 36 },
});
