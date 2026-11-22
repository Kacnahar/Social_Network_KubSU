import type { Profile } from '@app/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { PlusIcon } from './icons';
import { plural } from './plural';
import { RoleBadge } from './RoleBadge';
import { type, useColors } from './theme';

type ProfileViewProps = {
  profile: Profile;
  // Сколько постов уже известно; more — на сервере есть ещё, точного числа нет
  posts: { count: number; more: boolean } | null;
  // На своём профиле без фото — заметная подсказка «Добавьте фото»; по нажатию открывается редактирование
  onAddPhoto?: () => void;
};

// Шапка профиля — одна и та же для своего и чужого: слева имя, роль и факультет, справа аватар;
// ниже «о себе» и цифры
export function ProfileView({ profile, posts, onAddPhoto }: ProfileViewProps) {
  const colors = useColors();
  const meta = [profile.faculty, profile.course !== null ? `${profile.course} курс` : null].filter(Boolean).join(' · ');
  const needsPhoto = onAddPhoto !== undefined && !profile.avatarUrl;

  const avatar = <Avatar avatarUrl={profile.avatarUrl} name={profile.displayName} size={84} />;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.text}>
          <Text accessibilityRole="header" style={[type.largeTitle, styles.name, { color: colors.text }]}>
            {profile.displayName}
          </Text>
          <RoleBadge role={profile.role} />
          {meta ? <Text style={[type.subhead, { color: colors.muted }]}>{meta}</Text> : null}
        </View>

        {needsPhoto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавьте фото"
            onPress={onAddPhoto}
            style={({ pressed }) => [styles.photo, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View>
              {avatar}
              <View style={[styles.plus, { backgroundColor: colors.highlight, borderColor: colors.background }]}>
                <PlusIcon color={colors.onHighlight} size={11} />
              </View>
            </View>
            <View style={[styles.hint, { backgroundColor: colors.highlightTint }]}>
              <Text style={[type.caption, styles.hintText, { color: colors.live }]}>Добавьте фото</Text>
            </View>
          </Pressable>
        ) : (
          avatar
        )}
      </View>

      {profile.about ? (
        <Text numberOfLines={2} style={[type.body, { color: colors.text }]}>
          {profile.about}
        </Text>
      ) : null}

      <View style={styles.stats}>
        <Stat value={posts ? `${posts.count}${posts.more ? '+' : ''}` : '—'} label={plural(posts?.count ?? 0, 'пост', 'поста', 'постов')} />
        <Text style={[type.subhead, { color: colors.muted }]}>·</Text>
        {/* Друзей и подписчиков на сервере пока нет — показываем нули */}
        <Stat value="0" label="друзей" />
        <Text style={[type.subhead, { color: colors.muted }]}>·</Text>
        <Stat value="0" label="подписчиков" />
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return (
    <Text style={[type.subhead, { color: colors.muted }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text> {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  top: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  text: { flex: 1, gap: 8 },
  name: { fontSize: 28, lineHeight: 34 },
  photo: { alignItems: 'center', gap: 6 },
  plus: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hint: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  hintText: { fontWeight: '600' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  statValue: { fontWeight: '700' },
});
