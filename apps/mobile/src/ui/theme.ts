import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background: '#F6F5F2',
    card: '#FFFFFF',
    text: '#1B1B1F',
    muted: '#6B6B76',
    border: '#D9D8D3',
    accent: '#3D5AFE',
    onAccent: '#FFFFFF',
    danger: '#C62828',
    success: '#2E9E5B',
  },
  dark: {
    background: '#121216',
    card: '#1D1D24',
    text: '#F2F2F5',
    muted: '#9A9AA6',
    border: '#34343E',
    accent: '#8C9EFF',
    onAccent: '#10101A',
    danger: '#FF8A80',
    success: '#5FD08A',
  },
};

export type Colors = (typeof palette)['light'];

export function useColors(): Colors {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
