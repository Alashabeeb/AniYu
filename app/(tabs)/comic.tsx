import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router'; // ✅ Import useFocusEffect
import React, { useCallback, useState } from 'react'; // ✅ Import useCallback
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MangaGrid from '../../components/MangaGrid';
import TrendingRail from '../../components/TrendingRail';
import { useTheme } from '../../context/ThemeContext';
import { getFavorites, toggleFavorite } from '../../services/favoritesService';
import { getAllManga, getTopManga, searchManga } from '../../services/mangaService';

export default function ComicScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('Discover'); 
  
  const [topManga, setTopManga] = useState<any[]>([]);
  const [allManga, setAllManga] = useState<any[]>([]); 
  const [library, setLibrary] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ FIXED: Replaced useEffect with useFocusEffect to reload data when tab opens
  useFocusEffect(
    useCallback(() => {
        loadData();
    }, [])
  );

  const loadData = async () => {
    // Note: Removed setLoading(true) here to prevent full screen flash on every tab switch
    // We only show loading on initial mount or refresh
    if (topManga.length === 0) setLoading(true);
    
    const top = await getTopManga();
    const all = await getAllManga();
    const favs = await getFavorites(); 
    
    setTopManga(top);
    setAllManga(all);
    setLibrary(favs); 
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleFav = async (manga: any) => {
      await toggleFavorite(manga);
      const favs = await getFavorites();
      setLibrary(favs);
  };

  const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      Keyboard.dismiss();
      setSearchLoading(true);
      setIsSearching(true);
      const results = await searchManga(searchQuery);
      setSearchResults(results);
      setSearchLoading(false);
  };

  // HANDLER TO OPEN MANGA DETAILS
  const openMangaDetails = (item: any) => {
      router.push({ pathname: '/manga/[id]', params: { id: item.mal_id } });
  };

  const renderGridItem = ({ item }: { item: any }) => (
      <TouchableOpacity 
          style={styles.gridItem}
          onPress={() => openMangaDetails(item)}
      >
          <View style={styles.imageContainer}>
              <Image 
                  source={{ uri: item.images?.jpg?.image_url || 'https://via.placeholder.com/150' }} 
                  style={styles.poster} 
                  contentFit="cover"
              />
              {item.status && item.status !== 'Upcoming' && (
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#10b981' : '#3b82f6' }]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                  </View>
              )}
          </View>
          <Text numberOfLines={1} style={[styles.mangaTitle, { color: theme.text }]}>
              {item.title}
          </Text>
      </TouchableOpacity>
  );

  if (loading && topManga.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manga</Text>
        <View style={[styles.switchContainer, { backgroundColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.switchBtn, activeTab === 'Discover' && { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('Discover')}
          >
            <Text style={[styles.switchText, { color: activeTab === 'Discover' ? theme.text : theme.subText }]}>Discover</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.switchBtn, activeTab === 'Library' && { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('Library')}
          >
            <Text style={[styles.switchText, { color: activeTab === 'Library' ? theme.text : theme.subText }]}>Library</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {activeTab === 'Discover' ? (
            <View style={{ flex: 1 }}>
                {/* Search Bar is always visible in Discover */}
                <View style={styles.headerContainer}>
                    <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                        <Ionicons name="search" size={20} color={theme.subText} style={{ marginRight: 10 }} />
                        <TextInput 
                            style={[styles.input, { color: theme.text }]}
                            placeholder="Search Manga..."
                            placeholderTextColor={theme.subText}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearching(false); setSearchResults([]); }}>
                                <Ionicons name="close-circle" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Show Search Results OR Main Content */}
                {isSearching ? (
                    <View style={{ flex: 1 }}>
                        {searchLoading ? (
                            <View style={styles.center}><ActivityIndicator size="small" color={theme.tint} /></View>
                        ) : (
                            <FlatList
                                data={searchResults}
                                keyExtractor={(item) => item.mal_id.toString()}
                                numColumns={3}
                                renderItem={renderGridItem}
                                contentContainerStyle={{ padding: 10 }}
                                ListEmptyComponent={<Text style={{ color: theme.subText, textAlign: 'center', marginTop: 50 }}>No results found.</Text>}
                            />
                        )}
                    </View>
                ) : (
                    <ScrollView 
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
                        contentContainerStyle={{ paddingBottom: 100 }}
                    >
                        {/* 1. TOP MANGA RAIL */}
                        <TrendingRail 
                            title="🏆 Top Manga" 
                            data={topManga.slice(0, 5)} 
                            favorites={library} 
                            onToggleFavorite={handleToggleFav}
                            onMore={() => router.push('/manga-list?type=top')}
                            onItemPress={openMangaDetails}
                        />

                        {/* 2. ALL MANGA GRID */}
                        <View style={styles.sectionContainer}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>All Manga</Text>
                            {allManga.length > 0 ? (
                                <View style={styles.gridContainer}>
                                    {allManga.map((item: any) => (
                                        <TouchableOpacity 
                                            key={item.mal_id}
                                            style={styles.gridItemWrapper}
                                            onPress={() => openMangaDetails(item)}
                                        >
                                            <View style={styles.imageContainer}>
                                                <Image 
                                                    source={{ uri: item.images?.jpg?.image_url }} 
                                                    style={styles.poster} 
                                                    contentFit="cover"
                                                />
                                                {item.status && item.status !== 'Upcoming' && (
                                                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'Completed' ? '#10b981' : '#3b82f6' }]}>
                                                        <Text style={styles.statusText}>{item.status}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text numberOfLines={1} style={[styles.mangaTitle, { color: theme.text }]}>{item.title}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <Text style={{color: theme.subText, textAlign:'center', marginTop: 20}}>No manga found.</Text>
                            )}
                        </View>
                    </ScrollView>
                )}
            </View>
        ) : (
            <MangaGrid 
                data={library} 
                theme={theme} 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                emptyMsg="No manga in library yet."
            />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  switchContainer: { flexDirection: 'row', borderRadius: 10, padding: 4 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  switchText: { fontWeight: '600' },
  content: { flex: 1, marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 20 },
  headerContainer: { paddingHorizontal: 15, paddingBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 12, marginBottom: 10 },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  sectionContainer: { marginBottom: 20 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  gridItemWrapper: { width: '33.33%', padding: 5, marginBottom: 10, alignItems: 'center' },
  gridItem: { flex: 1/3, margin: 5, alignItems: 'center' }, 
  imageContainer: { width: '100%', position: 'relative', marginBottom: 5 },
  poster: { width: '100%', aspectRatio: 0.7, borderRadius: 8 },
  mangaTitle: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  statusBadge: { position: 'absolute', top: 5, right: 5, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, zIndex: 10 },
  statusText: { color: 'white', fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
});