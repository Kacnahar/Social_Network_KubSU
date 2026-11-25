import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FriendRow } from '../features/friends/FriendRow';
import { DEFAULT_SORT, SORT_OPTIONS, sortPeople, type SortMode } from '../features/friends/sort';
import { Suggestions } from '../features/friends/Suggestions';
import { TEST_FRIENDS, TEST_REQUESTS, testSuggestions, type Person } from '../features/friends/testData';
import { shortFaculty } from '../features/profile/faculties';
import { useSignedIn } from '../lib/session';
import { BackButton } from '../ui/BackButton';
import { CollapseRow } from '../ui/CollapseRow';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { CommentIcon, PeopleIcon, SortIcon } from '../ui/icons';
import { useNickname } from '../ui/nicknameStore';
import { Popover, PopoverItem, useAnchor, type Rect } from '../ui/Popover';
import { SearchField } from '../ui/SearchField';
import { radius, type, useColors, useReduceMotion } from '../ui/theme';
import { showToast } from '../ui/toastStore';

// «Друзья»: шапка с вашим @никнеймом, вкладки «Друзья» и «Заявки» (листаются и свайпом), поиск и сортировка, строки без карточек.
//
// Макет на выдуманных людях: друзей на сервере нет и в плане нет (CLAUDE.md, жёсткое правило 8).
// Ни одного запроса к серверу экран не делает; всё, что вы тут меняете, живёт только в памяти экрана.

const NATIVE = Platform.OS !== 'web';

