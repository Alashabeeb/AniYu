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
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { getAnimeDetails } from '../services/animeService';
import { getFavorites } from '../services/favoritesService';

export default function AnimeListScreen() {
  const { type } = useLocalSearchParams(); // 'watched' or 'favorites'
  const router = useRouter();
  const { theme } = useTheme();
  
  const [list, setList] = useState<any[]>([]);
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
            
            // Query "anime_progress" where isCompleted == true
            const q = query(
                collection(db, 'users', user.uid, 'anime_progress'),
                where('isCompleted', '==', true)
            );
            const snapshot = await getDocs(q);
            
            // NOTE: Since we only saved IDs, we might need to fetch details. 
            // Ideally, update [id].tsx to save title/image in anime_progress too.
            // For now, we fetch details from API (might be slow for long lists).
            const promises = snapshot.docs.map(async (doc) => {
                 const data = doc.data();
                 try {
                     // Try to fetch simple details using the ID (doc.id)
                     const details = await getAnimeDetails(doc.id);
                     return { ...details, mal_id: doc.id };
                 } catch (err) {
                     return { mal_id: doc.id, title: `Anime #${doc.id}` }; // Fallback
                 }
            });
            
            const results = await Promise.all(promises);
            setList(results);
        }
    } catch (error) {
        console.error("Error loading list:", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
            {type === 'watched' ? 'Completed Anime' : 'Favorites'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={theme.tint} />
      ) : (
        <FlatList
            data={list}
            keyExtractor={item => String(item.mal_id)}
            numColumns={3} // Grid View
            contentContainerStyle={{ padding: 10 }}
            renderItem={({ item }) => (
                <TouchableOpacity 
                    style={styles.gridItem}
                    onPress={() => router.push({ pathname: '/anime/[id]', params: { id: item.mal_id } })}
                >
                    <Image 
                        source={{ uri: item.images?.jpg?.image_url || item.image || 'https://via.placeholder.com/150' }} 
                        style={styles.poster} 
                        contentFit="cover"
                    />
                    <Text style={[styles.animeTitle, { color: theme.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                </TouchableOpacity>
            )}
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
  gridItem: { flex: 1/3, margin: 5, alignItems: 'center' },
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 8, marginBottom: 5 },
  animeTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center' }
});