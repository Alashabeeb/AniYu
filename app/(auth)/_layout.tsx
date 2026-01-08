import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '../../context/ThemeContext'; // ✅ Theme Support

export default function AuthLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.background } 
    }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}