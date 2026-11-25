import Svg, { Circle, Path } from 'react-native-svg';
import type { WeatherKind } from './weather';
import { CommentIcon } from '../../ui/icons';

// Крупные тонкие значки разделов каталога: бирка, облачко диалога, билет. Одна линия на всех.
const W = 1.6;

export function TagGlyph({ color, size = 24, weight = W }: { color: string; size?: number; weight?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3.5 4.5C3.5 3.9 3.9 3.5 4.5 3.5H11.2L20.3 12.6C20.7 13 20.7 13.6 20.3 14L14 20.3C13.6 20.7 13 20.7 12.6 20.3L3.5 11.2V4.5Z" stroke={color} strokeWidth={weight} strokeLinejoin="round" />
      <Circle cx={8} cy={8} r={1.4} stroke={color} strokeWidth={weight} />
    </Svg>
  );
}

export function ChatGlyph({ color, size = 24 }: { color: string; size?: number }) {
  return <CommentIcon color={color} size={size} />;
}

export function TicketGlyph({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7.5C3 6.7 3.7 6 4.5 6H19.5C20.3 6 21 6.7 21 7.5V10A2 2 0 0 0 21 14V16.5C21 17.3 20.3 18 19.5 18H4.5C3.7 18 3 17.3 3 16.5V14A2 2 0 0 0 3 10V7.5Z"
        stroke={color}
        strokeWidth={W}
        strokeLinejoin="round"
      />
      <Path d="M14.5 6.5V8.5M14.5 11V13M14.5 15.5V17.5" stroke={color} strokeWidth={W} strokeLinecap="round" />
    </Svg>
  );
}

// Погода: тонкие монохромные значки
export function WeatherGlyph({ kind, color, size = 18 }: { kind: WeatherKind; color: string; size?: number }) {
  const cloud = 'M7 18C4.8 18 3 16.2 3 14C3 12 4.4 10.4 6.3 10.1C6.8 7.7 8.9 6 11.5 6C14.1 6 16.3 7.9 16.6 10.4C18.5 10.6 20 12.2 20 14.1C20 16.3 18.4 18 16.2 18H7Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {kind === 'sun' ? (
        <>
          <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={W} />
          <Path d="M12 3V5M12 19V21M3 12H5M19 12H21M5.6 5.6L7 7M17 17L18.4 18.4M5.6 18.4L7 17M17 7L18.4 5.6" stroke={color} strokeWidth={W} strokeLinecap="round" />
        </>
      ) : (
        <Path d={kind === 'cloud' ? cloud : 'M7 15C4.8 15 3 13.2 3 11C3 9 4.4 7.4 6.3 7.1C6.8 4.7 8.9 3 11.5 3C14.1 3 16.3 4.9 16.6 7.4C18.5 7.6 20 9.2 20 11.1C20 13.3 18.4 15 16.2 15H7Z'} stroke={color} strokeWidth={W} strokeLinejoin="round" />
      )}
      {kind === 'rain' ? <Path d="M8 18L7 21M12 18L11 21M16 18L15 21" stroke={color} strokeWidth={W} strokeLinecap="round" /> : null}
      {kind === 'snow' ? <Path d="M8 18.5V18.6M12 20V20.1M16 18.5V18.6" stroke={color} strokeWidth={W * 1.6} strokeLinecap="round" /> : null}
    </Svg>
  );
}

// Быстрые действия: ценник, вопрос, домик
export function SellGlyph({ color, size = 24 }: { color: string; size?: number }) {
  return <TagGlyph color={color} size={size} />;
}

export function AskGlyph({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={W} />
      <Path d="M9.6 9.6C9.8 8.4 10.8 7.7 12 7.7C13.3 7.7 14.3 8.5 14.3 9.7C14.3 11.4 12 11.4 12 13.2" stroke={color} strokeWidth={W} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={16.2} r={0.5} stroke={color} strokeWidth={W} />
    </Svg>
  );
}

export function HomeGlyph({ color, size = 24, weight = W }: { color: string; size?: number; weight?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 11L12 4L20 11V19.5C20 19.8 19.8 20 19.5 20H14.5V14.5H9.5V20H4.5C4.2 20 4 19.8 4 19.5V11Z" stroke={color} strokeWidth={weight} strokeLinejoin="round" />
    </Svg>
  );
}

// Инструменты (ключ и молоток) и портфель — для категорий «Предложить услугу» и «Разместить вакансию»
export function ToolsGlyph({ color, size = 24, weight = W }: { color: string; size?: number; weight?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14.5 6.2A4 4 0 0 0 19.6 4.5L16.9 7.2L17.6 9.4L19.8 10.1L22.5 7.4A4 4 0 0 1 16.8 12.5L7.8 21.5C7 22.3 5.7 22.3 4.9 21.5C4.1 20.7 4.1 19.4 4.9 18.6L13.9 9.6A4 4 0 0 1 14.5 6.2Z" transform="scale(0.88) translate(1.5 0.5)" stroke={color} strokeWidth={weight} strokeLinejoin="round" />
    </Svg>
  );
}

export function BriefcaseGlyph({ color, size = 24, weight = W }: { color: string; size?: number; weight?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3.5 8.5C3.5 7.9 3.9 7.5 4.5 7.5H19.5C20.1 7.5 20.5 7.9 20.5 8.5V18.5C20.5 19.1 20.1 19.5 19.5 19.5H4.5C3.9 19.5 3.5 19.1 3.5 18.5V8.5Z" stroke={color} strokeWidth={weight} strokeLinejoin="round" />
      <Path d="M9 7.5V6C9 5.4 9.4 5 10 5H14C14.6 5 15 5.4 15 6V7.5M3.5 12.5H20.5" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
