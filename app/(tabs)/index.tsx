import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView, StatusBar, StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroCarousel from '../../components/HeroCarousel';
import TrendingRail from '../../components/TrendingRail';
import { getTopAnime, searchAnime } from '../../services/animeService';

export default function HomeScreen() {
  const router = useRouter();

  // Data States
  const [trending, setTrending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search States
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const data = await getTopAnime();
      setTrending(data);
    } catch (error) {
      console.error("Failed to load anime:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (query.trim().length === 0) return;
    Keyboard.dismiss(); 
    setSearchLoading(true);
    setIsSearching(true);
    try {
      const results = await searchAnime(query);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setIsSearching(false);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const renderSearchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.searchCard}
      onPress={() => router.push(`/anime/${item.mal_id}`)}
    >
      <Image 
        source={{ uri: item.images?.jpg?.image_url }} 
        style={styles.searchImage} 
        contentFit="cover" 
      />
      <View style={styles.searchInfo}>
        <Text numberOfLines={1} style={styles.searchTitle}>{item.title}</Text>
        <Text style={styles.searchMeta}>
            ⭐ {item.score || '?'} • {item.year || 'N/A'} • {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Search Bar Header */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="gray" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search anime..."
            placeholderTextColor="#666"
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch} 
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
               <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      {isSearching ? (
        <View style={{ flex: 1 }}>
            {searchLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color="#FF6B6B" />
                </View>
            ) : (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.mal_id.toString()}
                    renderItem={renderSearchItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No results found.</Text>
                    }
                />
            )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {/* 1. Hero Carousel */}
          <HeroCarousel data={trending.slice(0, 5)} />

          {/* 2. Trending Now */}
          <TrendingRail title="Trending Now" data={trending} />

          {/* 3. Recommended for You */}
          <TrendingRail title="Recommended for You" data={trending.slice(5)} />

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10 },
  searchBar: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, paddingHorizontal: 15, height: 45, alignItems: 'center' },
  input: { flex: 1, color: 'white', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { color: 'gray', textAlign: 'center', marginTop: 50 },
  searchCard: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#1E1E1E', borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  searchImage: { width: 60, height: 80 },
  searchInfo: { flex: 1, padding: 12 },
  searchTitle: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  searchMeta: { color: 'gray', fontSize: 12 },
});