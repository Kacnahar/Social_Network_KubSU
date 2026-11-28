import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Линейные иконки, нарисованные из простых фигур: библиотек иконок в проекте нет.
// Цвет задаётся снаружи и следует теме. У иконок вкладок есть «залитый» вид для активной вкладки.

const W = 1.8; // толщина линии

type IconProps = { color: string; filled?: boolean };

// Галочка выбора
export function CheckIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.check, { borderColor: color }]} />
    </View>
  );
}

// Лента: две «карточки» одна под другой
export function FeedIcon({ color, filled = false }: IconProps) {
  const fill = filled ? color : 'transparent';
  return (
    <View style={styles.box}>
      <View style={[styles.feedCard, { borderColor: color, backgroundColor: fill }]} />
      <View style={[styles.feedCard, { borderColor: color, backgroundColor: fill }]} />
    </View>
  );
}

// Объявления: бирка — квадрат уголком вверх с дырочкой для шнурка
export function AdsIcon({ color, filled = false, hole }: IconProps & { hole?: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.tag, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]}>
        <View style={[styles.tagHole, { backgroundColor: filled ? (hole ?? 'transparent') : color }]} />
      </View>
    </View>
  );
}

// Сумка с ручкой — раздел «Товары»
export function BagIcon({ color, filled = false }: IconProps) {
  return (
    <View style={styles.box}>
      <View style={[styles.bagHandle, { borderColor: color }]} />
      <View style={[styles.bagBody, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]} />
    </View>
  );
}

// Лупа — поиск
export function SearchIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.lens, { borderColor: color }]} />
      <View style={[styles.lensHandle, { backgroundColor: color }]} />
    </View>
  );
}

// Гаечный ключ упрощённо — «Услуги»: кружок с ручкой наискось
export function ServiceIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.gear, { borderColor: color }]} />
      <View style={[styles.gearDot, { backgroundColor: color }]} />
    </View>
  );
}

// Шестерёнка — настройки (тот же рисунок)
export const GearIcon = ServiceIcon;

// Портфель — «Вакансии»
export function JobIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.caseHandle, { borderColor: color }]} />
      <View style={[styles.caseBody, { borderColor: color }]}>
        <View style={[styles.caseLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

// Дом — «Жильё»
export function HomeIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.roof, { borderColor: color }]} />
      <View style={[styles.walls, { borderColor: color }]} />
    </View>
  );
}

// Карта: метка-капля с точкой
export function MapIcon({ color, filled = false, hole }: IconProps & { hole?: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.pin, { borderColor: color, backgroundColor: filled ? color : 'transparent' }]}>
        <View style={[styles.pinDot, { backgroundColor: filled ? (hole ?? 'transparent') : color }]} />
      </View>
    </View>
  );
}

// Профиль: голова и плечи
export function ProfileIcon({ color, filled = false }: IconProps) {
  const fill = filled ? color : 'transparent';
  return (
    <View style={styles.box}>
      <View style={[styles.head, { borderColor: color, backgroundColor: fill }]} />
      <View style={[styles.shoulders, { borderColor: color, backgroundColor: fill }]} />
    </View>
  );
}

