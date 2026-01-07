import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const width = Dimensions.get('window').width;

// ✅ Updated Interface for Jikan API
interface AnimeData {
  mal_id: number;
  title: string;
  images: {
    jpg: {
      large_image_url: string; // Use large image for Hero
    };
  };
  score: number;
  genres: { name: string }[]; // Jikan returns genres, not tags
}

interface HeroCarouselProps {
  data: AnimeData[];
}

export default function HeroCarousel({ data }: HeroCarouselProps) {
  const router = useRouter();

  if (!data || data.length === 0) return null;

  return (
    <View style={{ height: 450 }}>
      <Carousel
        loop
        width={width}
        height={450}
        autoPlay={true}
        data={data}
        scrollAnimationDuration={1000}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            {/* ✅ FIX: Use large_image_url for better quality */}
            <Image 
                source={{ uri: item.images.jpg.large_image_url }} 
                style={styles.image} 
                contentFit="cover" 
            />
            
            <LinearGradient
              colors={['transparent', 'rgba(18,18,18,0.5)', '#121212']}
              style={styles.gradient}
            />

            <View style={styles.textContainer}>
              <View style={styles.tagRow}>
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="black" />
                    {/* ✅ FIX: Use 'score' instead of 'rating' */}
                    <Text style={styles.ratingText}>{item.score}</Text>
                </View>
                
                {/* ✅ FIX: Map over 'genres' instead of 'tags', with safety check (?) */}
                {item.genres?.slice(0, 3).map((genre, index) => (
                    <Text key={index} style={styles.tagText}>• {genre.name} </Text>
                ))}
              </View>

              <Text numberOfLines={2} style={styles.title}>{item.title}</Text>

              <TouchableOpacity 
                style={styles.playButton}
                // ✅ FIX: Use mal_id for navigation
                onPress={() => router.push(`/anime/${item.mal_id}`)}
              >
                <Ionicons name="play" size={24} color="white" />
                <Text style={styles.playText}>Watch Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: { flex: 1, justifyContent: 'flex-end' },
  image: { position: 'absolute', width: '100%', height: '100%' },
  gradient: { position: 'absolute', width: '100%', height: '100%' },
  textContainer: { padding: 20, paddingBottom: 40 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  ratingBadge: { 
    flexDirection: 'row', backgroundColor: '#FFD700', paddingHorizontal: 6, 
    paddingVertical: 2, borderRadius: 4, marginRight: 10, alignItems: 'center' 
  },
  ratingText: { color: 'black', fontWeight: 'bold', fontSize: 12, marginLeft: 2 },
  tagText: { color: '#ccc', fontSize: 13, marginRight: 5 },
  playButton: { 
    flexDirection: 'row', backgroundColor: Colors.dark.tint || '#FF6B6B', // Fallback color added just in case
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, 
    alignSelf: 'flex-start', alignItems: 'center' 
  },
  playText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});