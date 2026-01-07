import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ✅ FIX 1: Update Interface to accept BOTH data types
interface AnimeItem {
  mal_id: number;
  title: string;
  // It might have 'image' (History) OR 'images' (API)
  image?: string; 
  images?: {
    jpg: {
      image_url: string;
    };
  };
}

interface TrendingRailProps {
  title: string;
  data: any[]; // Relaxed type to avoid Red Line conflicts
}

export default function TrendingRail({ title, data }: TrendingRailProps) {
  const router = useRouter();

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item) => item.mal_id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => {
          
          // ✅ FIX 2: Smartly check which image source to use
          // If 'item.image' exists (History), use it. 
          // Otherwise use 'item.images.jpg.image_url' (API).
          const imageUrl = item.image 
            ? item.image 
            : item.images?.jpg?.image_url;

          return (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push(`/anime/${item.mal_id}`)}
            >
              <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.poster} 
                  contentFit="cover" 
                  transition={500} 
              />
              <Text numberOfLines={1} style={styles.animeTitle}>{item.title}</Text>
              
              {/* Optional: Show episode badge if it exists (for Continue Watching) */}
              {item.episode && (
                <Text style={styles.episodeBadge}>{item.episode}</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 20 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  card: { marginRight: 15, width: 120 },
  poster: { width: 120, height: 180, borderRadius: 12, backgroundColor: '#333' },
  animeTitle: { color: '#ccc', marginTop: 8, fontSize: 14, fontWeight: '500' },
  // New style for the episode text in history
  episodeBadge: { color: '#FF6B6B', fontSize: 10, marginTop: 2, fontWeight: 'bold' } 
});