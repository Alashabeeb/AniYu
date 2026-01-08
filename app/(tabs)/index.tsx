import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { useTheme } from '../../context/ThemeContext'; // ✅ Import Theme

import HeroCarousel from '../../components/HeroCarousel';
import TrendingRail from '../../components/TrendingRail';
import { getTopAnime, searchAnime } from '../../services/animeService';
import { getFavorites, toggleFavorite } from '../../services/favoritesService';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme(); // ✅ Get Theme Data

  const [trending, setTrending] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  useFocusEffect(
    useCallback(() => { loadFavorites(); }, [])
  );

  const loadFavorites = async () => {
      const favs = await getFavorites();
      setFavorites(favs);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const data = await getTopAnime();
      setTrending(data);
      await loadFavorites(); 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFav = async (anime: any) => {
      await toggleFavorite(anime);
      await loadFavorites();
  };

  const handleSearch = async () => {
    if (query.trim().length === 0) return;
    Keyboard.dismiss(); 
    setSearchLoading(true);
    setIsSearching(true);
    try {
      const results = await searchAnime(query);
      setSearchResults(results);
    } catch (error) { console.error(error); } 
    finally { setSearchLoading(false); }
  };

  const clearSearch = () => {
    setQuery('');
    setIsSearching(false);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const renderSearchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.searchCard, { backgroundColor: theme.card }]} // Dynamic Card
      onPress={() => router.push(`/anime/${item.mal_id}`)}
    >
      <Image source={{ uri: item.images?.jpg?.image_url }} style={styles.searchImage} contentFit="cover" />
      <View style={styles.searchInfo}>
        <Text numberOfLines={1} style={[styles.searchTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.searchMeta, { color: theme.subText }]}>
            ⭐ {item.score || '?'} • {item.year || 'N/A'} • {item.type}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Dynamic Status Bar */}
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Search Bar */}
      <View style={styles.headerContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={20} color={theme.subText} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search anime..."
            placeholderTextColor={theme.subText}
            style={[styles.input, { color: theme.text }]}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch} 
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
               <Ionicons name="close-circle" size={20} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={{ flex: 1 }}>
            {searchLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="small" color={theme.tint} />
                </View>
            ) : (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.mal_id.toString()}
                    renderItem={renderSearchItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={
                        <Text style={{ color: theme.subText, textAlign: 'center', marginTop: 50 }}>No results found.</Text>
                    }
                />
            )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <HeroCarousel data={trending.slice(0, 5)} />
          <TrendingRail title="Trending Now" data={trending} favorites={favorites} onToggleFavorite={handleToggleFav} />
          <TrendingRail title="Recommended for You" data={trending.slice(5)} favorites={favorites} onToggleFavorite={handleToggleFav} />
          
          {favorites.length > 0 && (
              <TrendingRail title="My Favorites ❤️" data={favorites} favorites={favorites} onToggleFavorite={handleToggleFav} />
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10 },
  searchBar: { flexDirection: 'row', borderRadius: 12, paddingHorizontal: 15, height: 45, alignItems: 'center' },
  input: { flex: 1, fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  searchCard: { flexDirection: 'row', marginBottom: 12, borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  searchImage: { width: 60, height: 80 },
  searchInfo: { flex: 1, padding: 12 },
  searchTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  searchMeta: { fontSize: 12 },
});