import { StyleSheet, Text, View } from 'react-native';

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
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 2, height: size, borderRadius: 1, backgroundColor: color }} />
    </View>
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

// Сердце. Контур получается так: сердце цвета линии, а поверх — сердце поменьше цвета фона
function HeartShape({ size, color }: { size: number; color: string }) {
  const a = size * 0.52;
  const shift = a * 0.354;
  const cy = size * 0.56;
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ position: 'absolute', width: a, height: a, left: size / 2 - a / 2, top: cy - a / 2, backgroundColor: color, borderRadius: a * 0.12, transform: [{ rotate: '45deg' }] }} />
      <View style={{ position: 'absolute', width: a, height: a, borderRadius: a / 2, left: size / 2 - shift - a / 2, top: cy - shift - a / 2, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: a, height: a, borderRadius: a / 2, left: size / 2 + shift - a / 2, top: cy - shift - a / 2, backgroundColor: color }} />
    </View>
  );
}

export function HeartIcon({ color, filled = false, background, size = 22 }: IconProps & { background: string; size?: number }) {
  const inner = size - W * 2.6;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <HeartShape size={size} color={color} />
      {filled ? null : (
        <View style={{ position: 'absolute' }}>
          <HeartShape size={inner} color={background} />
        </View>
      )}
    </View>
  );
}

// Комментарий: облачко с хвостиком
export function CommentIcon({ color, background }: { color: string; background: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.bubble, { borderColor: color }]} />
      <View style={[styles.bubbleTail, { borderColor: color, backgroundColor: background }]} />
    </View>
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

// Поделиться: стрелка вверх из лотка
export function ShareIcon({ color }: { color: string }) {
  return (
    <View style={styles.box}>
      <View style={[styles.arrowHead, { borderColor: color }]} />
      <View style={[styles.arrowStem, { backgroundColor: color }]} />
      <View style={[styles.tray, { borderColor: color }]} />
    </View>
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

  bubble: { width: 20, height: 16, borderWidth: W, borderRadius: 7, marginBottom: 2 },
  bubbleTail: {
    position: 'absolute',
    left: 6,
    bottom: 2.5,
    width: 6,
    height: 6,
    borderLeftWidth: W,
    borderBottomWidth: W,
    borderBottomLeftRadius: 2,
    transform: [{ skewX: '-20deg' }],
  },

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

  arrowHead: { position: 'absolute', top: 3, width: 8, height: 8, borderLeftWidth: W, borderTopWidth: W, transform: [{ rotate: '45deg' }] },
  arrowStem: { position: 'absolute', top: 3, width: W, height: 13, borderRadius: 1 },
  tray: { position: 'absolute', bottom: 2, width: 18, height: 8, borderWidth: W, borderTopWidth: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
});
