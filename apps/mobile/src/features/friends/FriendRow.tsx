import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../ui/Avatar';
import { DotsIcon } from '../../ui/icons';
import { useAnchor, type Rect } from '../../ui/Popover';
import { radius, type, useColors } from '../../ui/theme';
import type { Person } from './testData';

// Маленькая кнопка в строке: высота 32, скругление radius.control; primary — главное действие, иначе мягкая подложка
export function RowButton({ title, primary = false, onPress, label }: { title: string; primary?: boolean; onPress: () => void; label?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: primary ? colors.primary : colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[type.footnote, styles.buttonText, { color: primary ? colors.onPrimary : colors.textPrimary }]}>{title}</Text>
    </Pressable>
  );
}

type Props = {
  person: Person;
  onOpen: () => void;
  // Друг: «Профиль» и «⋯». Заявка: «Принять» и «Отклонить»
  mode: 'friend' | 'request';
  onMenu?: (rect: Rect) => void;
  onAccept?: () => void;
  onDecline?: () => void;
};

// Строка человека без карточек и теней: аватар, @никнейм жирным, ниже имя серым, справа кнопки
export function FriendRow({ person, onOpen, mode, onMenu, onAccept, onDecline }: Props) {
  const colors = useColors();
  const anchor = useAnchor();
  return (
    <View style={styles.row}>
      {/* Нажатие на аватар и имена открывает профиль; кнопки справа — отдельно, чтобы не вкладывать кнопку в кнопку */}
      <Pressable accessibilityRole="button" accessibilityLabel={`Открыть профиль: ${person.name}`} onPress={onOpen} style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}>
        <Avatar avatarUrl={null} name={person.name} size={46} />
        <View style={styles.text}>
          <Text numberOfLines={1} style={[styles.nick, { color: colors.textPrimary }]}>
            @{person.nickname}
          </Text>
          <Text numberOfLines={1} style={[type.footnote, { color: colors.textSecondary }]}>
            {person.name}
          </Text>
        </View>
      </Pressable>
      {mode === 'friend' ? (
        <>
          <RowButton title="Профиль" onPress={onOpen} label={`Профиль: ${person.name}`} />
          <Pressable ref={anchor.ref} accessibilityRole="button" accessibilityLabel={`Ещё: ${person.name}`} hitSlop={8} onPress={() => onMenu && anchor.measure(onMenu)} style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}>
            <DotsIcon color={colors.textSecondary} />
          </Pressable>
        </>
      ) : (
        <>
          <RowButton primary title="Принять" onPress={onAccept ?? (() => undefined)} label={`Принять заявку: ${person.name}`} />
          <RowButton title="Отклонить" onPress={onDecline ?? (() => undefined)} label={`Отклонить заявку: ${person.name}`} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66, paddingVertical: 10, paddingHorizontal: 16 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 1 },
  nick: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
  button: { height: 32, paddingHorizontal: 12, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '600' },
  more: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
});
