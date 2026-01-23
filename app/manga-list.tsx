import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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
import { useTheme } from '../context/ThemeContext';
import { getTopManga } from '../services/mangaService';

// ✅ FIX: Ensure this is the default export
export default function MangaListScreen() {
  const { type } = useLocalSearchParams(); 
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
        if (type === 'top') {
            const data = await getTopManga();
            const rankedData = data.map((item, index) => ({
                ...item,
                rank: index + 1
            }));
            setList(rankedData);
        }
    } catch (error) {
        console.error("Error loading list:", error);
    } finally {
        setLoading(false);
    }
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Top Manga</Text>
      </View>

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
                    // ✅ FIX: Pass isManga='true' so the details page knows it's a manga
                    onPress={() => router.push({ pathname: '/manga/[id]', params: { id: item.mal_id } })} // ✅ Updated
                >
                    <View style={styles.imageContainer}>
                        <Image 
                            source={{ uri: item.images?.jpg?.image_url || 'https://via.placeholder.com/150' }} 
                            style={styles.poster} 
                            contentFit="cover"
                        />
                        {item.rank && (
                            <View style={[styles.rankBadge, { backgroundColor: item.rank <= 3 ? theme.tint : 'rgba(0,0,0,0.7)' }]}>
                                <Text style={styles.rankText}>#{item.rank}</Text>
                            </View>
                        )}
                        {item.status && item.status !== 'Upcoming' && (
                            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#10b981' : '#3b82f6' }]}>
                                <Text style={styles.statusText}>{item.status}</Text>
                            </View>
                        )}
                    </View>
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
  searchContainer: { paddingHorizontal: 15, paddingVertical: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 45, borderRadius: 10 },
  input: { flex: 1, fontSize: 16 },
  gridItem: { flex: 1/3, margin: 5, alignItems: 'center' },
  imageContainer: { width: '100%', position: 'relative', marginBottom: 5 },
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 8 },
  animeTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  rankBadge: { position: 'absolute', top: 5, left: 5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 10 },
  rankText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  statusBadge: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, zIndex: 10 },
  statusText: { color: 'white', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
});