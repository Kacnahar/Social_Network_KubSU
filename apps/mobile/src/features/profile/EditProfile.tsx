import { ROLE_LABEL, PROFILE_NAME_MAX, updateProfileRequestSchema, type Profile } from '@app/shared';
import { useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, checkUsername, updateProfile } from '../../lib/api';
import { useSession, useSignedIn } from '../../lib/session';
import { Avatar } from '../../ui/Avatar';
import { Popover, PopoverItem, useAnchor, type Rect } from '../../ui/Popover';
import { noOutline } from '../../ui/components';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { CakeIcon, CameraIcon, CheckIcon, ChevronRightIcon, CloseIcon, GalleryIcon, OnlineIcon, PeopleIcon } from '../../ui/icons';
import { CollapseRow } from '../../ui/CollapseRow';
import { IOSSwitch } from '../../ui/IOSSwitch';
import { RoleIcon } from '../auth/RoleIcon';
import { useAvatarPhoto } from './useAvatarPhoto';
import { BirthPicker } from './BirthPicker';
import { birthLine, formatDate } from './birth';
import { checkNickname, NICK_MAX, NICK_RULES, normalizeNickname } from '../../ui/nickname';
import { useNickname } from '../../ui/nicknameStore';
import { joinName, splitName } from '../../ui/plural';
import { RoleBadge } from '../../ui/RoleBadge';
import { SearchField } from '../../ui/SearchField';
import { type, useColors, useReduceMotion } from '../../ui/theme';
import { showToast } from '../../ui/toastStore';
import { filterFaculties, shortFaculty } from './faculties';
import { detectService, MAX_LINKS, normalizeLink } from './links';
import { ServiceLogo } from './ServiceLogo';
import { DEFAULT_EXTRAS, type ProfileExtras } from './profileExtras';
import { useExtras } from './profileExtrasStore';
import { toIsoDate } from './isoDate';
import { rememberProfile } from './profileCache';

const ABOUT_MAX = 150;
const COURSES = ['1', '2', '3', '4', '5'] as const;

type Props = { initial: Profile; onSaved: (profile: Profile) => void; onClose: () => void };
type NickState = 'idle' | 'checking' | 'ok' | 'bad';

