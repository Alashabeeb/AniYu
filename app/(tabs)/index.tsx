import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  ScrollView, StatusBar, StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

import HeroCarousel from '../../components/HeroCarousel';
import TrendingRail from '../../components/TrendingRail';
import { auth, db } from '../../config/firebaseConfig';
import { getTopAnime, searchAnime } from '../../services/animeService';
import { getFavorites, toggleFavorite } from '../../services/favoritesService';
import { getUnreadLocalCount } from '../../services/notificationService';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const currentUser = auth.currentUser;

  const [trending, setTrending] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [queryText, setQueryText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Notification Red Dot State
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => { loadInitialData(); }, []);

  useFocusEffect(
    useCallback(() => { 
        loadFavorites(); 
        checkUnreadStatus(); 
    }, [])
  );

  // LISTEN FOR NOTIFICATIONS (Real-time)
  useEffect(() => {
      if (!currentUser) return;
      const q = query(collection(db, 'users', currentUser.uid, 'notifications'), where('read', '==', false));
      const unsubscribe = onSnapshot(q, (snapshot) => checkUnreadStatus(snapshot.docs.length));
      return unsubscribe;
  }, []);

  const checkUnreadStatus = async (socialCount?: number) => {
      const localCount = await getUnreadLocalCount();
      if (socialCount !== undefined) {
           setHasUnread(socialCount > 0 || localCount > 0);
      } else {
           // ✅ FIX: Explicitly set false if 0 (Fixed bug where dot wouldn't clear)
           setHasUnread(localCount > 0);
      }
  };

  const loadFavorites = async () => {
      const favs = await getFavorites();
      
      // ✅ UPDATE: Filter to show ONLY Anime (Exclude Manga/Manhwa)
      const animeFavs = favs.filter((item: any) => {
          const type = item.type?.toLowerCase();
          return type !== 'manga' && type !== 'manhwa' && type !== 'novel' && !item.isManga;
      });
      
      setFavorites(animeFavs);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  const handleToggleFav = async (anime: any) => {
      await toggleFavorite(anime);
      await loadFavorites();
  };

  const handleSearch = async () => {
    if (queryText.trim().length === 0) return;
    Keyboard.dismiss(); 
    setSearchLoading(true);
    setIsSearching(true);
    try {
      const results = await searchAnime(queryText);
      setSearchResults(results);
    } catch (error) { console.error(error); } 
    finally { setSearchLoading(false); }
  };

  const clearSearch = () => {
    setQueryText('');
    setIsSearching(false);
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const renderSearchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.searchCard, { backgroundColor: theme.card }]}
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* HEADER: AniYu (Left) + Notification (Right) */}
      <View style={styles.topHeader}>
          <Text style={[styles.brandText, { color: theme.text }]}>AniYu</Text>
          
          <TouchableOpacity 
            style={styles.notificationBtn} 
            onPress={() => router.push('/notifications')}
          >
              <Ionicons name="notifications-outline" size={26} color={theme.text} />
              {hasUnread && <View style={styles.redDotHeader} />}
          </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.headerContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
          <Ionicons name="search" size={20} color={theme.subText} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search anime..."
            placeholderTextColor={theme.subText}
            style={[styles.input, { color: theme.text }]}
            value={queryText}
            onChangeText={setQueryText}
            onSubmitEditing={handleSearch} 
            returnKeyType="search"
          />
          {queryText.length > 0 && (
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
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        >
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
  
  // HEADER STYLES
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  brandText: { fontSize: 24, fontWeight: '900', fontFamily: 'System', letterSpacing: 0.5 },
  notificationBtn: { padding: 5, position: 'relative' },
  redDotHeader: { position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', borderWidth: 1, borderColor: 'white' },

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