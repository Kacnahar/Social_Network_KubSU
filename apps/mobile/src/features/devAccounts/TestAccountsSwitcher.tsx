import { ROLE_LABEL } from '@app/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { CheckIcon } from '../../ui/icons';
import { SettingsGroup } from '../../ui/SettingsList';
import { showToast } from '../../ui/toastStore';
import { type, useColors } from '../../ui/theme';
import { ensureTestSession, readTestSessions } from './devSessions';
import { ALL_TEST_ACCOUNTS, type TestAccount } from './testAccounts';

// ТОЛЬКО для разработки: список тестовых аккаунтов в настройках, нажатие мгновенно переключает без выхода и без кода
export function TestAccountsSwitcher() {
  const colors = useColors();
  const { state, signIn } = useSession();
  const [tokens, setTokens] = useState<{ [email: string]: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const currentToken = state.status === 'signedIn' ? state.token : null;

  useEffect(() => {
    void readTestSessions().then((store) => setTokens(Object.fromEntries(Object.entries(store).map(([email, record]) => [email, record.token]))));
  }, [currentToken]);

  const choose = async (account: TestAccount) => {
    if (busy) return;
    setBusy(account.email);
    try {
      const token = await ensureTestSession(account);
      await signIn(token);
      setTokens((current) => ({ ...current, [account.email]: token }));
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Не получилось переключиться');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[type.footnote, styles.title, { color: colors.textSecondary }]}>Тестовые аккаунты (только в разработке)</Text>
      <SettingsGroup>
        {ALL_TEST_ACCOUNTS.map((account) => {
          const current = currentToken !== null && tokens[account.email] === currentToken;
          return (
            <Pressable
              key={account.email}
              accessibilityRole="button"
              accessibilityLabel={`${account.label}, ${ROLE_LABEL[account.role]}${current ? ', сейчас выбран' : ''}`}
              onPress={() => void choose(account)}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Avatar avatarUrl={null} name={account.label} size={36} />
              <View style={styles.text}>
                <Text numberOfLines={1} style={[type.body, { color: colors.textPrimary }]}>
                  {account.label}
                </Text>
                <Text style={[type.footnote, { color: colors.textSecondary }]}>
                  {ROLE_LABEL[account.role]} · {account.email}
                </Text>
              </View>
              {busy === account.email ? <ActivityIndicator color={colors.muted} /> : current ? <CheckIcon color={colors.textPrimary} /> : null}
            </Pressable>
          );
        })}
      </SettingsGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  title: { marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 },
  text: { flex: 1, gap: 1 },
});
