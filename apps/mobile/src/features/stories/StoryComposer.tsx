import { STORY_CAPTION_MAX } from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { uploadMedia } from '../../lib/api';
import { checkPhoto, readPhoto } from '../../lib/photo';
import { useSignedIn } from '../../lib/session';
import { useFail } from '../../lib/useFail';
import { Body, Button, Card, ErrorText, Field } from '../../ui/components';
import { radius, type, useColors } from '../../ui/theme';
import { createStory } from './api';

type Picked = { uri: string; blob: Blob };

// Форма новой истории: одно фото и необязательная подпись
export function StoryComposer() {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token } = useSignedIn();
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [picking, setPicking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Уже загруженное фото: при повторной попытке после ошибки заново не отправляем
  const uploaded = useRef<string | null>(null);

  const pick = async () => {
    setPhotoError(null);
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 0.85,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      const blob = await readPhoto(asset.uri);
      const issue = checkPhoto(blob);
      if (issue) {
        setPhotoError(issue);
        return;
      }
      uploaded.current = null;
      setPhoto({ uri: asset.uri, blob });
    } catch (caught) {
      setPhotoError(await fail(caught));
    } finally {
      setPicking(false);
    }
  };

  // Вкладка остаётся в памяти, поэтому форму очищаем сами
  const reset = () => {
    setPhoto(null);
    setCaption('');
    setError(null);
    setPhotoError(null);
    setPublishing(false);
    uploaded.current = null;
  };

  const publish = async () => {
    if (!photo) return;
    setError(null);
    setPublishing(true);
    try {
      uploaded.current ??= (await uploadMedia(token, 'story', photo.blob)).mediaId;
      await createStory(token, { mediaId: uploaded.current, caption: caption.trim() });
      reset();
      router.navigate('/');
    } catch (caught) {
      setError(await fail(caught));
      setPublishing(false);
    }
  };

  const cancel = () => {
    reset();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <>
      <Card>
        <View style={[styles.frame, { backgroundColor: colors.fill }]}>
          {photo ? (
            <Image source={{ uri: photo.uri }} accessibilityLabel="Выбранное фото истории" style={styles.image} resizeMode="contain" />
          ) : (
            <Text style={[type.subhead, { color: colors.muted }]}>Фото не выбрано</Text>
          )}
        </View>
        <ErrorText>{photoError}</ErrorText>
        <Button
          variant="secondary"
          title={photo ? 'Заменить' : 'Выбрать фото'}
          onPress={() => void pick()}
          loading={picking}
          disabled={publishing}
        />
        <Field
          label="Подпись"
          value={caption}
          onChangeText={setCaption}
          maxLength={STORY_CAPTION_MAX}
          autoCapitalize="sentences"
          autoCorrect
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={styles.caption}
          hint={`Необязательно. ${caption.length} из ${STORY_CAPTION_MAX}`}
          editable={!publishing}
        />
      </Card>

      <Body muted>История исчезнет через 24 часа. Вы увидите, кто её посмотрел.</Body>
      <ErrorText>{error}</ErrorText>
      <Button title="Опубликовать историю" onPress={() => void publish()} loading={publishing} disabled={!photo || picking} />
      <Button variant="plain" title="Отмена" onPress={cancel} disabled={publishing || picking} />
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 180,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    borderRadius: radius.field,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  caption: { minHeight: 80 },
});
