import { StyleSheet, Text, View } from 'react-native';
import { Checkbox } from '../../ui/Checkbox';
import { type, useColors } from '../../ui/theme';
import { Collapsible } from './Collapsible';
import { MESSENGERS, formatPhone, isPhoneComplete, parsePhoneInput, type Messenger } from './contact';
import { FloatingField } from './FloatingField';

// «Телефон для связи» для всех форм объявлений: необязательная строка с маской +7 (___) ___-__-__ и цифровой клавиатурой.
// Когда номер введён полностью, плавно появляются галочки «WhatsApp, Telegram, MAX — есть на этом номере».
// Стёрли номер — галочки прячутся и сбрасываются.
export function PhoneSection({ phone, messengers, onChange }: { phone: string; messengers: readonly Messenger[]; onChange: (patch: { phone: string; messengers: Messenger[] }) => void }) {
  const colors = useColors();
  const complete = isPhoneComplete(phone);

  const toggle = (kind: Messenger, checked: boolean) => onChange({ phone, messengers: MESSENGERS.filter((item) => (item.value === kind ? checked : messengers.includes(item.value))).map((item) => item.value) });

  return (
    <View>
      <FloatingField
        label="Телефон для связи"
        value={formatPhone(phone)}
        onChangeText={(text) => {
          const digits = parsePhoneInput(text);
          onChange({ phone: digits, messengers: digits === '' ? [] : [...messengers] });
        }}
        keyboardType="phone-pad"
        inputMode="tel"
        maxLength={18}
      />
      <Collapsible show={complete}>
        <View style={styles.messengers}>
          <Text style={[type.footnote, { color: colors.muted }]}>Есть на этом номере</Text>
          <View style={styles.row}>
            {MESSENGERS.map((item) => (
              <Checkbox key={item.value} compact label={item.label} checked={messengers.includes(item.value)} onChange={(checked) => toggle(item.value, checked)} />
            ))}
          </View>
        </View>
      </Collapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  messengers: { gap: 2, paddingTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 },
});
