import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

// Define the Colors for Light and Dark modes
export const AppTheme = {
  dark: {
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    subText: '#AAAAAA',
    tint: '#FF6B6B',
    border: '#333333',
    input: '#252525',
  },
  light: {
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#000000',
    subText: '#666666',
    tint: '#FF6B6B',
    border: '#E0E0E0',
    input: '#F0F0F0',
  },
};

const ThemeContext = createContext<any>(null);

export const ThemeProvider = ({ children }: any) => {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(true); // Default to Dark

  // Load saved preference on startup
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const saved = await AsyncStorage.getItem('app_theme');
    if (saved) {
      setIsDark(saved === 'dark');
    } else {
      setIsDark(systemScheme === 'dark');
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    await AsyncStorage.setItem('app_theme', newMode ? 'dark' : 'light');
  };

  const theme = isDark ? AppTheme.dark : AppTheme.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);