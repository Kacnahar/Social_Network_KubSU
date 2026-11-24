import { POST_PHOTOS_MAX, can } from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createPost } from '../features/posts/api';
import { uploadMedia } from '../lib/api';
import { pausedBodyText } from '../lib/banText';
import { checkPhoto, readPhoto } from '../lib/photo';
import { useSignedIn } from '../lib/session';
import { useFail } from '../lib/useFail';
import { Avatar } from '../ui/Avatar';
import { Body, Button, ErrorText, Screen, Title, noOutline } from '../ui/components';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CameraIcon, CloseIcon, GalleryIcon } from '../ui/icons';
import { Segmented } from '../ui/Segmented';
import { radius, type, useColors } from '../ui/theme';

// Свой предел короче серверного: пост — короткая заметка. Счётчик появляется ближе к пределу
const TEXT_MAX = 500;
const COUNTER_FROM = 400;

type Picked = { key: number; uri: string; blob: Blob };
type Audience = 'all' | 'friends';

const AUDIENCE = [
  { value: 'all', label: 'Все' },
  { value: 'friends', label: 'Только друзья' },
] as const;

// Новый пост: выезжает снизу. Сверху «Отмена», заголовок и «Опубликовать»; ниже аватар и поле без рамок
export default function ComposeScreen() {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const { token, account, profile } = useSignedIn();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [audience, setAudience] = useState<Audience>('all');
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const nextKey = useRef(0);
  // Уже загруженные фото: при повторной попытке после ошибки заново их не отправляем
  const uploaded = useRef(new Map<number, string>());

  // Гость публиковать не может: по прямому адресу возвращаем в ленту
  if (!can(account.role, 'publish')) return <Redirect href="/" />;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const empty = text.trim() === '' && photos.length === 0;
  const busy = picking || publishing;
  const room = POST_PHOTOS_MAX - photos.length;

  const addAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const added: Picked[] = [];
    let problem: string | null = null;
    for (const asset of assets.slice(0, room)) {
      const blob = await readPhoto(asset.uri);
      const issue = checkPhoto(blob);
      if (issue) problem = issue;
      else added.push({ key: nextKey.current++, uri: asset.uri, blob });
    }
    setPhotos((current) => [...current, ...added]);
    if (problem) setPhotoError(problem);
  };

  const pickFromGallery = async () => {
    setPhotoError(null);
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: room,
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled) await addAssets(result.assets);
    } catch (caught) {
      setPhotoError(await fail(caught));
    } finally {
      setPicking(false);
    }
  };

  const takePhoto = async () => {
    setPhotoError(null);
    setPicking(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoError('Нет доступа к камере. Разрешите его в настройках телефона');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (!result.canceled) await addAssets(result.assets);
    } catch {
      setPhotoError('Камера на этом устройстве недоступна. Выберите фото из галереи');
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
      // Лента обновляется сама при возврате на неё — новый пост окажется сверху
      close();
    } catch (caught) {
      setError(await fail(caught));
      setProgress(null);
      setPublishing(false);
    }
  };

  const cancel = () => {
    if (empty) close();
    else setConfirmingDiscard(true);
  };

  if (account.status === 'banned') {
    return (
      <Screen align="top">
        <Title>Публикации на паузе</Title>
        <Body>{pausedBodyText(account.bannedUntil)}</Body>
        <Body muted>Если считаете это ошибкой, напишите организаторам</Body>
        <Button variant="secondary" title="Закрыть" onPress={close} />
      </Screen>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.column, styles.bar, { borderBottomColor: colors.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Отмена" hitSlop={10} disabled={publishing} onPress={cancel} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Text style={[type.body, { color: colors.text }]}>Отмена</Text>
            </Pressable>
            {/* Заголовок занимает всё место между «Отмена» и кнопкой: на узком экране равные поля по бокам не помещаются */}
            <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.title, { color: colors.text }]}>
              Новый пост
            </Text>
            <Button size="compact" title="Опубликовать" onPress={() => void publish()} loading={publishing} disabled={empty || picking} />
          </View>

          <ConfirmDialog
            visible={confirmingDiscard}
            title="Удалить черновик?"
            confirmTitle="Удалить"
            cancelTitle="Продолжить"
            danger
            onConfirm={close}
            onCancel={() => setConfirmingDiscard(false)}
          />

          <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.column, styles.compose]}>
              <Avatar avatarUrl={profile?.avatarUrl ?? null} name={profile?.displayName ?? ''} size={40} />
              <View style={styles.body}>
                <Text numberOfLines={1} style={[type.headline, { color: colors.text }]}>
                  {profile?.displayName}
                </Text>
                <TextInput
                  accessibilityLabel="Что нового?"
                  value={text}
                  onChangeText={setText}
                  placeholder="Что нового?"
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.accent}
                  maxLength={TEXT_MAX}
                  autoCapitalize="sentences"
                  autoCorrect
                  autoFocus
                  multiline
                  scrollEnabled={false}
                  editable={!publishing}
                  style={[type.body, styles.input, noOutline, { color: colors.text }]}
                />
                {text.length >= COUNTER_FROM ? (
                  <Text style={[type.footnote, styles.counter, { color: text.length >= TEXT_MAX ? colors.danger : colors.muted }]}>
                    {text.length} из {TEXT_MAX}
                  </Text>
                ) : null}

                {photos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
                    {photos.map((photo, index) => (
                      <View key={photo.key}>
                        <Image source={{ uri: photo.uri }} accessibilityLabel={`Фото ${index + 1} из ${photos.length}`} style={[styles.photo, { backgroundColor: colors.fill }]} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Убрать фото ${index + 1}`}
                          hitSlop={8}
                          disabled={publishing}
                          onPress={() => removePhoto(photo.key)}
                          style={[styles.remove, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                        >
                          <CloseIcon color={colors.text} />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                ) : null}

                <View style={styles.tools}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Фото из галереи"
                    hitSlop={8}
                    disabled={busy || room <= 0}
                    onPress={() => void pickFromGallery()}
                    style={({ pressed }) => ({ opacity: busy || room <= 0 ? 0.35 : pressed ? 0.6 : 1 })}
                  >
                    <GalleryIcon color={colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Снять на камеру"
                    hitSlop={8}
                    disabled={busy || room <= 0}
                    onPress={() => void takePhoto()}
                    style={({ pressed }) => ({ opacity: busy || room <= 0 ? 0.35 : pressed ? 0.6 : 1 })}
                  >
                    <CameraIcon color={colors.muted} />
                  </Pressable>
                  {photos.length > 0 ? (
                    <Text style={[type.footnote, { color: colors.muted }]}>
                      {photos.length} из {POST_PHOTOS_MAX}
                    </Text>
                  ) : null}
                </View>

                <ErrorText>{photoError}</ErrorText>
                {progress ? <Text style={[type.footnote, { color: colors.muted }]}>{progress}</Text> : null}
                <ErrorText>{error}</ErrorText>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.column, styles.audience, { borderTopColor: colors.border }]}>
            <Text style={[type.footnote, styles.audienceLabel, { color: colors.muted }]}>Кто видит</Text>
            <Segmented options={AUDIENCE} value={audience} onChange={setAudience} />
            {audience === 'friends' ? (
              // Друзей в приложении пока нет — выбор запоминается только на экране
              <Text style={[type.footnote, { color: colors.muted }]}>Друзья скоро появятся. Пока пост увидят все</Text>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, textAlign: 'center' },
  scroll: { flexGrow: 1 },
  compose: { flexDirection: 'row', gap: 12, paddingTop: 16, paddingBottom: 16 },
  body: { flex: 1, gap: 6 },
  input: { minHeight: 64, paddingVertical: 0, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end' },
  photos: { gap: 10, paddingTop: 8, paddingRight: 8 },
  photo: { width: 120, height: 150, borderRadius: radius.field, borderCurve: 'continuous' },
  remove: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingTop: 8, marginLeft: -2 },
  audience: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingBottom: 12, gap: 8 },
  audienceLabel: { fontWeight: '600', marginLeft: 4 },
});
