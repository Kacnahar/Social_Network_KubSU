import { POST_PHOTOS_MAX, can } from '@app/shared';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GifPicker, GifPreview } from '../features/gif/GifPicker';
import { toServerGif, type Gif } from '../features/gif/gifs';
import { createPost } from '../features/posts/api';
import { uploadMedia } from '../lib/api';
import { pausedBodyText } from '../lib/banText';
import { checkPhoto, readPhoto } from '../lib/photo';
import { useSignedIn } from '../lib/session';
import { useFail } from '../lib/useFail';
import { Avatar } from '../ui/Avatar';
import { Body, Button, ErrorText, Screen, Title, noOutline } from '../ui/components';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CameraIcon, CloseIcon, GalleryIcon, GifIcon, PollIcon } from '../ui/icons';
import { showToast } from '../ui/toastStore';
import { radius, type, useColors, useReduceMotion } from '../ui/theme';

// Свой предел короче серверного: пост — короткая заметка. Счётчик появляется ближе к пределу
const TEXT_MAX = 500;
const COUNTER_FROM = 400;
const INPUT_MIN = 64;
const COMPOSE_PADDING = 32; // отступы сверху и снизу вокруг аватара и поля
const BODY_GAP = 6;

type Picked = { key: number; uri: string; blob: Blob };

