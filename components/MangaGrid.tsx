import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock Data
const MANGA_DATA = [
  { id: '1', title: 'One Piece', image: 'https://cdn.myanimelist.net/images/manga/2/253146.jpg', score: 9.2 },
  { id: '2', title: 'Berserk', image: 'https://cdn.myanimelist.net/images/manga/1/157897.jpg', score: 9.4 },
  { id: '3', title: 'Vagabond', image: 'https://cdn.myanimelist.net/images/manga/1/259070.jpg', score: 9.0 },
  { id: '4', title: 'Chainsaw Man', image: 'https://cdn.myanimelist.net/images/manga/3/216464.jpg', score: 8.8 },
];

export default function MangaGrid({ theme }: any) {
  const router = useRouter();
  // Fallback colors
  const colors = theme || { card: '#1E1E1E', text: 'white', subText: 'gray' };

  return (
    <FlatList
      data={MANGA_DATA}
      numColumns={2}
      contentContainerStyle={{ padding: 15 }}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => router.push(`/anime/${item.id}`)}
        >
          <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
          <View style={styles.info}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={{ color: colors.subText, fontSize: 12 }}> {item.score}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { width: '48%', borderRadius: 12, marginBottom: 15, overflow: 'hidden' },
  poster: { width: '100%', height: 220, backgroundColor: '#333' },
  info: { padding: 10 },
  title: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
});