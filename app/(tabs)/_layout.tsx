// app/(tabs)/_layout.tsx

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext'; // ✅ CHANGED: Import our custom theme context

export default function TabLayout() {
  const { theme, isDark } = useTheme(); // ✅ CHANGED: Get theme from Settings

  return (
    <Tabs
      screenOptions={{
        // ✅ CHANGED: Use dynamic colors from our context
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: isDark ? '#888' : '#ccc', // Adjusts based on mode
        headerShown: false, 
        tabBarStyle: {
          backgroundColor: theme.card, // ✅ CHANGED: Uses theme.card (White or Dark Grey)
          borderTopWidth: 0, 
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          elevation: 0, // Removes shadow on Android for a cleaner look
        },
      }}>
      
      {/* Tab 1: Home (Watch) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'play-circle' : 'play-circle-outline'} size={28} color={color} />
          ),
        }}
      />

      {/* Tab 2: Feed (Social) */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={26} color={color} />
          ),
        }}
      />

      {/* Tab 3: Comic (Manga) */}
      <Tabs.Screen
        name="comic" // Note: Ensure your file is named comic.tsx (singular) based on this code
        options={{
          title: 'Manga',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} size={26} color={color} />
          ),
        }}
      />

      {/* Tab 4: Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}