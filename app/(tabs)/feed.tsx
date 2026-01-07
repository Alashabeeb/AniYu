import { SOCIAL_POSTS } from '@/constants/dummyData'; // Import data
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // New Safe Area
import PostCard from '../../components/PostCard'; // Import component

export default function FeedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={SOCIAL_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
});