// Войс: звуковая волна из пяти столбиков
export function VoiceIcon({ color, size = 24 }: { color: string; size?: number }) {
  const heights = [0.35, 0.7, 1, 0.7, 0.35];
  const bar = Math.max(2, Math.round(size / 9));
  return (
    <View style={[styles.wave, { width: size, height: size, gap: bar }]}>
      {heights.map((height, index) => (
        <View key={index} style={{ width: bar, height: size * height, borderRadius: bar / 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

// Плюс
export function PlusIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2.5V21.5M2.5 12H21.5" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// Шеврон «назад»: тонкий уголок, линия той же толщины, что у «+»
export function BackIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 4.5L7.5 12L15 19.5" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Минус: одна тонкая линия, в паре с PlusIcon
export function MinusIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: 2, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

// Три точки — «ещё»
export function DotsIcon({ color }: { color: string }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={[styles.dot, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

// Сердце и облачко комментария: векторные, линия 1,8 px со скруглёнными концами (вариант А, как в Instagram)
const HEART_PATH = 'M12 20.5C12 20.5 3.5 15.2 3.5 9.2C3.5 6.5 5.5 4.5 8 4.5C9.7 4.5 11.2 5.4 12 6.8C12.8 5.4 14.3 4.5 16 4.5C18.5 4.5 20.5 6.5 20.5 9.2C20.5 15.2 12 20.5 12 20.5Z';
const COMMENT_PATH = 'M4 11.5C4 7.4 7.6 4 12 4C16.4 4 20 7.4 20 11.5C20 15.6 16.4 19 12 19C10.9 19 9.9 18.8 8.9 18.5L4.5 20L5.6 16.4C4.6 15.2 4 13.4 4 11.5Z';

// Сердце: контур или залитое цветом. Параметр background оставлен для старых вызовов и не нужен
export function HeartIcon({ color, filled = false, size = 22 }: IconProps & { background?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={HEART_PATH} fill={filled ? color : 'none'} stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Сообщения: облачко диалога с тремя точками, той же линией, что у «+» и сердца
export function MessageIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5.5 4.5H18.5C19.6 4.5 20.5 5.4 20.5 6.5V14.5C20.5 15.6 19.6 16.5 18.5 16.5H11L6.8 20V16.5H5.5C4.4 16.5 3.5 15.6 3.5 14.5V6.5C3.5 5.4 4.4 4.5 5.5 4.5Z" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.5 10.5H8.6M12 10.5H12.1M15.5 10.5H15.6" stroke={color} strokeWidth={W * 1.25} strokeLinecap="round" />
    </Svg>
  );
}

// GIF: надпись в тонкой рамке; опрос: три столбика
export function GifIcon({ color }: { color: string }) {
  return (
    <View style={[styles.box, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{ width: 24, height: 17, borderWidth: W, borderRadius: 5, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: 9, lineHeight: 11, fontWeight: '800', letterSpacing: 0.3 }}>GIF</Text>
      </View>
    </View>
  );
}

export function PollIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 19.5V12.5M12 19.5V4.5M18 19.5V9" stroke={color} strokeWidth={W * 1.15} strokeLinecap="round" />
    </Svg>
  );
}

// Комментарий: облачко с хвостиком
export function CommentIcon({ color, size = 22 }: { color: string; background?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={COMMENT_PATH} stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Сортировка: две стрелки, вверх и вниз
export function SortIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 6.1, top: 4, width: W, height: 15, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 3.2, top: 4.5, width: 7.5, height: 7.5, borderLeftWidth: W, borderTopWidth: W, borderColor: color, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', left: 16.1, top: 5, width: W, height: 15, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 13.3, top: 12, width: 7.5, height: 7.5, borderRightWidth: W, borderBottomWidth: W, borderColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

// Поделиться: бумажный самолётик, та же линия, что у сердца и облачка
export function ShareIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20.5 3.5L3.5 10.2L10.3 13.7L13.8 20.5L20.5 3.5Z" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10.3 13.7L20.5 3.5" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// Галерея: рамка с «солнцем» и «горой»
export function GalleryIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.frame, { borderColor: color }]}>
        <View style={[styles.sun, { backgroundColor: color }]} />
        <View style={[styles.hill, { borderColor: color }]} />
      </View>
    </View>
  );
}

// Камера: корпус с выступом сверху и объективом
export function CameraIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.cameraBump, { backgroundColor: color }]} />
      <View style={[styles.cameraBody, { borderColor: color }]}>
        <View style={[styles.cameraLens, { borderColor: color }]} />
      </View>
    </View>
  );
}

// Каталог: сетка из четырёх квадратов
export function CatalogIcon({ color, filled = false }: IconProps) {
  const fill = filled ? color : 'transparent';
  return (
    <View style={styles.box}>
      <View style={styles.gridWrap}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.gridCell, { borderColor: color, backgroundColor: fill }]} />
        ))}
      </View>
    </View>
  );
}

