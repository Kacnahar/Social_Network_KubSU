import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { noOutline } from './components';
import { SearchIcon } from './icons';
import { radius, type, useColors, useScheme } from './theme';

// Строка поиска: лупа слева, без рамки; активная — чуть плотнее фон, как у остальных полей
export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (text: string) => void; placeholder: string }) {
  const colors = useColors();
  const light = useScheme() === 'light';
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, { backgroundColor: focused ? colors.fillActive : colors.fill, borderColor: colors.border, borderWidth: light ? 1 : 0 }]}>
      <SearchIcon color={colors.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        inputMode="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[type.body, styles.input, noOutline, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderCurve: 'continuous' },
  input: { flex: 1, minHeight: 44, paddingVertical: 8 },
});
