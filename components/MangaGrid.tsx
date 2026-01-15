import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MangaGrid({ data, theme, refreshing, onRefresh, horizontal, emptyMsg }: any) {
  const router = useRouter();
  const colors = theme || { card: '#1E1E1E', text: 'white', subText: 'gray', tint: '#007AFF' };

  const renderItem = ({ item }: any) => {
    // Handle Jikan API data structure vs Local Favorites structure
    const imageUrl = item.images?.jpg?.image_url || item.image || 'https://via.placeholder.com/150';
    const score = item.score || item.rating || 'N/A';
    const type = item.type || 'Manga';

    return (
      <TouchableOpacity 
          style={[
              styles.card, 
              { backgroundColor: colors.card },
              horizontal ? { width: 140, marginRight: 15 } : { width: '48%', marginBottom: 15 }
          ]}
          // ⚠️ Navigation: Currently re-using the anime details page.
          // We will update this later to a specific /manga/[id] page.
          onPress={() => router.push({ pathname: '/anime/[id]', params: { id: item.mal_id } })} 
      >
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.poster} 
          contentFit="cover" 
        />
        <View style={styles.info}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={{ color: colors.subText, fontSize: 11, marginLeft: 4 }}>{score}</Text>
              </View>
              <Text style={{ color: colors.tint, fontSize: 10, fontWeight: 'bold' }}>{type}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (horizontal) {
      return (
          <FlatList
              data={data}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 15 }}
              renderItem={renderItem}
              keyExtractor={item => String(item.mal_id)}
          />
      );
  }

  return (
    <FlatList
      data={data}
      numColumns={2}
      contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      keyExtractor={item => String(item.mal_id)}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} /> : undefined}
      ListEmptyComponent={
          <View style={{ marginTop: 50, alignItems: 'center' }}>
              <Text style={{ color: colors.subText }}>{emptyMsg || "No manga found."}</Text>
          </View>
      }
      renderItem={renderItem}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden' },
  poster: { width: '100%', height: 200, backgroundColor: '#333' },
  info: { padding: 8 },
  title: { fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
});