// Книга: корешок и две строчки
export function BookIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.book, { borderColor: color }]}>
        <View style={[styles.bookSpine, { backgroundColor: color }]} />
        <View style={[styles.bookLine, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

// Календарь: рамка, две «скобы» сверху и линия под ними
export function CalendarIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.calendar, { borderColor: color }]}>
        <View style={[styles.calendarTop, { backgroundColor: color }]} />
      </View>
      <View style={[styles.calendarPeg, styles.calendarPegLeft, { backgroundColor: color }]} />
      <View style={[styles.calendarPeg, styles.calendarPegRight, { backgroundColor: color }]} />
    </View>
  );
}

// Настройки: две тонкие линии с «ползунками» (как в системных значках), без подписи и фона
export function SlidersIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.sliderLine, { top: 7, backgroundColor: color }]} />
      <View style={[styles.sliderKnob, { top: 4.5, left: 12, borderColor: color }]} />
      <View style={[styles.sliderLine, { top: 16, backgroundColor: color }]} />
      <View style={[styles.sliderKnob, { top: 13.5, left: 4, borderColor: color }]} />
    </View>
  );
}

// Стрелка вправо в конце строки списка
export function ChevronRightIcon({ color }: { color: string }) {
  return (
    <View style={styles.chevronBox}>
      <View style={[styles.chevronRight, { borderColor: color }]} />
    </View>
  );
}

// Колокольчик — уведомления
export function BellIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.bellBody, { borderColor: color }]} />
      <View style={[styles.bellTongue, { backgroundColor: color }]} />
    </View>
  );
}

// Динамик с волной — звук
export function SpeakerIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 3, top: 9, width: 5, height: 6, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: 8, top: 5, width: 0, height: 0, borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 7, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color }} />
      <View style={{ position: 'absolute', left: 14, top: 8, width: 6, height: 8, borderRightWidth: W, borderRadius: 4, borderColor: color }} />
    </View>
  );
}

// Ссылка: две сцепленные «скрепки», повёрнутые на 45°
export function LinkIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', width: 13, height: 8, borderRadius: 4, borderWidth: W, borderColor: color, transform: [{ rotate: '-45deg' }, { translateX: -3 }] }} />
      <View style={{ position: 'absolute', width: 13, height: 8, borderRadius: 4, borderWidth: W, borderColor: color, transform: [{ rotate: '-45deg' }, { translateX: 3 }] }} />
    </View>
  );
}

// Торт: коржи, свечка с огоньком
export function CakeIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 3, top: 15, width: 18, height: 6, borderWidth: W, borderRadius: 2.5, borderColor: color }} />
      <View style={{ position: 'absolute', left: 6, top: 10, width: 12, height: 5.5, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderColor: color }} />
      <View style={{ position: 'absolute', left: 11.1, top: 5.5, width: 1.8, height: 4.5, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: 10.6, top: 1.5, width: 2.8, height: 3.5, borderRadius: 1.4, backgroundColor: color }} />
    </View>
  );
}

// Люди: два человека — голова и плечи
export function PeopleIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 5, top: 4, width: 8, height: 8, borderRadius: 4, borderWidth: W, borderColor: color }} />
      <View style={{ position: 'absolute', left: 2.5, top: 14, width: 13, height: 6, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderColor: color }} />
      <View style={{ position: 'absolute', left: 15, top: 6, width: 6, height: 6, borderRadius: 3, borderWidth: W, borderColor: color }} />
      <View style={{ position: 'absolute', left: 16, top: 14, width: 7, height: 5, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderColor: color }} />
    </View>
  );
}

// Точка «в сети»: кольцо с точкой внутри
export function OnlineIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: W, borderColor: color }} />
      <View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
    </View>
  );
}

// Флажок: древко и полотнище
export function FlagIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 5, top: 3, width: W, height: 18, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 5, top: 4, width: 14, height: 9, borderWidth: W, borderLeftWidth: 0, borderTopRightRadius: 2, borderBottomRightRadius: 2, borderColor: color }} />
    </View>
  );
}