// Новый пост: выезжает снизу. Сверху «Отмена», заголовок и «Опубликовать»; ниже аватар и поле без рамок
export default function ComposeScreen() {
  const router = useRouter();
  const colors = useColors();
  const fail = useFail();
  const reduceMotion = useReduceMotion();
  const { token, account, profile } = useSignedIn();
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [gif, setGif] = useState<Gif | null>(null);
  const [pickingGif, setPickingGif] = useState(false);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Высота поля текста: растёт вместе с текстом, пока панель вложений не дойдёт до низа, потом текст прокручивается внутри
  const [areaH, setAreaH] = useState(0);
  const [topH, setTopH] = useState(0);
  const [bottomH, setBottomH] = useState(0);
  const [textH, setTextH] = useState(INPUT_MIN);
  const inputH = useRef(new Animated.Value(INPUT_MIN)).current;
  const placed = useRef(false);
  const nextKey = useRef(0);
  // Уже загруженные фото: при повторной попытке после ошибки заново их не отправляем
  const uploaded = useRef(new Map<number, string>());

  const maxH = Math.max(INPUT_MIN, areaH - COMPOSE_PADDING - topH - bottomH - BODY_GAP * 2);
  const targetH = areaH > 0 ? Math.max(INPUT_MIN, Math.min(textH, maxH)) : INPUT_MIN;
  const overflowing = textH > maxH;
  useEffect(() => {
    if (!placed.current) {
      placed.current = true;
      inputH.setValue(targetH);
      return;
    }
    if (reduceMotion) {
      inputH.setValue(targetH);
      return;
    }
    Animated.timing(inputH, { toValue: targetH, duration: 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [targetH, inputH, reduceMotion]);

  // Гость публиковать не может: по прямому адресу возвращаем в ленту
  if (!can(account.role, 'publish')) return <Redirect href="/" />;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const empty = text.trim() === '' && photos.length === 0 && !gif;
  const busy = picking || publishing;
  // GIF и фото вместе не берём: либо один GIF, либо до нескольких фото
  const room = gif ? 0 : POST_PHOTOS_MAX - photos.length;

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
    // Тестовую плитку (на сервере нет ключа gifs.ru) отправить нельзя — об этом честно говорим
    const attached = toServerGif(gif);
    if (gif && !attached) {
      showToast('Тестовый GIF не отправляется: на сервере нет ключа gifs.ru');
      if (text.trim() === '' && photos.length === 0) return;
    }
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
      await createPost(token, { text: text.trim(), photoMediaIds: ids, gif: attached });
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
            <Pressable accessibilityRole="button" accessibilityLabel="Отмена" hitSlop={10} disabled={publishing} onPress={cancel} style={({ pressed }) => [styles.barButton, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[type.headline, { color: colors.text }]}>Отмена</Text>
            </Pressable>
            {/* Заголовок занимает всё место между «Отмена» и кнопкой: на узком экране равные поля по бокам не помещаются */}
            <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.title, { color: colors.text }]}>
              Новый пост
            </Text>
            {/* «Опубликовать» — просто текст без фона; пока пост пустой, бледный и не нажимается */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Опубликовать"
              hitSlop={10}
              disabled={empty || picking || publishing}
              onPress={() => void publish()}
              style={({ pressed }) => [styles.barButton, { opacity: empty || picking ? 0.35 : publishing ? 0.5 : pressed ? 0.4 : 1 }]}
            >
              <Text style={[type.headline, { color: colors.textPrimary }]}>{publishing ? 'Отправляем…' : 'Опубликовать'}</Text>
            </Pressable>
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

          <ScrollView style={styles.fill} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onLayout={(event) => setAreaH(event.nativeEvent.layout.height)}>
            <View style={[styles.column, styles.compose]}>
              <Avatar avatarUrl={profile?.avatarUrl ?? null} name={profile?.displayName ?? ''} size={40} />
              <View style={styles.body}>
                <View onLayout={(event) => setTopH(event.nativeEvent.layout.height)}>
                  <Text numberOfLines={1} style={[type.headline, { color: colors.text }]}>
                    {profile?.displayName}
                  </Text>
                </View>
                <Animated.View style={{ height: inputH, overflow: 'hidden' }}>
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
                    scrollEnabled={overflowing}
                    editable={!publishing}
                    style={[type.body, styles.input, noOutline, { color: colors.text }]}
                  />
                  {/* Невидимая копия текста: по её высоте узнаём, сколько места нужно тексту (так надёжно и на телефоне, и в браузере) */}
                  <Text
                    pointerEvents="none"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                    onLayout={(event) => setTextH(Math.ceil(event.nativeEvent.layout.height))}
                    style={[type.body, styles.mirror]}
                  >
                    {`${text}\u200b`}
                  </Text>
                </Animated.View>
                <View onLayout={(event) => setBottomH(event.nativeEvent.layout.height)} style={styles.bottom}>
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
                          hitSlop={11}
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

                {gif ? (
                  <View style={styles.gifBox}>
                    <GifPreview gif={gif} width={180} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Убрать GIF"
                      hitSlop={11}
                      disabled={publishing}
                      onPress={() => setGif(null)}
                      style={[styles.remove, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
                    >
                      <CloseIcon color={colors.text} />
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.tools}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Фото из галереи"
                    hitSlop={11}
                    disabled={busy || room <= 0}
                    onPress={() => void pickFromGallery()}
                    style={({ pressed }) => [styles.tool, { opacity: busy || room <= 0 ? 0.35 : pressed ? 0.6 : 1 }]}
                  >
                    <GalleryIcon color={colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Снять на камеру"
                    hitSlop={11}
                    disabled={busy || room <= 0}
                    onPress={() => void takePhoto()}
                    style={({ pressed }) => [styles.tool, { opacity: busy || room <= 0 ? 0.35 : pressed ? 0.6 : 1 }]}
                  >
                    <CameraIcon color={colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="GIF"
                    hitSlop={11}
                    disabled={busy || photos.length > 0}
                    onPress={() => setPickingGif(true)}
                    style={({ pressed }) => [styles.tool, { opacity: busy || photos.length > 0 ? 0.35 : pressed ? 0.6 : 1 }]}
                  >
                    <GifIcon color={colors.muted} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Опрос"
                    hitSlop={11}
                    disabled={busy}
                    onPress={() => showToast('Опросы скоро появятся')}
                    style={({ pressed }) => [styles.tool, { opacity: busy ? 0.35 : pressed ? 0.6 : 1 }]}
                  >
                    <PollIcon color={colors.muted} />
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
            </View>
          </ScrollView>

          <GifPicker visible={pickingGif} onClose={() => setPickingGif(false)} onPick={(picked) => { setGif(picked); setPickingGif(false); }} />
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
  input: { flex: 1, paddingVertical: 0, textAlignVertical: 'top' },
  mirror: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  bottom: { gap: 6 },
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
  tool: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  barButton: { minHeight: 44, justifyContent: 'center' },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingTop: 0, marginLeft: -10 },
  gifBox: { alignSelf: 'flex-start', paddingTop: 8 },
});
