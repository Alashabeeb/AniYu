import { Colors } from '@/constants/Colors';
import { MANGA_LIBRARY } from '@/constants/dummyData';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
// Calculate card size: (Screen Width - Padding) / 3 columns
const CARD_WIDTH = (width - 48) / 3; 

export default function MangaGrid() {
  return (
    <View style={styles.container}>
      <FlatList
        data={MANGA_LIBRARY}
        keyExtractor={(item) => item.id}
        numColumns={3} // 3 items per row like a bookshelf
        columnWrapperStyle={styles.row} // Spacing between items in a row
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            {/* The Cover Image */}
            <Image source={{ uri: item.cover }} style={styles.cover} contentFit="cover" />
            
            {/* Status Badge (e.g. Reading) */}
            {item.status === 'Reading' && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>CH. {item.chapters}</Text>
                </View>
            )}

            {/* Title */}
            <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  row: { justifyContent: 'space-between', marginBottom: 20 },
  card: { width: CARD_WIDTH },
  cover: { 
    width: '100%', 
    height: CARD_WIDTH * 1.5, // 2:3 Aspect Ratio (Standard Book)
    borderRadius: 8, 
    backgroundColor: '#333',
    marginBottom: 8
  },
  title: { color: '#ECEDEE', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: Colors.dark.tint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' }
});