// Корзина: крышка с ручкой и корпус
export function TrashIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 4, top: 6, width: 16, height: W, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 9, top: 3, width: 6, height: 3, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderColor: color }} />
      <View style={{ position: 'absolute', left: 6, top: 8, width: 12, height: 13, borderWidth: W, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, borderColor: color }} />
      <View style={{ position: 'absolute', left: 10.1, top: 11, width: 1.5, height: 7, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 12.9, top: 11, width: 1.5, height: 7, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

// Повернуть по часовой: открытая сверху дуга, стрелка на левом конце смотрит вверх-вправо, то есть по ходу часовой стрелки.
// «Против часовой» — та же картинка, отражённая слева направо
function TurnArrow({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 3, top: 3, width: 18, height: 18, borderRadius: 9, borderWidth: W, borderColor: color, borderTopColor: 'transparent' }} />
      <View style={{ position: 'absolute', left: 2.4, top: 3.2, width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 6.5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

export function RotateRightIcon({ color }: { color: string }) {
  return <TurnArrow color={color} />;
}

export function RotateLeftIcon({ color }: { color: string }) {
  return (
    <View style={{ transform: [{ scaleX: -1 }] }}>
      <TurnArrow color={color} />
    </View>
  );
}

// Отразить слева направо: два треугольника по сторонам вертикальной оси
export function FlipHorizontalIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={{ position: 'absolute', left: 11.1, top: 3, width: W, height: 18, borderRadius: 1, backgroundColor: color, opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: 3, top: 7, width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderRightWidth: 6.5, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color }} />
      <View style={{ position: 'absolute', left: 14.5, top: 7, width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 6.5, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color, opacity: 0.55 }} />
    </View>
  );
}

// Отразить сверху вниз: то же самое, повёрнутое на 90°
export function FlipVerticalIcon({ color }: { color: string }) {
  return (
    <View style={{ transform: [{ rotate: '90deg' }] }}>
      <FlipHorizontalIcon color={color} />
    </View>
  );
}

// Замок — конфиденциальность
export function LockIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.lockShackle, { borderColor: color }]} />
      <View style={[styles.lockBody, { borderColor: color }]} />
    </View>
  );
}

// Круг с чертой — заблокированные
export function BlockIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.ring20, { borderColor: color }]} />
      <View style={[styles.blockLine, { backgroundColor: color }]} />
    </View>
  );
}

// Глобус — язык
export function GlobeIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.ring20, { borderColor: color }]} />
      <View style={[styles.globeMeridian, { borderColor: color }]} />
      <View style={[styles.globeEquator, { backgroundColor: color }]} />
    </View>
  );
}

// Круг, закрашенный наполовину — тема
export function ThemeIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.ring20, { borderColor: color, overflow: 'hidden' }]}>
        <View style={[styles.themeHalf, { backgroundColor: color }]} />
      </View>
    </View>
  );
}

// Круг со знаком в центре: «?» — помощь, «i» — о приложении
export function MarkIcon({ color, mark }: { color: string; mark: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.ring20, { borderColor: color }]} />
      <Text style={[styles.mark, { color }]}>{mark}</Text>
    </View>
  );
}

// История: пунктирный круг с плюсом
export function StoryIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.storyRing, { borderColor: color }]} />
      <PlusIcon color={color} size={10} />
    </View>
  );
}

// Отправить: стрелка вверх
export function SendIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.sendHead, { borderColor: color }]} />
      <View style={[styles.sendStem, { backgroundColor: color }]} />
    </View>
  );
}

