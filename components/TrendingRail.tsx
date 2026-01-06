import { TRENDING_ANIME } from '@/constants/dummyData';
import { Image } from 'expo-image';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TrendingRail() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Trending Now</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TRENDING_ANIME}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
            <Text numberOfLines={1} style={styles.animeTitle}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, marginBottom: 40 },
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  card: { marginRight: 15, width: 120 },
  poster: { width: 120, height: 180, borderRadius: 12, backgroundColor: '#333' },
  animeTitle: { color: '#ccc', marginTop: 8, fontSize: 14, fontWeight: '500' },
});