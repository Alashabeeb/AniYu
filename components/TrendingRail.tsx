import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TrendingRailProps {
  title: string;
  data: any[];
}

export default function TrendingRail({ title, data }: TrendingRailProps) {
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20 }}
        keyExtractor={(item, index) => item.mal_id ? item.mal_id.toString() : index.toString()}
        renderItem={({ item }) => {
            // ✅ FIX: Handle both standard API data and History data
            // API uses: item.images.jpg.image_url
            // History uses: item.image
            const imageUrl = item.image || item.images?.jpg?.image_url;
            
            return (
              <Link href={`/anime/${item.mal_id}`} asChild>
                <TouchableOpacity style={styles.card}>
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.poster} 
                    contentFit="cover" 
                    transition={500}
                  />
                  <Text numberOfLines={1} style={styles.animeTitle}>
                    {item.title}
                  </Text>
                  
                  {/* Show episode if it exists (for History items) */}
                  {item.episode && (
                      <Text style={styles.episodeText}>{item.episode}</Text>
                  )}
                </TouchableOpacity>
              </Link>
            );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 30 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  card: { marginRight: 15, width: 140 },
  poster: { width: 140, height: 210, borderRadius: 12, backgroundColor: '#333', marginBottom: 8 },
  animeTitle: { color: 'white', fontWeight: '600', fontSize: 14 },
  episodeText: { color: '#FF6B6B', fontSize: 12, marginTop: 2 },
});