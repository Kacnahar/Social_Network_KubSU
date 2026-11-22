import { POST_PHOTOS_MAX, POST_TEXT_MAX } from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { uploadMedia } from '../../lib/api';
import { checkPhoto, readPhoto } from '../../lib/photo';
import { pausedBodyText } from '../../lib/banText';
import { useSession, useSignedIn } from '../../lib/session';
import { Body, Button, Card, ErrorText, Field, Screen, Title } from '../../ui/components';
import { Segmented } from '../../ui/Segmented';
import { radius, useColors } from '../../ui/theme';
import { createPost } from '../../features/posts/api';
import { StoryComposer } from '../../features/stories/StoryComposer';
import { useFail } from '../../lib/useFail';

type Picked = { key: number; uri: string; blob: Blob };
type Kind = 'post' | 'story';

const KINDS = [
  { value: 'post', label: 'Пост' },
  { value: 'story', label: 'История' },
] as const;

export default function CreateScreen() {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<Kind>('post');
  const { token, account } = useSignedIn();
  const { refreshAccount } = useSession();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(0);
  // Уже загруженные фото: при повторной попытке после ошибки заново их не отправляем
  const uploaded = useRef(new Map<number, string>());

  // Кружок «Добавить» открывает сразу историю; параметр сбрасываем, чтобы он не держал выбор насовсем
  useFocusEffect(
    useCallback(() => {
      // Бан могли выдать, пока приложение открыто
      void refreshAccount();
      if (params.kind === 'story') {
        setKind('story');
        router.setParams({ kind: undefined });
      }
    }, [params.kind, router, refreshAccount]),
  );

  const busy = picking || publishing;
  const empty = text.trim() === '' && photos.length === 0;

  const pickPhotos = async () => {
    setPhotoError(null);
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: POST_PHOTOS_MAX - photos.length,
        allowsEditing: false,
        quality: 0.85,
      });
      if (result.canceled) return;
      const added: Picked[] = [];
      let problem: string | null = null;
      for (const asset of result.assets.slice(0, POST_PHOTOS_MAX - photos.length)) {
        const blob = await readPhoto(asset.uri);
        const issue = checkPhoto(blob);
        if (issue) problem = issue;
        else added.push({ key: nextKey.current++, uri: asset.uri, blob });
      }
      setPhotos((current) => [...current, ...added]);
      if (problem) setPhotoError(problem);
    } catch (caught) {
      setPhotoError(await fail(caught));
    } finally {
      setPicking(false);
    }
  };

  const removePhoto = (key: number) => {
    setPhotoError(null);
    uploaded.current.delete(key);
    setPhotos((current) => current.filter((photo) => photo.key !== key));
  };

  const publish = async () => {
    setError(null);
    setPublishing(true);
    try {
      const ids: string[] = [];
      for (const [index, photo] of photos.entries()) {
        let mediaId = uploaded.current.get(photo.key);
        if (!mediaId) {
          setProgress(`Загружаем фото ${index + 1} из ${photos.length}…`);
          mediaId = (await uploadMedia(token, 'post', photo.blob)).mediaId;
          uploaded.current.set(photo.key, mediaId);
        }
        ids.push(mediaId);
      }
      setProgress(null);
      await createPost(token, { text: text.trim(), photoMediaIds: ids });
      reset();
      router.navigate('/');
    } catch (caught) {
      setError(await fail(caught));
      setProgress(null);
      setPublishing(false);
    }
  };

  // Вкладка остаётся открытой в памяти, поэтому форму очищаем сами
  const reset = () => {
    setText('');
    setPhotos([]);
    setError(null);
    setPhotoError(null);
    setProgress(null);
    setPublishing(false);
    uploaded.current.clear();
  };

  const cancel = () => {
    reset();
    router.navigate('/');
  };

  if (account.status === 'banned') {
    return (
      <Screen align="top">
        <Title>Публикации на паузе</Title>
        <Body>{pausedBodyText(account.bannedUntil)}</Body>
        <Body muted>Если считаете это ошибкой, напишите организаторам</Body>
      </Screen>
    );
  }

  return (
    <Screen align="top">
      <Title>Создать</Title>
      <Segmented options={KINDS} value={kind} onChange={setKind} />

      {kind === 'post' ? (
        <>
          <Card>
            <Field
              label="Текст"
              value={text}
              onChangeText={setText}
              maxLength={POST_TEXT_MAX}
              autoCapitalize="sentences"
              autoCorrect
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={styles.text}
              hint={`${text.length} из ${POST_TEXT_MAX}`}
              editable={!publishing}
            />

            {photos.length > 0 ? (
              <View style={styles.grid}>
                {photos.map((photo, index) => (
                  <View key={photo.key} style={styles.item}>
                    <Image
                      source={{ uri: photo.uri }}
                      accessibilityLabel={`Фото ${index + 1} из ${photos.length}`}
                      style={[styles.thumb, { backgroundColor: colors.fill }]}
                    />
                    <Button variant="plain" title="Убрать" onPress={() => removePhoto(photo.key)} disabled={publishing} />
                  </View>
                ))}
              </View>
            ) : null}
            <Body muted>
              Фото: {photos.length} из {POST_PHOTOS_MAX}
            </Body>
            <ErrorText>{photoError}</ErrorText>
            <Button
              variant="secondary"
              title="Добавить фото"
              onPress={() => void pickPhotos()}
              loading={picking}
              disabled={publishing || photos.length >= POST_PHOTOS_MAX}
            />
          </Card>

          {progress ? <Body muted>{progress}</Body> : null}
          <ErrorText>{error}</ErrorText>
          <Button title="Опубликовать" onPress={() => void publish()} loading={publishing} disabled={empty || picking} />
          <Button variant="plain" title="Отмена" onPress={cancel} disabled={busy} />
        </>
      ) : null}
      {/* Форма истории остаётся в памяти при переключении, чтобы не терять выбранное фото */}
      <View style={kind === 'story' ? styles.story : styles.hidden}>
        <StoryComposer />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hidden: { display: 'none' },
  story: { gap: 16 },
  text: { minHeight: 140 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { alignItems: 'center', gap: 2 },
  thumb: { width: 96, height: 96, borderRadius: radius.field, borderCurve: 'continuous' },
});
