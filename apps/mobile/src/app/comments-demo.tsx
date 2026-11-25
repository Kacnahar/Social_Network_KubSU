import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommentComposer, CommentList } from '../features/posts/Comments';
import { DEMO_POST_AUTHOR, useDemoComments } from '../features/posts/demoComments';
import { BackButton } from '../ui/BackButton';
import { type, useColors } from '../ui/theme';

// Пример веток комментариев на тестовых данных (открывается по адресу /comments-demo). Сервера для этого нет.
export default function CommentsDemoScreen() {
  const router = useRouter();
  const colors = useColors();
  const comments = useDemoComments();
  const [focusKey, setFocusKey] = useState(0);
  const [now] = useState(() => new Date());

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.column, styles.bar]}>
            <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
            <Text accessibilityRole="header" style={[type.headline, { color: colors.text }]}>
              Комментарии (пример)
            </Text>
            <View style={styles.space} />
          </View>
          <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.column}>
              <CommentList
                comments={comments}
                now={now}
                canReact
                postAuthorId={DEMO_POST_AUTHOR}
                onReply={(comment) => {
                  comments.setReplyTo(comment);
                  setFocusKey((key) => key + 1);
                }}
              />
            </View>
          </ScrollView>
          <View style={styles.column}>
            <CommentComposer comments={comments} focusKey={focusKey} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 20 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  space: { width: 40 },
  scroll: { flexGrow: 1, paddingBottom: 16 },
});
