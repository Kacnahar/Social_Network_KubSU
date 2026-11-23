import { can } from '@app/shared';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSession, useSignedIn } from '../../lib/session';
import { BackButton } from '../../ui/BackButton';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Screen, Title } from '../../ui/components';
import { BellIcon, BlockIcon, GlobeIcon, HeartIcon, LockIcon, MarkIcon, ProfileIcon, SpeakerIcon, ThemeIcon } from '../../ui/icons';
import { SettingsGroup, SettingsRow } from '../../ui/SettingsList';
import { themeChoiceLabel } from '../../ui/themeChoice';
import { useThemeChoice } from '../../ui/themeStore';
import { type, useColors } from '../../ui/theme';
import { Pressable } from 'react-native';

// Настройки: список с тонкими иконками. У гостя только «Язык» и «Тема»
export default function SettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signOut } = useSession();
  const { account } = useSignedIn();
  const theme = useThemeChoice();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const full = can(account.role, 'publish');
  const open = (item: string) => router.push({ pathname: '/settings/[item]', params: { item } });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const icon = colors.text;

  const leave = async () => {
    setLeaving(true);
    await signOut();
  };

  return (
    <Screen align="top">
      <BackButton onPress={back} />
      <Title>Настройки</Title>

      {full && account.isAdmin ? (
        <SettingsGroup>
          <SettingsRow title="Админка" icon={<MarkIcon color={icon} mark="A" />} onPress={() => router.push('/admin')} />
        </SettingsGroup>
      ) : null}

      {full ? (
        <SettingsGroup>
          <SettingsRow title="Аккаунт" icon={<ProfileIcon color={icon} />} onPress={() => open('account')} />
          <SettingsRow title="Мне нравится" icon={<HeartIcon color={icon} background={colors.background} size={20} />} onPress={() => open('liked')} />
          <SettingsRow title="Уведомления" icon={<BellIcon color={icon} />} onPress={() => open('notifications')} />
          <SettingsRow title="Звук" icon={<SpeakerIcon color={icon} />} onPress={() => open('sound')} />
          <SettingsRow title="Конфиденциальность и безопасность" icon={<LockIcon color={icon} />} onPress={() => open('privacy')} />
          <SettingsRow title="Заблокированные" icon={<BlockIcon color={icon} />} onPress={() => open('blocked')} />
        </SettingsGroup>
      ) : null}

      <SettingsGroup>
        <SettingsRow title="Язык" value="Русский" icon={<GlobeIcon color={icon} />} onPress={() => open('language')} />
        <SettingsRow title="Тема" value={themeChoiceLabel(theme)} icon={<ThemeIcon color={icon} />} onPress={() => open('theme')} />
      </SettingsGroup>

      {full ? (
        <SettingsGroup>
          <SettingsRow title="Помощь и поддержка" icon={<MarkIcon color={icon} mark="?" />} onPress={() => open('help')} />
          <SettingsRow title="О приложении" icon={<MarkIcon color={icon} mark="i" />} onPress={() => open('about')} />
        </SettingsGroup>
      ) : null}

      {/* Выход — отдельно, с отступом, красным текстом по центру, без рамки */}
      {full ? (
        <View style={styles.leaveWrap}>
          <Pressable accessibilityRole="button" accessibilityLabel="Выйти из аккаунта" hitSlop={10} onPress={() => setConfirming(true)} style={({ pressed }) => [styles.leave, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[type.body, styles.leaveText, { color: colors.danger }]}>Выйти из аккаунта</Text>
          </Pressable>
        </View>
      ) : null}

      <ConfirmDialog
        visible={confirming}
        title="Выйти из аккаунта?"
        message="Чтобы вернуться, понадобится снова ввести почту и код"
        confirmTitle="Выйти"
        danger
        loading={leaving}
        onConfirm={() => void leave()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  leaveWrap: { paddingTop: 28, paddingBottom: 12, alignItems: 'center' },
  leave: { minHeight: 44, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  leaveText: { fontWeight: '500' },
});
