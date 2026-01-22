import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface TrendingRailProps {
  title: string;
  data: any[];
  favorites?: any[];
  onToggleFavorite?: (anime: any) => void;
  onMore?: () => void; // ✅ New Prop for "More" button
}

export default function TrendingRail({ title, data, favorites = [], onToggleFavorite, onMore }: TrendingRailProps) {
  const { theme } = useTheme(); 
  
  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* ✅ UPDATED: Header Row with Title and More Button */}
      <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {onMore && (
              <TouchableOpacity onPress={onMore}>
                  <Text style={[styles.moreText, { color: theme.tint }]}>More</Text>
              </TouchableOpacity>
          )}
      </View>
      
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20 }}
        keyExtractor={(item, index) => item.mal_id ? item.mal_id.toString() : index.toString()}
        renderItem={({ item }) => {
            const imageUrl = item.image || item.images?.jpg?.image_url;
            const isFav = favorites.some((fav) => fav.mal_id === item.mal_id);
            
            return (
              <View style={styles.cardContainer}>
                  <Link href={`/anime/${item.mal_id}`} asChild>
                    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.poster} 
                        contentFit="cover" 
                        transition={500}
                      />
                      <Text numberOfLines={1} style={[styles.animeTitle, { color: theme.text }]}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  </Link>

                  {onToggleFavorite && (
                      <TouchableOpacity 
                        style={styles.heartButton} 
                        onPress={() => onToggleFavorite(item)}
                      >
                        <Ionicons 
                            name={isFav ? "heart" : "heart-outline"} 
                            size={20} 
                            color={isFav ? theme.tint : "white"} 
                        />
                      </TouchableOpacity>
                  )}
              </View>
            );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 30 },
  // ✅ New Header Styles
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  moreText: { fontSize: 14, fontWeight: '600' },
  
  cardContainer: { marginRight: 15, position: 'relative' },
  card: { width: 140 },
  poster: { width: 140, height: 210, borderRadius: 12, backgroundColor: '#333', marginBottom: 8 },
  animeTitle: { fontWeight: '600', fontSize: 14 },
  heartButton: {
      position: 'absolute', top: 8, right: 8,
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 6, zIndex: 10,
  }
});