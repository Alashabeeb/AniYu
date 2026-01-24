import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface MangaGridProps {
  data: any[];
  theme: any;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMsg?: string;
}

export default function MangaGrid({ data, theme, refreshing, onRefresh, emptyMsg }: MangaGridProps) {
  const router = useRouter();

  const openMangaDetails = (item: any) => {
    router.push({ pathname: '/manga/[id]', params: { id: item.mal_id } });
  };

  const renderItem = ({ item }: { item: any }) => {
    // Format Score (e.g. 8.5)
    const score = item.score ? Number(item.score).toFixed(1) : null;

    return (
      <TouchableOpacity 
          style={styles.gridItem}
          onPress={() => openMangaDetails(item)}
      >
          <View style={styles.imageContainer}>
              <Image 
                  source={{ uri: item.images?.jpg?.image_url || item.image || 'https://via.placeholder.com/150' }} 
                  style={styles.poster} 
                  contentFit="cover"
              />
              
              {/* ✅ STATUS BADGE (Top Right) */}
              {item.status && item.status !== 'Upcoming' && (
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#10b981' : '#3b82f6' }]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                  </View>
              )}

              {/* ✅ RATING BADGE (Top Left) - Only show if score exists */}
              {score && (
                  <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={10} color="#FFD700" />
                      <Text style={styles.ratingText}>{score}</Text>
                  </View>
              )}
          </View>
          
          <Text numberOfLines={1} style={[styles.mangaTitle, { color: theme.text }]}>
              {item.title || item.animeTitle}
          </Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => item.mal_id ? item.mal_id.toString() : index.toString()}
      numColumns={3}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 10, paddingBottom: 100 }}
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.tint} /> : undefined
      }
      ListEmptyComponent={
        <View style={{ marginTop: 50, alignItems: 'center' }}>
          <Text style={{ color: theme.subText }}>{emptyMsg || "No manga found."}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  gridItem: { flex: 1/3, margin: 5, alignItems: 'center' }, 
  imageContainer: { width: '100%', position: 'relative', marginBottom: 5 },
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 8, backgroundColor: '#333' },
  mangaTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  
  statusBadge: { 
    position: 'absolute', 
    top: 5, 
    right: 5, 
    paddingHorizontal: 5, 
    paddingVertical: 2, 
    borderRadius: 4, 
    zIndex: 10 
  },
  statusText: { color: 'white', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },

  ratingBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2
  },
  ratingText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});