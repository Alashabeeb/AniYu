import { SOCIAL_POSTS } from '@/constants/dummyData';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard';
import { useTheme } from '../../context/ThemeContext'; // ✅ Import Theme

export default function FeedScreen() {
  const { theme } = useTheme(); // ✅ Get the current theme colors

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={SOCIAL_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            // ✅ Pass 'theme' prop to PostCard so it knows to switch colors
            <PostCard post={item} theme={theme} />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Removed hardcoded backgroundColor
});