// Карандаш: тонкая линия, «изменить»
export function PencilIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5L16.5 3.5z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Телефонная трубка: тонкая линия
export function PhoneIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 4h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 5.3 5.3l1.4-2.2L19 14.5V18a1.5 1.5 0 0 1-1.6 1.5C10.5 19 5 13.5 4.5 6.6A1.5 1.5 0 0 1 5 4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Значки мессенджеров (WhatsApp, Telegram, MAX): тонкие, одним цветом
export function MessengerIcon({ kind, color, size = 22 }: { kind: 'whatsapp' | 'telegram' | 'max'; color: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {kind === 'whatsapp' ? (
        <>
          <Path d="M12 3.2a8.8 8.8 0 0 0-7.6 13.2L3.2 20.8l4.5-1.2A8.8 8.8 0 1 0 12 3.2z" {...common} />
          <Path d="M9 8.6c.1 2.7 3.3 5.9 6 6.1l1.2-1.3-2.1-1.1-.9.9c-.9-.4-2.2-1.7-2.6-2.6l.9-.9-1-2.1z" {...common} />
        </>
      ) : null}
      {kind === 'telegram' ? (
        <>
          <Path d="M20.8 4 3.2 10.8l5.4 2 1.9 6 3-3.6 4.6 3.4z" {...common} />
          <Path d="m8.6 12.8 8.4-6" {...common} />
        </>
      ) : null}
      {kind === 'max' ? (
        <>
          <Path d="M7.5 3.5h9A4 4 0 0 1 20.5 7.5v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" {...common} />
          <Path d="M8 16.2V8l4 5 4-5v8.2" {...common} />
        </>
      ) : null}
    </Svg>
  );
}

// Мелкие значки удобств жилья (мебель, Wi-Fi, стиральная машина, холодильник, кондиционер): тонкая линия
export function AmenityIcon({ kind, color, size = 22 }: { kind: 'furniture' | 'wifi' | 'washer' | 'fridge' | 'ac'; color: string; size?: number }) {
  const common = { stroke: color, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {kind === 'furniture' ? (
        <>
          <Path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" {...common} />
          <Path d="M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z" {...common} />
          <Path d="M6 17v2M18 17v2" {...common} />
        </>
      ) : null}
      {kind === 'wifi' ? (
        <>
          <Path d="M3 9.5a14 14 0 0 1 18 0" {...common} />
          <Path d="M6 13a9.5 9.5 0 0 1 12 0" {...common} />
          <Path d="M9 16.4a5 5 0 0 1 6 0" {...common} />
          <Path d="M12 19.5h.01" {...common} />
        </>
      ) : null}
      {kind === 'washer' ? (
        <>
          <Path d="M5 3.5h14a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" {...common} />
          <Path d="M12 17a4.2 4.2 0 1 0 0-8.4A4.2 4.2 0 0 0 12 17z" {...common} />
          <Path d="M7 6.5h.01M10 6.5h.01" {...common} />
        </>
      ) : null}
      {kind === 'fridge' ? (
        <>
          <Path d="M7 3.5h10a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" {...common} />
          <Path d="M6 10.5h12M9 7v1.5M9 13v2.5" {...common} />
        </>
      ) : null}
      {kind === 'ac' ? (
        <>
          <Path d="M4 5h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" {...common} />
          <Path d="M7 16.5l-1 3M12 16.5v3M17 16.5l1 3" {...common} />
        </>
      ) : null}
    </Svg>
  );
}

