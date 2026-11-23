import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './components';
import { radius, type, useColors } from './theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmTitle: string;
  cancelTitle?: string;
  // Опасное действие — кнопка подтверждения красная
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// Окно подтверждения по центру экрана: вопрос и две кнопки. Тёмная подложка закрывает всё остальное
export function ConfirmDialog({ visible, title, message, confirmTitle, cancelTitle = 'Отмена', danger = false, loading = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.wrap}>
        <Pressable accessibilityLabel="Закрыть" style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]} onPress={loading ? undefined : onCancel} />
        <View accessibilityRole="alert" style={[styles.dialog, { backgroundColor: colors.card }]}>
          <Text accessibilityRole="header" style={[type.title, styles.center, { color: colors.text }]}>
            {title}
          </Text>
          {message ? <Text style={[type.subhead, styles.center, { color: colors.muted }]}>{message}</Text> : null}
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button size="compact" variant="secondary" title={cancelTitle} onPress={onCancel} disabled={loading} />
            </View>
            <View style={styles.button}>
              <Button size="compact" variant={danger ? 'danger' : 'primary'} title={confirmTitle} onPress={onConfirm} loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 340, borderRadius: radius.card, borderCurve: 'continuous', padding: 22, gap: 10 },
  center: { textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  button: { flex: 1 },
});
