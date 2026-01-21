import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const { width } = Dimensions.get('window');

export default function HeroCarousel({ data }: { data: any[] }) {
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
        renderItem={({ item }) => {
           // ✅ FIX: Check multiple paths to ensure image always appears
           // 1. item.image (Direct link)
           // 2. item.images.jpg.large_image_url (Jikan API Standard)
           // 3. item.images.jpg.image_url (Your Admin Panel Uploads)
           const imageUrl = item.image || 
                            item.images?.jpg?.large_image_url || 
                            item.images?.jpg?.image_url ||
                            'https://via.placeholder.com/350x500'; // Fallback

           return (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => router.push(`/anime/${item.mal_id}`)}
              style={{ flex: 1 }}
            >
                <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.image} 
                    contentFit="cover" 
                    transition={500}
                />
                
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)', '#121212']}
                    style={styles.gradient}
                >
                    <View style={styles.content}>
                        <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
                        
                        <View style={styles.tags}>
                            <View style={styles.tag}><Text style={styles.tagText}>#{item.rank || 'Trending'}</Text></View>
                            <View style={styles.tag}><Text style={styles.tagText}>{item.type || 'TV'}</Text></View>
                            <View style={[styles.tag, { backgroundColor: '#FF6B6B' }]}>
                                <Ionicons name="star" size={10} color="white" />
                                <Text style={styles.tagText}> {item.score || 'N/A'}</Text>
                            </View>
                        </View>
                        
                        <Text numberOfLines={2} style={styles.synopsis}>
                            {item.synopsis || "No synopsis available."}
                        </Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        )}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  gradient: { position: 'absolute', bottom: 0, width: '100%', height: 250, justifyContent: 'flex-end', paddingBottom: 20 },
  content: { paddingHorizontal: 20 },
  title: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 10 },
  tags: { flexDirection: 'row', marginBottom: 10 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8, flexDirection: 'row', alignItems: 'center' },
  tagText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  synopsis: { color: '#ccc', fontSize: 14, lineHeight: 20 },
});