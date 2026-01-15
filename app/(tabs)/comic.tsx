import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTheme } from '../../context/ThemeContext';
import { getFavorites } from '../../services/favoritesService';
import { getTopManga, getTrendingManhwa, searchManga } from '../../services/mangaService';

export default function ComicScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('Discover'); 
  const [topManga, setTopManga] = useState([]);
  const [trendingManhwa, setTrendingManhwa] = useState([]);
  const [library, setLibrary] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // 1. Fetch API Data
    const top = await getTopManga();
    const manhwa = await getTrendingManhwa();
    
    // 2. Fetch Favorites (Local/Firebase)
    // Note: Ideally, filter these to only show items where type === 'Manga' or 'Manhwa'
    const favs = await getFavorites(); 
    
    setTopManga(top);
    setTrendingManhwa(manhwa);
    setLibrary(favs); 
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSearch = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      const results = await searchManga(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
  };

  const renderDiscover = () => (
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
          {/* SEARCH BAR */}
          <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
              <Ionicons name="search" size={20} color={theme.subText} />
              <TextInput 
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Search Manga, Manhwa..."
                  placeholderTextColor={theme.subText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                      <Ionicons name="close-circle" size={18} color={theme.subText} />
                  </TouchableOpacity>
              )}
          </View>

          {searchResults.length > 0 ? (
              <View>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 15 }]}>Search Results</Text>
                  <MangaGrid data={searchResults} theme={theme} />
              </View>
          ) : (
              <>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Manga 🏆</Text>
                  <MangaGrid data={topManga} theme={theme} horizontal />

                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 25 }]}>Trending Manhwa 🔥</Text>
                  <MangaGrid data={trendingManhwa} theme={theme} horizontal />
              </>
          )}
      </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
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
        {loading ? (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        ) : (
            activeTab === 'Discover' ? renderDiscover() : (
                <MangaGrid 
                    data={library} 
                    theme={theme} 
                    refreshing={refreshing} 
                    onRefresh={onRefresh}
                    emptyMsg="No manga in library yet."
                />
            )
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  switchContainer: { flexDirection: 'row', borderRadius: 10, padding: 4 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  switchText: { fontWeight: '600' },
  content: { flex: 1, marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 45, borderRadius: 12, margin: 15, marginBottom: 10 },
  input: { flex: 1, marginLeft: 10, fontSize: 16 }
});