export default function FriendsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { profile } = useSignedIn();
  // Нижний отступ списков: с учётом безопасной зоны телефона (полоска «домой»), но не меньше 16 + 24
  const listPadding = { paddingBottom: Math.max(insets.bottom, 16) + 24 };
  const nickname = useNickname(profile?.profileId);
  const faculty = profile?.faculty ? shortFaculty(profile.faculty) : '';

  const [friends, setFriends] = useState<Person[]>(TEST_FRIENDS);
  const [requests, setRequests] = useState<Person[]>(TEST_REQUESTS);
  const [suggestions, setSuggestions] = useState<Person[]>(() => testSuggestions(faculty));
  const [hideSuggestions, setHideSuggestions] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>(DEFAULT_SORT);
  // Меню сортировки открывается от той кнопки, которую нажали (в каждой вкладке своя)
  const sortAnchors = [useAnchor(), useAnchor()];
  const [sortAt, setSortAt] = useState<Rect | null>(null);
  const [menuFor, setMenuFor] = useState<{ person: Person; rect: Rect } | null>(null);
  const [removing, setRemoving] = useState<Person | null>(null);
  const [tab, setTab] = useState(0);

  // Вкладки: два экрана рядом, листаются пальцем. Положение прокрутки (scrollX) считает «родной» поток,
  // а полоска под вкладкой — просто его преобразование: пересчёта экрана на каждом кадре нет
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [labelW, setLabelW] = useState<[number, number]>([0, 0]);
  const pager = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const lastTab = useRef(0);
  const goTo = (index: number) => pager.current?.scrollTo({ x: index * size.width, animated: !reduceMotion });

  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const open = (_person: Person) => showToast('Профиль друга откроется, когда заработают друзья');

  // Поиск, потом сортировка; при смене сортировки список на мгновение гаснет и «собирается» заново
  const needle = query.trim().toLowerCase();
  const match = (person: Person) => !needle || person.nickname.includes(needle) || person.name.toLowerCase().includes(needle);
  const shownFriends = useMemo(() => sortPeople(friends.filter(match), sort), [friends, needle, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownRequests = useMemo(() => sortPeople(requests.filter(match), sort), [requests, needle, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const fade = useRef(new Animated.Value(1)).current;
  const firstSort = useRef(true);
  useEffect(() => {
    if (firstSort.current || reduceMotion) {
      firstSort.current = false;
      return;
    }
    fade.setValue(0.35);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: NATIVE }).start();
  }, [sort, fade, reduceMotion]);

  const accept = (person: Person) => {
    setRequests((current) => current.filter((item) => item.id !== person.id));
    setFriends((current) => [{ ...person, addedAt: Date.now() }, ...current]);
  };
  const decline = (id: string) => setRequests((current) => current.filter((item) => item.id !== id));

  // Полоска: одна и та же вьюха, которая двигается (translateX) и растягивается (scaleX) по положению прокрутки
  const ready = size.width > 0 && labelW[0] > 0 && labelW[1] > 0;
  const range = [0, Math.max(size.width, 1)];
  const BASE = 100;
  const lineStyle = ready
    ? {
        transform: [
          { translateX: scrollX.interpolate({ inputRange: range, outputRange: [size.width / 4 - BASE / 2, (size.width * 3) / 4 - BASE / 2] }) },
          { scaleX: scrollX.interpolate({ inputRange: range, outputRange: [labelW[0] / BASE, labelW[1] / BASE] }) },
        ],
      }
    : { opacity: 0 };

  const tabLabel = (index: 0 | 1, title: string, count: number) => (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === index }} onPress={() => goTo(index)} style={styles.tab}>
      <View
        onLayout={(event) => {
          const w = Math.round(event.nativeEvent.layout.width);
          setLabelW((current) => (current[index] === w ? current : index === 0 ? [w, current[1]] : [current[0], w]));
        }}
      >
        <Text style={[type.headline, { color: tab === index ? colors.textPrimary : colors.textSecondary }]}>
          {title} <Text style={{ fontWeight: '400' }}>{count}</Text>
        </Text>
      </View>
    </Pressable>
  );

  // Шапка каждого списка: поиск, кнопка сортировки и (во вкладке «Друзья») «Возможно, знакомы»
  const listHeader = (withSuggestions: boolean, page: 0 | 1) => (
    <View>
      <View style={styles.search}>
        <View style={styles.searchField}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Поиск" />
        </View>
        <Pressable
          accessibilityRole="button"
          ref={sortAnchors[page]?.ref}
          accessibilityLabel={sort === DEFAULT_SORT ? 'Сортировка' : 'Сортировка: изменена'}
          onPress={() => sortAnchors[page]?.measure(setSortAt)}
          style={({ pressed }) => [styles.sortButton, { backgroundColor: colors.surfaceSecondary, opacity: pressed ? 0.7 : 1 }]}
        >
          <SortIcon color={colors.textPrimary} />
          {sort !== DEFAULT_SORT ? <View style={[styles.sortDot, { backgroundColor: colors.primary, borderColor: colors.surfaceSecondary }]} /> : null}
        </Pressable>
      </View>
      {withSuggestions && !hideSuggestions && !needle ? (
        <Suggestions people={suggestions} faculty={faculty} onHideAll={() => setHideSuggestions(true)} onHideOne={(id) => setSuggestions((current) => current.filter((item) => item.id !== id))} />
      ) : null}
    </View>
  );

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <BackButton onPress={back} />
          </View>
          <Text accessibilityRole="header" numberOfLines={1} style={[type.headline, styles.headerTitle, { color: colors.textPrimary }]}>
            {nickname ? `@${nickname}` : (profile?.displayName ?? 'Друзья')}
          </Text>
          <View style={styles.headerSide} />
        </View>

        <View accessibilityRole="tablist" style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {tabLabel(0, 'Друзья', friends.length)}
          {tabLabel(1, 'Заявки', requests.length)}
          <Animated.View pointerEvents="none" style={[styles.line, { backgroundColor: colors.primary, width: BASE }, lineStyle]} />
        </View>

        {/* Страницы вкладок: у каждой высота ровно с экран, поэтому список внутри прокручивается сам */}
        <View style={styles.fill} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
          {size.width > 0 ? (
            <Animated.ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                useNativeDriver: NATIVE,
                listener: (event: { nativeEvent: { contentOffset: { x: number } } }) => {
                  const next = Math.round(event.nativeEvent.contentOffset.x / size.width);
                  // Экран перерисовывается только когда вкладка действительно сменилась, а не на каждый кадр
                  if (next !== lastTab.current) {
                    lastTab.current = next;
                    setTab(next);
                  }
                },
              })}
            >
              <View style={{ width: size.width, height: size.height }}>
                <Animated.FlatList
                  style={{ opacity: fade }}
                  data={shownFriends}
                  keyExtractor={(person) => person.id}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={listHeader(true, 0)}
                  renderItem={({ item }) => <FriendRow mode="friend" person={item} onOpen={() => open(item)} onMenu={(rect) => setMenuFor({ person: item, rect })} />}
                  ListEmptyComponent={<Empty text={needle ? 'Никого не нашли' : 'Пока нет друзей'} />}
                  contentContainerStyle={[styles.list, listPadding]}
                  initialNumToRender={14}
                />
              </View>
              <View style={{ width: size.width, height: size.height }}>
                <Animated.FlatList
                  style={{ opacity: fade }}
                  data={shownRequests}
                  keyExtractor={(person) => person.id}
                  keyboardShouldPersistTaps="handled"
                  ListHeaderComponent={listHeader(false, 1)}
                  renderItem={({ item }) => (
                    <CollapseRow onRemove={() => decline(item.id)}>
                      {(remove) => (
                        <FriendRow
                          mode="request"
                          person={item}
                          onOpen={() => open(item)}
                          onAccept={() => {
                            // Строка плавно исчезает, и только потом человек переходит в друзья
                            remove();
                            setTimeout(() => accept(item), 0);
                          }}
                          onDecline={remove}
                        />
                      )}
                    </CollapseRow>
                  )}
                  ListEmptyComponent={<Empty text={needle ? 'Никого не нашли' : 'Новых заявок нет'} />}
                  contentContainerStyle={[styles.list, listPadding]}
                />
              </View>
            </Animated.ScrollView>
          ) : null}
        </View>
      </SafeAreaView>

      <Popover visible={sortAt !== null} anchor={sortAt} onClose={() => setSortAt(null)}>
        {SORT_OPTIONS.map((option, index) => (
          <PopoverItem
            key={option.value}
            first={index === 0}
            title={option.label}
            selected={sort === option.value}
            onPress={() => {
              setSort(option.value);
              setSortAt(null);
            }}
          />
        ))}
      </Popover>

      <Popover visible={menuFor !== null} anchor={menuFor?.rect ?? null} onClose={() => setMenuFor(null)}>
        <PopoverItem
          first
          title="Написать"
          icon={<CommentIcon color={colors.textPrimary} background={colors.surface} />}
          onPress={() => {
            setMenuFor(null);
            showToast('Личные сообщения скоро');
          }}
        />
        <PopoverItem
          danger
          title="Удалить из друзей"
          onPress={() => {
            setRemoving(menuFor?.person ?? null);
            setMenuFor(null);
          }}
        />
      </Popover>

      <ConfirmDialog
        visible={removing !== null}
        title="Удалить из друзей?"
        message={removing ? `${removing.name} пропадёт из вашего списка друзей` : undefined}
        confirmTitle="Удалить"
        danger
        onConfirm={() => {
          if (removing) setFriends((current) => current.filter((item) => item.id !== removing.id));
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />
    </View>
  );
}

// Пустое состояние: тонкая иконка и спокойный текст
function Empty({ text }: { text: string }) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <View style={{ transform: [{ scale: 2 }], opacity: 0.55 }}>
        <PeopleIcon color={colors.textSecondary} />
      </View>
      <Text style={[type.body, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 16 },
  headerSide: { width: 56 },
  headerTitle: { flex: 1, textAlign: 'center', fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  line: { position: 'absolute', left: 0, bottom: -StyleSheet.hairlineWidth, height: 2, borderRadius: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  searchField: { flex: 1 },
  sortButton: { width: 44, height: 44, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  sortDot: { position: 'absolute', top: 7, right: 7, width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5 },
  list: { flexGrow: 1 },
  empty: { alignItems: 'center', gap: 16, paddingTop: 70, paddingHorizontal: 32 },
});
