import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
// ✅ Import getRecommendedAnime
import { getAnimeDetails, getRecommendedAnime, getTopAnime } from '../services/animeService';
import { getFavorites } from '../services/favoritesService';
import { getContinueWatching } from '../services/historyService';

export default function AnimeListScreen() {
  const { type } = useLocalSearchParams(); // 'watched', 'favorites', 'recommended', or undefined (Trending)
  const router = useRouter();
  const { theme } = useTheme();
  
  const [list, setList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        if (type === 'favorites') {
            const favs = await getFavorites();
            setList(favs);
        } else if (type === 'watched') {
            const user = auth.currentUser;
            if (!user) return;
            
            const q = query(
                collection(db, 'users', user.uid, 'anime_progress'),
                where('isCompleted', '==', true)
            );
            const snapshot = await getDocs(q);
            
            const promises = snapshot.docs.map(async (doc) => {
                 try {
                     const details = await getAnimeDetails(doc.id);
                     return { ...details, mal_id: doc.id };
                 } catch (err) {
                     return { mal_id: doc.id, title: `Anime #${doc.id}` }; 
                 }
            });
            
            const results = await Promise.all(promises);
            setList(results);
        } else if (type === 'recommended') {
            // ✅ RECOMMENDED LOGIC
            const history = await getContinueWatching();
            const genreCounts: Record<string, number> = {};
            history.forEach(item => {
                if (item.genres) item.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1);
            });
            const topGenres = Object.entries(genreCounts).sort(([,a], [,b]) => b - a).map(([g]) => g).slice(0, 3);
            
            const recs = await getRecommendedAnime(topGenres);
            setList(recs);
        } else {
            // TRENDING LOGIC
            const trending = await getTopAnime();
            const rankedTrending = trending.map((item, index) => ({
                ...item,
                rank: index + 1
            }));
            setList(rankedTrending);
        }
    } catch (error) {
        console.error("Error loading list:", error);
    } finally {
        setLoading(false);
    }
  };

  const getTitle = () => {
      if (type === 'watched') return 'Completed Anime';
      if (type === 'favorites') return 'Favorites';
      if (type === 'recommended') return 'Recommended For You'; // ✅ New Title
      return 'Trending Now';
  };

  const filteredList = list.filter(item => 
      item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
            {getTitle()}
        </Text>
      </View>

      {/* ✅ Search Bar for Trending AND Recommended */}
      {(!type || type === 'trending' || type === 'recommended') && (
          <View style={styles.searchContainer}>
              <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                  <Ionicons name="search" size={20} color={theme.subText} style={{ marginRight: 10 }} />
                  <TextInput 
                      placeholder="Search list..." 
                      placeholderTextColor={theme.subText}
                      style={[styles.input, { color: theme.text }]}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                          <Ionicons name="close-circle" size={20} color={theme.subText} />
                      </TouchableOpacity>
                  )}
              </View>
          </View>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={theme.tint} />
      ) : (
        <FlatList
            data={filteredList}
            keyExtractor={item => String(item.mal_id)}
            numColumns={3}
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => (
                <TouchableOpacity 
                    style={styles.gridItem}
                    onPress={() => router.push({ pathname: '/anime/[id]', params: { id: item.mal_id } })}
                >
                    <View style={styles.imageContainer}>
                        <Image 
                            source={{ uri: item.images?.jpg?.image_url || item.image || 'https://via.placeholder.com/150' }} 
                            style={styles.poster} 
                            contentFit="cover"
                        />
                        {/* Only show rank if it exists (Trending only) */}
                        {item.rank && (
                            <View style={[styles.rankBadge, { backgroundColor: item.rank <= 3 ? theme.tint : 'rgba(0,0,0,0.7)' }]}>
                                <Text style={styles.rankText}>#{item.rank}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.animeTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                </TouchableOpacity>
            )}
            ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.subText, marginTop: 50 }}>No results found.</Text>
            }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  
  searchContainer: { paddingHorizontal: 15, paddingVertical: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 45, borderRadius: 10 },
  input: { flex: 1, fontSize: 16 },

  gridItem: { flex: 1/3, margin: 5, alignItems: 'center' },
  imageContainer: { width: '100%', position: 'relative', marginBottom: 5 },
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 8 },
  
  rankBadge: {
      position: 'absolute',
      top: 5,
      left: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      zIndex: 10
  },
  rankText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  
  animeTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center' }
});