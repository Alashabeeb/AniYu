// constants/Colors.ts

const tintColorLight = '#FF6B6B'; // Electric Coral
const tintColorDark = '#FF6B6B';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#121212', // Deep Charcoal (Not pure black)
    surface: '#1E1E1E',    // Slightly lighter for cards/nav
    tint: tintColorDark,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};