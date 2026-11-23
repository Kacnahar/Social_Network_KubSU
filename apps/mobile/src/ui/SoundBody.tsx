import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View, type GestureResponderEvent } from 'react-native';
import { formatMinutes, MELODIES, stepMinutes, type Melody } from './soundSettings';
import { updateSound, useSound } from './soundStore';
import { type, useColors } from './theme';

// Экран «Звук»: переключатели и ползунок, сгруппированы. Всё запоминается на устройстве (soundStore)

// Короткий пробный звук: пока только в браузере (на телефоне нужна библиотека звука, её в проекте ещё нет)
function previewMelody(melody: Melody): boolean {
  if (Platform.OS !== 'web') return false;
  try {
    const Ctx = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctx) return false;
    const ctx = new Ctx();
    const notes = MELODIES.find((m) => m.value === melody)?.hz ?? [];
    notes.forEach((hz, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = ctx.currentTime + index * 0.18;
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    setTimeout(() => void ctx.close(), 1500);
    return true;
  } catch {
    return false;
  }
}

function Heading({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[type.footnote, styles.heading, { color: colors.muted }]}>{children}</Text>;
}

function ToggleRow({ title, note, value, onChange }: { title: string; note?: string; value: boolean; onChange: (value: boolean) => void }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowText}>
        <Text style={[type.body, { color: colors.text }]}>{title}</Text>
        {note ? <Text style={[type.footnote, { color: colors.muted }]}>{note}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.background}
        // На вебе цвет включённого бегунка задаётся отдельным свойством, которого нет в типах телефона
        {...({ activeThumbColor: colors.background } as object)}
      />
    </View>
  );
}

// Ползунок: нажатие и движение пальцем; на клавиатуре — стрелками
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const set = (event: GestureResponderEvent) => {
    if (width <= 0) return;
    onChange(Math.round(Math.min(1, Math.max(0, event.nativeEvent.locationX / width)) * 100));
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(Math.min(100, Math.max(0, value + (e.nativeEvent.actionName === 'increment' ? 10 : -10))))}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={set}
      onResponderMove={set}
      style={styles.sliderHit}
    >
      <View style={[styles.track, { backgroundColor: colors.fill }]}>
        <View style={[styles.fillBar, { width: `${value}%`, backgroundColor: colors.primary }]} />
      </View>
      <View pointerEvents="none" style={[styles.knob, { left: `${value}%`, backgroundColor: colors.card, borderColor: colors.primary }]} />
    </View>
  );
}

function TimeStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const colors = useColors();
  const btn = (text: string, delta: number, name: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${name}`}
      hitSlop={6}
      onPress={() => onChange(stepMinutes(value, delta))}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: colors.fill, opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[type.headline, { color: colors.onSoft }]}>{text}</Text>
    </Pressable>
  );
  return (
    <View style={styles.time}>
      <Text style={[type.subhead, { color: colors.muted }]}>{label}</Text>
      <View style={styles.timeRow}>
        {btn('−', -30, 'раньше на полчаса')}
        <Text style={[type.headline, styles.timeText, { color: colors.text }]}>{formatMinutes(value)}</Text>
        {btn('+', 30, 'позже на полчаса')}
      </View>
    </View>
  );
}

export function SoundBody() {
  const colors = useColors();
  const s = useSound();
  const [note, setNote] = useState(false);

  const pick = (melody: Melody) => {
    updateSound({ melody });
    setNote(!previewMelody(melody));
  };

  return (
    <View style={styles.wrap}>
      <Heading>Уведомления</Heading>
      <View style={styles.group}>
        <ToggleRow title="Звук уведомлений" value={s.notifySound} onChange={(v) => updateSound({ notifySound: v })} />
        <View style={[styles.melodies, { opacity: s.notifySound ? 1 : 0.45 }]} pointerEvents={s.notifySound ? 'auto' : 'none'}>
          <Text style={[type.subhead, styles.melodyTitle, { color: colors.muted }]}>Мелодия</Text>
          {MELODIES.map((m) => (
            <Pressable
              key={m.value}
              accessibilityRole="radio"
              accessibilityLabel={`${m.label}. Нажмите, чтобы выбрать и послушать`}
              accessibilityState={{ selected: s.melody === m.value, checked: s.melody === m.value, disabled: !s.notifySound }}
              onPress={() => pick(m.value)}
              style={({ pressed }) => [styles.melody, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={[styles.radio, { borderColor: s.melody === m.value ? colors.primary : colors.border }]}>
                {s.melody === m.value ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
              </View>
              <Text style={[type.body, styles.melodyName, { color: colors.text }]}>{m.label}</Text>
              {Platform.OS === 'web' ? <Text style={[type.footnote, { color: colors.onSoft }]}>Послушать</Text> : null}
            </Pressable>
          ))}
          {note ? <Text style={[type.footnote, { color: colors.muted }]}>Прослушивание пока работает только в браузере</Text> : null}
        </View>
        <ToggleRow title="Вибрация" value={s.vibration} onChange={(v) => updateSound({ vibration: v })} />
      </View>

      <Heading>Сообщения</Heading>
      <View style={styles.group}>
        <ToggleRow title="Звук входящих сообщений" value={s.messageIn} onChange={(v) => updateSound({ messageIn: v })} />
        <ToggleRow title="Звук отправки сообщения" value={s.messageOut} onChange={(v) => updateSound({ messageOut: v })} />
      </View>

      <Heading>Войс</Heading>
      <View style={styles.group}>
        <ToggleRow title="Вход и выход участников" note="Короткий сигнал, когда кто-то входит в комнату или выходит" value={s.roomJoin} onChange={(v) => updateSound({ roomJoin: v })} />
        <View style={[styles.sliderRow, { borderBottomColor: colors.border }]}>
          <View style={styles.sliderHead}>
            <Text style={[type.body, { color: colors.text }]}>Громкость собеседников</Text>
            <Text style={[type.subhead, { color: colors.muted }]}>{s.roomVolume}%</Text>
          </View>
          <Slider label="Громкость собеседников" value={s.roomVolume} onChange={(v) => updateSound({ roomVolume: v })} />
        </View>
      </View>

      <Heading>Приложение</Heading>
      <View style={styles.group}>
        <ToggleRow title="Звуки интерфейса" note="Нажатия, лайки, обновление ленты" value={s.uiSounds} onChange={(v) => updateSound({ uiSounds: v })} />
        <ToggleRow title="Не беспокоить" note="Без звуков и вибрации по расписанию" value={s.dndOn} onChange={(v) => updateSound({ dndOn: v })} />
        {s.dndOn ? (
          <View style={[styles.timeBlock, { borderBottomColor: colors.border }]}>
            <TimeStepper label="С" value={s.dndFrom} onChange={(v) => updateSound({ dndFrom: v })} />
            <TimeStepper label="До" value={s.dndTo} onChange={(v) => updateSound({ dndTo: v })} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  heading: { marginTop: 18, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  group: { marginHorizontal: -20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 1 },
  melodies: { paddingHorizontal: 20, paddingBottom: 6 },
  melodyTitle: { paddingTop: 4, paddingBottom: 2 },
  melody: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, borderBottomWidth: StyleSheet.hairlineWidth },
  melodyName: { flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  sliderRow: { paddingHorizontal: 20, paddingVertical: 12, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderHit: { height: 44, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fillBar: { height: 4 },
  knob: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2, marginLeft: -11, top: 11 },
  timeBlock: { flexDirection: 'row', flexWrap: 'wrap', gap: 24, rowGap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  time: { gap: 6 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeText: { minWidth: 58, textAlign: 'center', fontVariant: ['tabular-nums'] },
  stepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
