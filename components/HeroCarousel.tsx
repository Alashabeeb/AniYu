import { Colors } from '@/constants/Colors';
import { HERO_ANIME } from '@/constants/dummyData';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const width = Dimensions.get('window').width;
const height = width * 1.2; // Tall aspect ratio for impact

export default function HeroCarousel() {
  return (
    <View style={{ height: 450 }}>
      <Carousel
        loop
        width={width}
        height={450}
        autoPlay={true}
        data={HERO_ANIME}
        scrollAnimationDuration={1000}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            {/* Background Image */}
            <Image source={{ uri: item.image }} style={styles.image} contentFit="cover" />
            
            {/* Gradient Overlay (Darkens bottom for text readability) */}
            <LinearGradient
              colors={['transparent', 'rgba(18,18,18,0.8)', '#121212']}
              style={styles.gradient}
            />

            {/* Content Info */}
            <View style={styles.textContainer}>
              <View style={styles.tagRow}>
                <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="black" />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
                {item.tags.map((tag, index) => (
                    <Text key={index} style={styles.tagText}>• {tag} </Text>
                ))}
              </View>

              <Text style={styles.title}>{item.title}</Text>

              {/* Watch Now Button */}
              <TouchableOpacity style={styles.playButton}>
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
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ratingBadge: { 
    flexDirection: 'row', backgroundColor: '#FFD700', paddingHorizontal: 6, 
    paddingVertical: 2, borderRadius: 4, marginRight: 10, alignItems: 'center' 
  },
  ratingText: { color: 'black', fontWeight: 'bold', fontSize: 12, marginLeft: 2 },
  tagText: { color: '#ccc', fontSize: 13, marginRight: 5 },
  playButton: { 
    flexDirection: 'row', backgroundColor: Colors.dark.tint, 
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, 
    alignSelf: 'flex-start', alignItems: 'center' 
  },
  playText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
});