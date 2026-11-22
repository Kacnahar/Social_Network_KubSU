import type { Profile } from '@app/shared';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfilePosts } from '../features/posts/ProfilePosts';
import { PlusIcon } from './icons';
import { ProfileView } from './ProfileView';
import { type, useColors } from './theme';
import { UnderlineTabs } from './UnderlineTabs';

type Tab = 'posts' | 'photos' | 'replies';
const TABS = [
  { value: 'posts', label: 'Посты' },
  { value: 'photos', label: 'Фото' },
  { value: 'replies', label: 'Ответы' },
] as const;

type ProfileBodyProps = {
  profile: Profile;
  isMine: boolean;
  onAddPhoto?: () => void;
  // Кнопки под шапкой: свои у своего и у чужого профиля
  actions: ReactNode;
};

// Общая часть своего и чужого профиля: шапка, кнопки, «Актуальное», вкладки Посты · Фото · Ответы
export function ProfileBody({ profile, isMine, onAddPhoto, actions }: ProfileBodyProps) {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<{ count: number; more: boolean } | null>(null);
  const [pinNote, setPinNote] = useState(false);

  return (
    <View style={styles.wrap}>
      <ProfileView profile={profile} posts={posts} onAddPhoto={onAddPhoto} />
      {actions}

      {/* «Актуальное» — закреплённые истории. Сервер их пока не хранит, поэтому на своём профиле
          есть только кружок «Новое», а на чужом ряда нет */}
      {isMine ? (
        <View style={styles.pins}>
          <Text style={[type.footnote, styles.pinsTitle, { color: colors.muted }]}>Актуальное</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Актуальное. Закрепить историю"
            onPress={() => setPinNote(true)}
            style={({ pressed }) => [styles.pin, { opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={[styles.pinCircle, { borderColor: colors.border }]}>
              <PlusIcon color={colors.muted} size={18} />
            </View>
            <Text style={[type.caption, { color: colors.muted }]}>Новое</Text>
          </Pressable>
          {pinNote ? (
            <Text accessibilityLiveRegion="polite" style={[type.footnote, { color: colors.muted }]}>
              Закреплять истории можно будет позже
            </Text>
          ) : null}
        </View>
      ) : null}

      <View>
        <UnderlineTabs options={TABS} value={tab} onChange={setTab} />
        {tab === 'replies' ? (
          <Text style={[type.body, styles.empty, { color: colors.muted }]}>Ответов пока нет</Text>
        ) : (
          <ProfilePosts profileId={profile.profileId} view={tab} onCount={setPosts} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  pins: { gap: 8 },
  pinsTitle: { fontWeight: '600' },
  pin: { alignItems: 'center', alignSelf: 'flex-start', gap: 5 },
  pinCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', paddingVertical: 36 },
});
