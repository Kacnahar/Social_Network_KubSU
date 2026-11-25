import { can } from '@app/shared';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FORUM_CATEGORIES, TOPIC_TEXT_MAX, TOPIC_TITLE_MAX, addTopic, type ForumCategory } from '../../features/forum/forum';
import { useSignedIn } from '../../lib/session';
import { Chips } from '../../ui/Chips';
import { Field } from '../../ui/components';
import { StepScreen } from '../../ui/StepScreen';
import { type, useColors } from '../../ui/theme';

// Новая тема форума: категория, заголовок, текст. Тема живёт в памяти приложения, пока у форума нет сервера
export default function NewTopicScreen() {
  const router = useRouter();
  const colors = useColors();
  const { account, profile } = useSignedIn();
  const [category, setCategory] = useState<ForumCategory>('study');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  // Гость темы не создаёт
  if (!can(account.role, 'publish')) return <Redirect href="/catalog/forum" />;

  const back = () => (router.canGoBack() ? router.back() : router.replace('/catalog/forum'));
  const valid = title.trim() !== '' && text.trim() !== '';
  const publish = () => {
    if (!valid) return;
    addTopic({ category, title: title.trim(), text: text.trim(), author: profile?.displayName ?? 'Студент' });
    back();
  };

  return (
    <StepScreen title="Новая тема" onBack={back} primary={{ title: 'Опубликовать', onPress: publish, disabled: !valid }}>
      <View style={styles.fields}>
        <View style={styles.group}>
          <Text style={[type.subhead, { color: colors.muted }]}>Категория</Text>
          <Chips options={FORUM_CATEGORIES} value={category} allowNone={false} onChange={(value) => value && setCategory(value)} />
        </View>
        <Field label="Заголовок" value={title} onChangeText={(value) => setTitle(value.slice(0, TOPIC_TITLE_MAX))} />
        <Field label="О чём хотите поговорить" value={text} onChangeText={(value) => setText(value.slice(0, TOPIC_TEXT_MAX))} multiline />
      </View>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 18 },
  group: { gap: 8 },
});