// Экран «Редактировать профиль»: шапка «Отмена / заголовок / Готово», живое превью, поля группами
export function EditProfile({ initial, onSaved, onClose }: Props) {
  const colors = useColors();
  const { token, account } = useSignedIn();
  const { forgetSession } = useSession();
  const isStudent = account.role === 'student';
  const savedNick = useNickname(initial.profileId);
  const savedExtras = useExtras(initial.profileId);
  // Начальные значения запоминаем один раз: «изменено» — это отличие от них
  const start = useRef({ nick: savedNick ?? '', extras: savedExtras }).current;

  const [firstName, setFirstName] = useState(() => splitName(initial.displayName).firstName);
  const [lastName, setLastName] = useState(() => splitName(initial.displayName).lastName);
  const [nick, setNick] = useState(start.nick);
  const [faculty, setFaculty] = useState(initial.faculty ?? '');
  const [course, setCourse] = useState(initial.course ? String(initial.course) : '');
  const [about, setAbout] = useState(initial.about ?? '');
  const [extras, setExtrasState] = useState<ProfileExtras>(start.extras ?? DEFAULT_EXTRAS);
  // undefined — фото не трогали; null — убрать; строка — загруженное
  // Выбор, обрезка и загрузка фото — общий код (useAvatarPhoto); здесь результат сохранится по «Готово»
  const photo = useAvatarPhoto();
  const { mediaId: avatarMediaId, localUri, uploading, error: photoError } = photo;

  // Всплывающие меню открываются от своих кнопок: у каждого запоминается место кнопки на экране
  const photoAnchor = useAnchor();
  const facultyAnchor = useAnchor();
  const birthAnchor = useAnchor();
  const [photoAt, setPhotoAt] = useState<Rect | null>(null);
  const [facultyAt, setFacultyAt] = useState<Rect | null>(null);
  const [birthAt, setBirthAt] = useState<Rect | null>(null);
  const [facultyQuery, setFacultyQuery] = useState('');
  const { height: screenH } = useWindowDimensions();
  // Для перехода к полям из строк «что видно»: прокрутка и положение групп на экране
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const groupY = useRef({ personal: 0, study: 0 }).current;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // У строк ссылок свои постоянные номера: так при удалении строки соседние не «наследуют» её состояние
  const nextLinkKey = useRef(extras.links.length);
  const [linkKeys, setLinkKeys] = useState<number[]>(() => extras.links.map((_, index) => index));
  // Новая строка сразу получает курсор: можно печатать, не нажимая на поле
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const addLink = () => {
    const key = nextLinkKey.current++;
    setFocusKey(key);
    setLinkKeys((keys) => [...keys, key]);
    setExtrasState((current) => ({ ...current, links: [...current.links, ''] }));
  };
  const removeLink = (index: number) => {
    setLinkKeys((keys) => keys.filter((_, i) => i !== index));
    setExtrasState((current) => ({ ...current, links: current.links.filter((_, i) => i !== index) }));
  };

  const setExtra = <K extends keyof ProfileExtras>(key: K, value: ProfileExtras[K]) => setExtrasState((current) => ({ ...current, [key]: value }));

  // Проверка никнейма: неверная запись — сразу; верная — «проверяем» и спрашиваем сервер, свободен ли он
  const nickCheck = nick === '' ? null : checkNickname(nick);
  const nickSyntaxBad = nickCheck !== null && !nickCheck.ok;
  const [nickState, setNickState] = useState<NickState>(nick === '' ? 'idle' : 'ok');
  // Никнейм, про который сервер ответил «занят»
  const [takenNick, setTakenNick] = useState<string | null>(null);
  useEffect(() => {
    if (nick === '') return setNickState('idle');
    if (nickSyntaxBad) return setNickState('bad');
    if (nick === start.nick) return setNickState('ok');
    setNickState('checking');
    let cancelled = false;
    const timer = setTimeout(() => {
      checkUsername(token, nick)
        .then((available) => {
          if (cancelled) return;
          setTakenNick(available ? null : nick);
          setNickState(available ? 'ok' : 'bad');
        })
        // Нет связи — не мешаем: занятый никнейм сервер всё равно не сохранит
        .catch(() => !cancelled && setNickState('ok'));
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nick, nickSyntaxBad, start.nick, token]);
  const nickTaken = takenNick !== null && takenNick === nick;
  const nickError = nickState === 'checking' ? null : nickCheck && !nickCheck.ok ? nickCheck.reason : nickTaken ? 'Этот никнейм занят' : null;

  const linkErrors = extras.links.map((link) => (link.trim() !== '' && normalizeLink(link) === null ? 'Это не похоже на адрес' : null));
  const nameError = submitted && firstName.trim() === '' ? 'Введите имя' : null;
  const lastNameError = submitted && lastName.trim() === '' ? 'Введите фамилию' : null;
  const aboutError = about.length > ABOUT_MAX ? `Не больше ${ABOUT_MAX} знаков` : null;

  const snapshot = (value: unknown) => JSON.stringify(value);
  const initialSnap = useRef(
    snapshot({
      f: splitName(initial.displayName).firstName,
      l: splitName(initial.displayName).lastName,
      n: start.nick,
      fa: initial.faculty ?? '',
      c: initial.course ? String(initial.course) : '',
      a: initial.about ?? '',
      e: start.extras ?? DEFAULT_EXTRAS,
      p: undefined,
    }),
  ).current;
  const dirty = snapshot({ f: firstName, l: lastName, n: nick, fa: faculty, c: course, a: about, e: extras, p: avatarMediaId }) !== initialSnap;

  const displayName = joinName(firstName, lastName);
  const hasPhoto = avatarMediaId === undefined ? Boolean(initial.avatarUrl) : avatarMediaId !== null;
  const shownRemoteUrl = avatarMediaId === undefined ? initial.avatarUrl : null;

  // Новая аватарка появляется плавно
  const avatarFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!localUri) return;
    avatarFade.setValue(0);
    Animated.timing(avatarFade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [localUri, avatarFade]);

  const cancel = () => (dirty ? setConfirmCancel(true) : onClose());

  const submit = async () => {
    setSubmitted(true);
    setError(null);
    const links = extras.links.map((link) => link.trim()).filter(Boolean);
    if (firstName.trim() === '' || lastName.trim() === '' || (nickCheck && !nickCheck.ok) || nickTaken || nickState === 'checking' || aboutError || linkErrors.some(Boolean)) {
      setError('Проверьте выделенные поля');
      return;
    }
    const privacy = { showFaculty: extras.showFaculty, showBirth: extras.showBirth, showFriends: extras.showFriends, showOnline: extras.showOnline };
    const parsed = updateProfileRequestSchema.safeParse({
      displayName,
      faculty,
      about,
      ...(isStudent ? { course: course === '' ? null : Number(course) } : {}),
      ...(avatarMediaId === undefined ? {} : { avatarMediaId }),
      // Никнейм, ссылки, дата рождения и «что видно в профиле» хранятся на сервере
      username: nickCheck?.ok ? nickCheck.value : null,
      links: links.map((link) => normalizeLink(link) ?? link),
      birthDate: extras.birth ? toIsoDate(extras.birth) : null,
      privacy,
      ...(account.role === 'teacher' ? { department: extras.chair } : {}),
    });
    if (!parsed.success) {
      setError('Проверьте выделенные поля');
      return;
    }
    setSaving(true);
    try {
      const saved = await updateProfile(token, parsed.data);
      rememberProfile(saved, privacy);
      showToast('Сохранено');
      onSaved(saved);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'unauthorized') return void (await forgetSession());
      if (caught instanceof ApiError && caught.code === 'username_taken') setTakenNick(nick);
      setError(caught instanceof Error ? caught.message : 'Что-то пошло не так');
      setSaving(false);
    }
  };

  const canDone = dirty && !saving && !uploading;

  // Подписи в «Что видно в профиле» — настоящие данные с экрана, обновляются сразу, без сохранения
  const missingFaculty = faculty === '';
  const missingCourse = isStudent && course === '';
  const facultyNote = [missingFaculty ? 'Факультет не выбран' : shortFaculty(faculty), isStudent ? (missingCourse ? 'Курс не выбран' : `${course} курс`) : null].filter(Boolean).join(' · ');
  const birthNote = extras.birth ? birthLine(extras.birth, new Date()) : 'Дата рождения не указана';
  const goTo = (y: number, then: () => void) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    setTimeout(then, 380);
  };
  const toFaculty = () => goTo(groupY.study, () => { setFacultyQuery(''); facultyAnchor.measure(setFacultyAt); });
  const toBirth = () => goTo(groupY.personal, () => birthAnchor.measure(setBirthAt));
  const meta = [faculty ? shortFaculty(faculty) : '', isStudent && course ? `${course} курс` : ''].filter(Boolean).join(' · ');

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Отмена" hitSlop={10} onPress={cancel} style={styles.headerSide}>
            <Text style={[type.body, { color: colors.muted }]}>Отмена</Text>
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[type.headline, styles.headerTitle, { color: colors.text }]}>
            Редактировать профиль
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Готово"
            accessibilityState={{ disabled: !canDone }}
            disabled={!canDone}
            hitSlop={10}
            onPress={() => void submit()}
            style={[styles.headerSide, styles.headerRight]}
          >
            {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={[type.body, styles.done, { color: colors.primary, opacity: canDone ? 1 : 0.35 }]}>Готово</Text>}
          </Pressable>
        </View>

        {/* Клавиатура: экран сам поднимает поле выше клавиатуры (iOS — automaticallyAdjustKeyboardInsets, Android — системное сжатие окна).
            Нажатие мимо полей закрывает клавиатуру само («handled»), отдельной обёртки с Keyboard.dismiss нет:
            она могла сразу закрывать клавиатуру после нажатия на поле */}
        <View style={styles.fill}>
          <ScrollView
            ref={scrollRef}
            style={styles.fill}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.column}>
              {/* Аватар и ссылка «Изменить фото» */}
              <View style={styles.photo}>
                <Animated.View style={{ opacity: avatarFade }}>
                  <Avatar avatarUrl={shownRemoteUrl} localUri={localUri} name={displayName || ' '} size={96} busy={uploading} />
                </Animated.View>
                <Pressable ref={photoAnchor.ref} accessibilityRole="button" accessibilityLabel="Изменить фото" hitSlop={8} onPress={() => photoAnchor.measure(setPhotoAt)}>
                  <Text style={[type.subhead, styles.photoLink, { color: colors.text }]}>{hasPhoto ? 'Изменить фото' : 'Добавить фото'}</Text>
                </Pressable>
                {photoError ? <ErrorLine>{photoError}</ErrorLine> : null}
              </View>

              {/* Живое превью: меняется сразу, пока печатаете */}
              <View accessibilityLabel="Так вас увидят в профиле" style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.previewTop}>
                  <Avatar avatarUrl={shownRemoteUrl} localUri={localUri} name={displayName || ' '} size={44} />
                  <View style={styles.previewText}>
                    <FadeText numberOfLines={1} style={[type.headline, { color: displayName ? colors.text : colors.muted }]} text={displayName || 'Имя Фамилия'} />
                    <FadeText numberOfLines={1} style={[type.footnote, { color: colors.muted }]} text={nick ? `@${nick}` : '@никнейм'} />
                  </View>
                </View>
                <View style={styles.previewMeta}>
                  <RoleBadge role={account.role} />
                  {meta ? (
                    <FadeText
                      numberOfLines={1}
                      style={[type.footnote, styles.previewFaculty, { color: colors.muted, opacity: extras.showFaculty ? 1 : 0.4 }]}
                      text={`· ${meta}`}
                    />
                  ) : null}
                </View>
                {extras.birth ? (
                  <View style={[styles.previewBirth, { opacity: extras.showBirth ? 1 : 0.4 }]}>
                    <CakeIcon color={colors.muted} />
                    <FadeText numberOfLines={1} style={[type.footnote, { color: colors.muted }]} text={birthLine(extras.birth, new Date())} />
                  </View>
                ) : null}
                {about ? <FadeText numberOfLines={3} style={[type.subhead, { color: colors.text }]} text={about} /> : null}
                {extras.links.some((link) => link.trim()) ? (
                  <View style={styles.previewLinks}>
                    {extras.links.filter((link) => link.trim()).map((link, index) => (
                      <ServiceLogo key={index} service={detectService(link)} />
                    ))}
                  </View>
                ) : null}
              </View>

              <View onLayout={(event) => (groupY.personal = event.nativeEvent.layout.y)}>
              <Group title="Личные данные">
                <Row label="Имя" error={nameError}>
                  <TextInput accessibilityLabel="Имя" autoCorrect={false} spellCheck={false} value={firstName} onChangeText={setFirstName} maxLength={PROFILE_NAME_MAX} autoCapitalize="words" autoComplete="given-name" placeholder="Обязательно" placeholderTextColor={colors.muted} style={[type.body, styles.input, noOutline, { color: colors.text }]} />
                </Row>
                <Row label="Фамилия" error={lastNameError}>
                  <TextInput accessibilityLabel="Фамилия" autoCorrect={false} spellCheck={false} value={lastName} onChangeText={setLastName} maxLength={PROFILE_NAME_MAX} autoCapitalize="words" autoComplete="family-name" placeholder="Обязательно" placeholderTextColor={colors.muted} style={[type.body, styles.input, noOutline, { color: colors.text }]} />
                </Row>
                <Row label="Никнейм" error={nickError}>
                  <View style={styles.nickWrap}>
                    <Text style={[type.body, { color: colors.muted }]}>@</Text>
                    <TextInput
                      accessibilityLabel="Никнейм"
                      autoCorrect={false}
                      spellCheck={false}
                      autoComplete="off"
                      value={nick}
                      onChangeText={(text) => setNick(normalizeNickname(text).slice(0, NICK_MAX))}
                      maxLength={NICK_MAX + 1}
                      autoCapitalize="none"
                      placeholder="ivan.petrov"
                      placeholderTextColor={colors.muted}
                      style={[type.body, styles.input, noOutline, { color: colors.text }]}
                    />
                    <NickStatus state={nickState} />
                  </View>
                </Row>
                <Pressable
                  ref={birthAnchor.ref}
                  accessibilityRole="button"
                  accessibilityLabel={extras.birth ? `Дата рождения: ${formatDate(extras.birth)}` : 'Дата рождения: не выбрана'}
                  onPress={() => birthAnchor.measure(setBirthAt)}
                  style={styles.row}
                >
                  <Text style={[type.body, styles.birthLabel, { color: colors.muted }]}>Дата рождения</Text>
                  <Text style={[type.body, styles.faculty, { color: extras.birth ? colors.text : colors.muted }]}>{extras.birth ? formatDate(extras.birth) : 'Выбрать'}</Text>
                  <ChevronRightIcon color={colors.muted} />
                </Pressable>
              </Group>
              </View>
              <Hint>{NICK_RULES}</Hint>

              <View onLayout={(event) => (groupY.study = event.nativeEvent.layout.y)}>
              <Group title="Учёба">
                <Pressable ref={facultyAnchor.ref} accessibilityRole="button" accessibilityLabel={`Факультет: ${faculty || 'не выбран'}`} onPress={() => { setFacultyQuery(''); facultyAnchor.measure(setFacultyAt); }} style={[styles.row, styles.rowBorder, { borderBottomColor: colors.border }]}>
                  <Text style={[type.body, styles.label, { color: colors.muted }]}>Факультет</Text>
                  <Text numberOfLines={3} style={[type.body, styles.faculty, { color: faculty ? colors.text : colors.muted }]}>{faculty ? shortFaculty(faculty) : 'Выбрать'}</Text>
                  <ChevronRightIcon color={colors.muted} />
                </Pressable>
                {isStudent ? (
                  <View style={styles.courseRow}>
                    <Text style={[type.body, { color: colors.muted }]}>Курс</Text>
                    <View accessibilityRole="radiogroup" style={styles.segments}>
                      {COURSES.map((value) => {
                        const selected = course === value;
                        return (
                          <Pressable
                            key={value}
                            accessibilityRole="radio"
                            accessibilityLabel={`${value} курс`}
                            accessibilityState={{ selected, checked: selected }}
                            onPress={() => setCourse(selected ? '' : value)}
                            style={[styles.segment, { backgroundColor: selected ? colors.primary : colors.fill }]}
                          >
                            <Text style={[type.subhead, styles.segmentText, { color: selected ? colors.onPrimary : colors.text }]}>{value}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <Row label="Кафедра" last>
                    <TextInput accessibilityLabel="Кафедра" value={extras.chair} onChangeText={(text) => setExtra('chair', text.slice(0, 100))} placeholder="Например, кафедра алгебры" placeholderTextColor={colors.muted} style={[type.body, styles.input, noOutline, { color: colors.text }]} />
                  </Row>
                )}
              </Group>
              </View>

              <Group title="О себе">
                <View style={styles.aboutBox}>
                  <TextInput
                    accessibilityLabel="О себе"
                    value={about}
                    onChangeText={setAbout}
                    maxLength={ABOUT_MAX}
                    multiline
                    placeholder="Расскажите коротко о себе"
                    placeholderTextColor={colors.muted}
                    textAlignVertical="top"
                    style={[type.body, styles.aboutInput, noOutline, { color: colors.text }]}
                  />
                  <Text style={[type.footnote, styles.counter, { color: aboutError ? colors.danger : colors.muted }]}>{about.length}/{ABOUT_MAX}</Text>
                </View>
                {aboutError ? <View style={styles.errorPad}><ErrorLine>{aboutError}</ErrorLine></View> : null}
              </Group>

              <Group title="Ссылки">
                {extras.links.map((link, index) => (
                  <CollapseRow key={linkKeys[index] ?? index} onRemove={() => removeLink(index)}>
                    {(remove) => (
                      <>
                        <View style={[styles.linkRow, { borderBottomColor: colors.border }]}>
                          <ServiceLogo service={detectService(link)} />
                          <TextInput
                            accessibilityLabel={`Ссылка ${index + 1}`}
                            autoFocus={focusKey !== null && linkKeys[index] === focusKey}
                            value={link}
                            onChangeText={(text) => setExtra('links', extras.links.map((item, i) => (i === index ? text : item)))}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            spellCheck={false}
                            keyboardType="url"
                            inputMode="url"
                            textContentType="URL"
                            placeholder="t.me/ник, github.com/ник или сайт"
                            placeholderTextColor={colors.muted}
                            style={[type.body, styles.input, noOutline, { color: colors.text }]}
                          />
                          <Pressable accessibilityRole="button" accessibilityLabel={`Удалить ссылку ${index + 1}`} hitSlop={10} onPress={remove} style={({ pressed }) => [styles.removeLink, { opacity: pressed ? 0.5 : 1 }]}>
                            <View style={[styles.removeCircle, { borderColor: colors.muted }]}>
                              <CloseIcon color={colors.muted} size={9} />
                            </View>
                          </Pressable>
                        </View>
                        {linkErrors[index] ? <View style={styles.errorPad}><ErrorLine>{linkErrors[index]}</ErrorLine></View> : null}
                      </>
                    )}
                  </CollapseRow>
                ))}
                {extras.links.length < MAX_LINKS ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Добавить ссылку" onPress={addLink} style={styles.addLink}>
                    <Text style={[type.subhead, { color: colors.text }]}>+ Добавить ссылку</Text>
                  </Pressable>
                ) : null}
              </Group>

              <Group title="Что видно в профиле">
                <ToggleRow icon={<RoleIcon role="student" color={colors.text} />} iconScale={0.72} title="Показывать факультет и курс" note={facultyNote} onNotePress={missingFaculty || missingCourse ? toFaculty : undefined} value={extras.showFaculty} onChange={(v) => setExtra('showFaculty', v)} />
                <ToggleRow icon={<CakeIcon color={colors.text} />} title="Показывать дату рождения" note={birthNote} onNotePress={extras.birth ? undefined : toBirth} value={extras.showBirth} onChange={(v) => setExtra('showBirth', v)} />
                <ToggleRow icon={<PeopleIcon color={colors.text} />} title="Показывать список друзей" note="Кто у вас в друзьях" value={extras.showFriends} onChange={(v) => setExtra('showFriends', v)} />
                <ToggleRow icon={<OnlineIcon color={colors.text} />} title="Показывать, когда я в сети" note="Отметка «в сети» рядом с именем" value={extras.showOnline} onChange={(v) => setExtra('showOnline', v)} last />
              </Group>
              <Hint>Скрытое видите только вы</Hint>

              {error ? <View style={styles.errorPad}><ErrorLine>{error}</ErrorLine></View> : null}
              <Text style={[type.footnote, styles.role, { color: colors.muted }]}>Роль: {ROLE_LABEL[account.role].toLowerCase()}. Изменить её нельзя</Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>

      <Popover visible={photoAt !== null} anchor={photoAt} onClose={() => setPhotoAt(null)}>
        <PopoverItem first title={hasPhoto ? 'Выбрать другое фото' : 'Выбрать фото'} icon={<GalleryIcon color={colors.textPrimary} />} onPress={() => { setPhotoAt(null); void photo.pick('library'); }} />
        <PopoverItem title="Сделать снимок" icon={<CameraIcon color={colors.textPrimary} />} onPress={() => { setPhotoAt(null); void photo.pick('camera'); }} />
        {hasPhoto ? (
          <PopoverItem
            title="Убрать фото"
            icon={<CloseIcon color={colors.textPrimary} size={14} />}
            onPress={() => {
              setPhotoAt(null);
              photo.remove();
            }}
          />
        ) : null}
      </Popover>

      <BirthPicker
        visible={birthAt !== null}
        anchor={birthAt}
        value={extras.birth}
        onClose={() => setBirthAt(null)}
        onDone={(value) => {
          setExtra('birth', value);
          setBirthAt(null);
        }}
      />

      <Popover visible={facultyAt !== null} anchor={facultyAt} size="large" onClose={() => setFacultyAt(null)}>
        <View style={styles.facultySearch}>
          <SearchField value={facultyQuery} onChangeText={setFacultyQuery} placeholder="Поиск" />
        </View>
        <ScrollView style={{ maxHeight: Math.round(screenH * 0.6) - 70 }} keyboardShouldPersistTaps="handled">
          {filterFaculties(facultyQuery).map(({ name, short }) => (
            <Pressable
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ selected: faculty === name, checked: faculty === name }}
              onPress={() => {
                setFaculty(name);
                setFacultyAt(null);
              }}
              style={({ pressed }) => [styles.facultyItem, { borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={styles.facultyName}>
                <Text style={[type.subhead, { color: colors.textPrimary }]}>{name}</Text>
                {short ? <Text style={[type.footnote, { color: colors.muted }]}>{short}</Text> : null}
              </View>
              {faculty === name ? <CheckIcon color={colors.textPrimary} /> : null}
            </Pressable>
          ))}
          {filterFaculties(facultyQuery).length === 0 ? <Text style={[type.body, styles.noResults, { color: colors.muted }]}>Ничего не нашли</Text> : null}
        </ScrollView>
      </Popover>

      {photo.cropper}

      <ConfirmDialog visible={confirmCancel} title="Отменить изменения?" message="Всё, что вы изменили, пропадёт" confirmTitle="Да, отменить" cancelTitle="Продолжить" danger onConfirm={onClose} onCancel={() => setConfirmCancel(false)} />
    </View>
  );
}

// ——— Мелкие части экрана ———

function Group({ title, children }: { title: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.group}>
      <Text style={[type.footnote, styles.groupTitle, { color: colors.muted }]}>{title}</Text>
      <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

function Hint({ children }: { children: string }) {
  const colors = useColors();
  return <Text style={[type.footnote, styles.hint, { color: colors.muted }]}>{children}</Text>;
}

function ErrorLine({ children }: { children: ReactNode }) {
  const colors = useColors();
  return (
    <Text accessibilityRole="alert" style={[type.footnote, { color: colors.danger }]}>
      {children}
    </Text>
  );
}

// Строка «подпись слева — поле справа»; ошибка тихим красным текстом под полем
function Row({ label, error, last = false, children }: { label: string; error?: string | null; last?: boolean; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={!last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }}>
      <View style={styles.row}>
        <Text style={[type.body, styles.label, { color: colors.muted }]}>{label}</Text>
        <View style={styles.rowField}>{children}</View>
      </View>
      {error ? <View style={styles.errorPad}><ErrorLine>{error}</ErrorLine></View> : null}
    </View>
  );
}

function ToggleRow({ icon, iconScale = 1, title, note, onNotePress, value, onChange, last = false }: { icon: ReactNode; iconScale?: number; title: string; note: string; onNotePress?: () => void; value: boolean; onChange: (value: boolean) => void; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.toggle, !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.toggleIcon}>
        <View style={{ transform: [{ scale: iconScale }] }}>{icon}</View>
      </View>
      <View style={styles.toggleText}>
        <Text style={[type.body, { color: colors.text }]}>{title}</Text>
        {onNotePress ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${note}. Перейти к полю`} hitSlop={6} onPress={onNotePress}>
            <Text numberOfLines={2} style={[type.footnote, { color: colors.textSecondary }]}>{note}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={2} style={[type.footnote, { color: colors.textSecondary }]}>{note}</Text>
        )}
      </View>
      <IOSSwitch accessibilityLabel={title} value={value} onValueChange={onChange} />
    </View>
  );
}

// Текст, который при смене коротко «вспыхивает» — превью меняется плавно, а не рывком
function FadeText({ text, style, numberOfLines }: { text: string; style: object; numberOfLines?: number }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduceMotion) {
      first.current = false;
      return;
    }
    opacity.setValue(0.45);
    Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [text, opacity, reduceMotion]);
  return (
    <Animated.Text numberOfLines={numberOfLines} style={[style, { opacity: Animated.multiply(opacity, (style as { opacity?: number }).opacity ?? 1) }]}>
      {text}
    </Animated.Text>
  );
}

// Значок справа в поле никнейма: проверка, свободен (галочка с мягким «пружинящим» появлением), занят
function NickStatus({ state }: { state: NickState }) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(state === 'ok' ? 1 : 0.6)).current;
  useEffect(() => {
    if (state !== 'ok' && state !== 'bad') return;
    if (reduceMotion) return scale.setValue(1);
    scale.setValue(0.6);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.15, duration: 110, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale, { toValue: 1, duration: 90, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [state, scale, reduceMotion]);
  return (
    <View style={styles.status} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {state === 'checking' ? <ActivityIndicator size="small" color={colors.muted} /> : null}
      {state === 'ok' ? <Animated.View style={{ transform: [{ scale }] }}><CheckIcon color={colors.success} /></Animated.View> : null}
      {state === 'bad' ? <Animated.View style={{ transform: [{ scale }] }}><CloseIcon color={colors.danger} size={13} /></Animated.View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16 },
  headerSide: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center' },
  done: { fontWeight: '700' },
  scroll: { paddingBottom: 48 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingHorizontal: 16, gap: 6 },
  photo: { alignItems: 'center', gap: 10, paddingTop: 8, paddingBottom: 12 },
  photoLink: { fontWeight: '600' },
  preview: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewText: { flex: 1, gap: 1 },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewFaculty: { flexShrink: 1 },
  previewLinks: { flexDirection: 'row', gap: 8 },
  group: { marginTop: 14 },
  groupTitle: { textTransform: 'uppercase', letterSpacing: 0.6, paddingLeft: 4, paddingBottom: 6 },
  block: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hint: { paddingLeft: 4, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 14, gap: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  label: { width: 112, flexShrink: 1 },
  birthLabel: { width: 130, flexShrink: 0 },
  rowField: { flex: 1 },
  input: { flex: 1, minHeight: 44, paddingVertical: 8 },
  nickWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  status: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  faculty: { flex: 1, textAlign: 'right', paddingVertical: 10 },
  courseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 56, paddingHorizontal: 14 },
  segments: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'flex-end' },
  segment: { flex: 1, maxWidth: 48, height: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontWeight: '600' },
  aboutBox: { padding: 14, paddingBottom: 8 },
  aboutInput: { minHeight: 84, padding: 0 },
  counter: { alignSelf: 'flex-end', paddingTop: 4 },
  errorPad: { paddingHorizontal: 14, paddingBottom: 8 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth },
  addLink: { minHeight: 46, paddingHorizontal: 14, justifyContent: 'center' },
  removeLink: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  removeCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.4, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, paddingHorizontal: 14, paddingVertical: 8 },
  toggleIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  toggleText: { flex: 1, gap: 1 },
  previewBirth: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: -4 },
  role: { textAlign: 'center', paddingTop: 18 },
  facultySearch: { padding: 8 },
  facultyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingVertical: 8, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth },
  facultyName: { flex: 1, gap: 1 },
  noResults: { textAlign: 'center', paddingVertical: 28 },
});