// Крестик
export function CloseIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <View style={{ transform: [{ rotate: '45deg' }] }}>
      <PlusIcon color={color} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },

  check: { width: 13, height: 7, borderLeftWidth: W, borderBottomWidth: W, transform: [{ rotate: '-45deg' }], marginTop: -3 },
  feedCard: { width: 19, height: 8, borderWidth: W, borderRadius: 3, marginVertical: 1 },

  tag: { width: 17, height: 17, borderWidth: W, borderRadius: 4, borderTopLeftRadius: 1, transform: [{ rotate: '45deg' }], marginTop: 3 },
  tagHole: { position: 'absolute', left: 2.5, top: 2.5, width: 4, height: 4, borderRadius: 2 },

  lens: { width: 15, height: 15, borderRadius: 7.5, borderWidth: W, marginRight: 4, marginBottom: 4 },
  lensHandle: { position: 'absolute', right: 3, bottom: 4, width: W, height: 8, borderRadius: 1, transform: [{ rotate: '-45deg' }] },

  gear: { width: 18, height: 18, borderRadius: 9, borderWidth: W, borderStyle: 'dashed' },
  gearDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },

  caseHandle: { width: 9, height: 5, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  caseBody: { width: 20, height: 14, borderWidth: W, borderRadius: 4, justifyContent: 'center' },
  caseLine: { height: W, opacity: 0.9 },

  roof: { width: 14, height: 14, borderLeftWidth: W, borderTopWidth: W, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }], marginBottom: -9 },
  walls: { width: 16, height: 10, borderWidth: W, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },

  bagHandle: { width: 9, height: 6, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  bagBody: { width: 19, height: 14, borderWidth: W, borderRadius: 4 },

  pin: {
    width: 16,
    height: 16,
    borderWidth: W,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 1,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  pinDot: { width: 5, height: 5, borderRadius: 2.5 },

  head: { width: 9, height: 9, borderRadius: 4.5, borderWidth: W, marginBottom: 2 },
  shoulders: { width: 19, height: 9, borderWidth: W, borderTopLeftRadius: 9.5, borderTopRightRadius: 9.5, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },

  wave: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  dots: { flexDirection: 'row', gap: 3, alignItems: 'center', justifyContent: 'center', width: 24, height: 24 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  frame: { width: 21, height: 17, borderWidth: W, borderRadius: 4, overflow: 'hidden' },
  sun: { position: 'absolute', left: 3, top: 2.5, width: 4, height: 4, borderRadius: 2 },
  hill: { position: 'absolute', right: -1, bottom: -7, width: 12, height: 12, borderLeftWidth: W, borderTopWidth: W, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }] },

  cameraBump: { width: 8, height: 3, borderTopLeftRadius: 2, borderTopRightRadius: 2, marginBottom: -0.5 },
  cameraBody: { width: 22, height: 15, borderWidth: W, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  cameraLens: { width: 7, height: 7, borderRadius: 3.5, borderWidth: W },

  gridWrap: { width: 21, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gridCell: { width: 9, height: 9, borderWidth: W, borderRadius: 2.5 },

  book: { width: 17, height: 21, borderWidth: W, borderRadius: 3 },
  bookSpine: { position: 'absolute', left: 3, top: 0, bottom: 0, width: W },
  bookLine: { position: 'absolute', left: 7, top: 5, width: 6, height: W, borderRadius: 1 },

  calendar: { width: 21, height: 19, borderWidth: W, borderRadius: 4, marginTop: 2 },
  calendarTop: { position: 'absolute', left: 0, right: 0, top: 4, height: W },
  calendarPeg: { position: 'absolute', top: 1, width: W, height: 5, borderRadius: 1 },
  calendarPegLeft: { left: 7 },
  calendarPegRight: { right: 7 },

  sliderLine: { position: 'absolute', left: 2, width: 20, height: W, borderRadius: 1 },
  sliderKnob: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5, borderWidth: W, backgroundColor: 'transparent' },
  chevronBox: { width: 12, height: 20, alignItems: 'center', justifyContent: 'center' },
  chevronRight: { width: 8, height: 8, borderRightWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }], marginLeft: -3 },
  bellBody: { width: 16, height: 15, borderWidth: W, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginTop: -2 },
  bellTongue: { position: 'absolute', bottom: 2, width: 6, height: 2.5, borderRadius: 1.5 },
  lockShackle: { width: 10, height: 9, borderWidth: W, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5, marginBottom: -1 },
  lockBody: { width: 16, height: 11, borderWidth: W, borderRadius: 3 },
  ring20: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: W },
  blockLine: { position: 'absolute', width: 18, height: W, borderRadius: 1, transform: [{ rotate: '-45deg' }] },
  globeMeridian: { position: 'absolute', width: 9, height: 20, borderRadius: 5, borderWidth: W },
  globeEquator: { position: 'absolute', width: 20, height: W },
  themeHalf: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 9 },
  mark: { fontSize: 13, lineHeight: 16, fontWeight: '600' },

  storyRing: { position: 'absolute', width: 21, height: 21, borderRadius: 10.5, borderWidth: W, borderStyle: 'dashed' },

  sendHead: { position: 'absolute', top: 6, width: 9, height: 9, borderLeftWidth: 2, borderTopWidth: 2, transform: [{ rotate: '45deg' }] },
  sendStem: { position: 'absolute', top: 6, width: 2, height: 13, borderRadius: 1 },

});
