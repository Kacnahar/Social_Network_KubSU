import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, noOutline } from '../../ui/components';
import { CheckIcon } from '../../ui/icons';
import { radius, type, useColors } from '../../ui/theme';

export const REPORT_REASONS = ['Спам', 'Оскорбления', 'Неприемлемый контент', 'Ложная информация', 'Другое'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
const OTHER: ReportReason = 'Другое';
const TEXT_MAX = 200;

// Строка причины для отправки: «Спам» или «Другое: текст»
export const reportText = (reason: ReportReason, details: string): string => (reason === OTHER && details.trim() ? `${OTHER}: ${details.trim()}` : reason);

type Props = { visible: boolean; loading?: boolean; error?: string | null; onSend: (reason: string) => void; onCancel: () => void };

// Компактное окно жалобы: выбрать причину; у «Другое» появляется поле для текста
export function ReportDialog({ visible, loading = false, error = null, onSend, onCancel }: Props) {
  const colors = useColors();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  useEffect(() => {
    if (visible) {
      setReason(null);
      setDetails('');
    }
  }, [visible]);
  const ready = reason !== null && (reason !== OTHER || details.trim() !== '');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable accessibilityLabel="Закрыть" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={loading ? undefined : onCancel} />
        <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[type.title, styles.center, { color: colors.text }]}>
            Пожаловаться
          </Text>
          <Text style={[type.subhead, styles.center, { color: colors.muted }]}>Что не так с этим постом?</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {REPORT_REASONS.map((item, index) => (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected: reason === item, checked: reason === item }}
                onPress={() => setReason(item)}
                style={({ pressed }) => [styles.reason, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[type.body, styles.reasonText, { color: colors.text }]}>{item}</Text>
                {reason === item ? <CheckIcon color={colors.text} /> : null}
              </Pressable>
            ))}
            {reason === OTHER ? (
              <TextInput
                accessibilityLabel="Опишите, что не так"
                value={details}
                onChangeText={(text) => setDetails(text.slice(0, TEXT_MAX))}
                multiline
                autoFocus
                placeholder="Опишите коротко"
                placeholderTextColor={colors.muted}
                textAlignVertical="top"
                style={[type.body, styles.input, noOutline, { color: colors.text, backgroundColor: colors.fill }]}
              />
            ) : null}
          </ScrollView>
          {error ? (
            <Text accessibilityRole="alert" style={[type.footnote, styles.center, { color: colors.danger }]}>
              {error}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button square variant="secondary" title="Отмена" onPress={onCancel} disabled={loading} />
            </View>
            <View style={styles.button}>
              <Button square title="Отправить" onPress={() => reason && onSend(reportText(reason, details))} disabled={!ready} loading={loading} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, maxHeight: '86%', borderRadius: radius.field, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 10 },
  center: { textAlign: 'center' },
  list: { flexGrow: 0 },
  reason: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 10 },
  reasonText: { flex: 1 },
  input: { minHeight: 84, borderRadius: radius.control, padding: 12, marginTop: 6 },
  buttons: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  button: { flex: 1 },
});
