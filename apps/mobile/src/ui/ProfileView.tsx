import type { Profile } from '@app/shared';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { detectService, normalizeLink, SERVICE_LABEL } from '../features/profile/links';
import { birthLine } from '../features/profile/birth';
import { useExtras } from '../features/profile/profileExtrasStore';
import { ServiceLogo } from '../features/profile/ServiceLogo';
import { shortFaculty } from '../features/profile/faculties';
import { useNickname } from './nicknameStore';
import { Avatar } from './Avatar';
import { CakeIcon, PlusIcon } from './icons';
import { copyText } from './copyText';
import { useAnchor, type Rect } from './Popover';
import { RoleBadge } from './RoleBadge';
import { type, useColors } from './theme';

type ProfileViewProps = {
  profile: Profile;
  // На своём профиле: маленький «+» у аватарки открывает меню (фото профиля, история)
  onPlus?: (rect: Rect) => void;
};

// Шапка профиля — одна и та же для своего и чужого: слева имя, роль и факультет, справа аватар;
// ниже «о себе» и цифры
export function ProfileView({ profile, onPlus }: ProfileViewProps) {
  const colors = useColors();
  const nickname = useNickname(profile.profileId);
  const plusAnchor = useAnchor();
  const extras = useExtras(profile.profileId);
  const links = extras.links.filter((link) => normalizeLink(link) !== null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  const meta = [profile.faculty ? shortFaculty(profile.faculty) : null, profile.course !== null ? `${profile.course} курс` : null].filter(Boolean).join(' · ');

  const avatar = <Avatar avatarUrl={profile.avatarUrl} name={profile.displayName} size={84} />;

  return (
    <View style={styles.wrap}>
      <View style={styles.top}>
        <View style={styles.text}>
          <Text accessibilityRole="header" style={[type.largeTitle, styles.name, { color: colors.text }]}>
            {profile.displayName}
          </Text>
          {nickname ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Никнейм: ${nickname}`}
              accessibilityHint="Долгое нажатие копирует никнейм"
              delayLongPress={400}
              onLongPress={() => void copyText(`@${nickname}`).then(setCopied)}
              style={styles.nickRow}
            >
              <Text style={[type.footnote, { color: colors.muted }]}>@{nickname}</Text>
              {copied ? (
                <View accessibilityLiveRegion="polite" style={[styles.copied, { backgroundColor: colors.fill }]}>
                  <Text style={[type.caption, { color: colors.text }]}>Скопировано</Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
          {/* Бейдж роли и «Факультет · курс» на одной строке, через точку */}
          <View style={styles.roleRow}>
            <RoleBadge role={profile.role} />
            {meta ? (
              <>
                <Text style={[type.footnote, { color: colors.muted }]}>·</Text>
                <Text numberOfLines={1} style={[type.footnote, styles.meta, { color: colors.muted }]}>
                  {meta}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        {onPlus ? (
          <View>
            {avatar}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Фото профиля и история"
              ref={plusAnchor.ref}
              hitSlop={10}
              onPress={() => plusAnchor.measure(onPlus)}
              style={({ pressed }) => [styles.plus, { backgroundColor: colors.highlight, borderColor: colors.background, opacity: pressed ? 0.7 : 1 }]}
            >
              <PlusIcon color={colors.onHighlight} size={11} />
            </Pressable>
          </View>
        ) : (
          avatar
        )}
      </View>

      {profile.about ? (
        <Text numberOfLines={2} style={[type.body, { color: colors.text }]}>
          {profile.about}
        </Text>
      ) : null}

      {extras.showBirth && extras.birth ? (
        <View style={styles.birth}>
          <CakeIcon color={colors.muted} />
          <Text style={[type.footnote, { color: colors.muted }]}>{birthLine(extras.birth, new Date())}</Text>
        </View>
      ) : null}

      {links.length > 0 ? (
        <View style={styles.links}>
          {links.map((link) => (
            <Pressable
              key={link}
              accessibilityRole="link"
              accessibilityLabel={`${SERVICE_LABEL[detectService(link)]}: ${link}`}
              hitSlop={6}
              onPress={() => void Linking.openURL(normalizeLink(link) ?? link).catch(() => undefined)}
              style={({ pressed }) => [styles.linkChip, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
            >
              <ServiceLogo service={detectService(link)} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Друзей и подписчиков на сервере пока нет — показываем нули */}
      <Text style={[type.footnote, { color: colors.muted }]}>0 подписчиков · 0 друзей</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  birth: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -6, marginLeft: -4 },
  links: { flexDirection: 'row', gap: 8 },
  linkChip: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  text: { flex: 1, gap: 8 },
  name: { fontSize: 28, lineHeight: 34 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexShrink: 1 },
  nickRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -4, alignSelf: 'flex-start' },
  copied: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  plus: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
