import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView, StyleSheet, Text,
    TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Import services
import { getAnimeDetails, getAnimeEpisodes } from '../../services/animeService';
import { addToHistory } from '../../services/historyService'; // ✅ Import History Saver

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams();
  
  // State for Real Data
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for UI
  const [activeTab, setActiveTab] = useState('Episodes');
  const [currentEpId, setCurrentEpId] = useState<number | null>(null);

  // 1. VIDEO PLAYER SETUP
  const videoSource = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  // 2. FETCH REAL DATA
  useEffect(() => {
    if (id) {
      loadAllData();
    }
  }, [id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [detailsData, episodesData] = await Promise.all([
        getAnimeDetails(id as string),
        getAnimeEpisodes(id as string)
      ]);

      setAnime(detailsData);
      setEpisodes(episodesData);
      
      // Auto-select first episode if available
      if (episodesData.length > 0) {
        setCurrentEpId(episodesData[0].mal_id);
      }
    } catch (error) {
      console.error("Failed to load anime data", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ HANDLER: Play Episode & Save to History
  const handleEpisodePress = (ep: any) => {
    setCurrentEpId(ep.mal_id);
    
    // Save to "Continue Watching"
    if (anime) {
        addToHistory(anime, ep.title || `Episode ${ep.mal_id}`);
    }
  };

  // ✅ HANDLER: Mock Download Action
  const handleDownload = (epTitle: string) => {
    Alert.alert("Download Started", `Downloading ${epTitle}...`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (!anime) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
          headerTitle: '', 
          headerTransparent: true, 
          headerTintColor: 'white' 
      }} />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
        
        {/* VIDEO SECTION */}
        <View style={styles.videoContainer}>
            <VideoView 
                style={styles.video} 
                player={player} 
                allowsFullscreen 
                allowsPictureInPicture
            />
        </View>

        {/* INFO SECTION */}
        <View style={styles.infoContainer}>
            <Text style={styles.title}>{anime.title}</Text>
            <Text style={styles.meta}>
                {anime.year || 'N/A'} • {anime.type} • Rating: {anime.score}
            </Text>

            <View style={styles.tabRow}>
                <TabButton title="Episodes" active={activeTab === 'Episodes'} onPress={() => setActiveTab('Episodes')} />
                <TabButton title="Details" active={activeTab === 'Details'} onPress={() => setActiveTab('Details')} />
            </View>
        </View>

        {/* SCROLLABLE CONTENT */}
        <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            
            {/* TAB 1: EPISODES LIST (Updated Layout) */}
            {activeTab === 'Episodes' ? (
                <View style={styles.episodeList}>
                    {episodes.length === 0 ? (
                       <Text style={{ color: 'gray', textAlign: 'center', marginTop: 20 }}>No episodes found.</Text>
                    ) : (
                        episodes.map((ep) => (
                            <View key={ep.mal_id} style={styles.epRowWrapper}>
                                
                                {/* 1. Clickable Episode Card */}
                                <TouchableOpacity 
                                    style={[styles.epCard, currentEpId === ep.mal_id && styles.activeEpCard]}
                                    onPress={() => handleEpisodePress(ep)}
                                >
                                    <View style={styles.playIconContainer}>
                                        <Ionicons 
                                            name={currentEpId === ep.mal_id ? "play" : "play-outline"} 
                                            size={20} 
                                            color={currentEpId === ep.mal_id ? "white" : "gray"} 
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text numberOfLines={1} style={[styles.epTitle, currentEpId === ep.mal_id && styles.activeEpText]}>
                                            {ep.title}
                                        </Text>
                                        <Text style={styles.epDuration}>
                                            {ep.aired ? new Date(ep.aired).toLocaleDateString() : 'Unknown Date'}
                                        </Text>
                                    </View>
                                    {currentEpId === ep.mal_id && (
                                        <View style={styles.nowPlayingBadge}>
                                            <Text style={styles.nowPlayingText}>PLAYING</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* 2. Download Button */}
                                <TouchableOpacity 
                                    style={styles.downloadBtn} 
                                    onPress={() => handleDownload(ep.title)}
                                >
                                    <Ionicons name="download-outline" size={20} color="gray" />
                                </TouchableOpacity>

                            </View>
                        ))
                    )}
                </View>
            ) : (
                // TAB 2: RICH DETAILS
                <View style={styles.detailsContainer}>
                    <Text style={styles.sectionTitle}>Synopsis</Text>
                    <Text style={styles.synopsis}>{anime.synopsis}</Text>
                    
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.label}>Rank</Text>
                            <Text style={styles.value}>#{anime.rank}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.label}>Popularity</Text>
                            <Text style={styles.value}>#{anime.popularity}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.label}>Episodes</Text>
                            <Text style={styles.value}>{anime.episodes || '?'}</Text>
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Genres</Text>
                    <View style={styles.genreRow}>
                        {anime.genres?.map((g: any) => (
                            <View key={g.mal_id} style={styles.genreTag}>
                                <Text style={styles.genreText}>{g.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>

      </SafeAreaView>
    </View>
  );
}

// Reusable Tab Button
function TabButton({ title, active, onPress }: any) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && styles.activeTabBtn]}>
            <Text style={[styles.tabText, active && styles.activeTabText]}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
  
  // Video
  videoContainer: { width: '100%', height: 250, backgroundColor: 'black' },
  video: { width: '100%', height: '100%' },

  // Info
  infoContainer: { padding: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  meta: { color: '#aaa', fontSize: 13, marginBottom: 15 },
  
  // Tabs
  tabRow: { flexDirection: 'row', marginTop: 5 },
  tabBtn: { marginRight: 20, paddingBottom: 10 },
  activeTabBtn: { borderBottomWidth: 2, borderBottomColor: Colors.dark.tint || '#FF6B6B' },
  tabText: { color: 'gray', fontSize: 16, fontWeight: '600' },
  activeTabText: { color: Colors.dark.tint || '#FF6B6B' },

  // Content
  contentScroll: { flex: 1 },
  
  // Episode List Styles
  episodeList: { padding: 16 },
  epRowWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  epCard: { 
    flex: 1, // Takes up remaining space
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 8, 
    backgroundColor: '#1E1E1E' 
  },
  activeEpCard: { backgroundColor: '#252525', borderColor: Colors.dark.tint || '#FF6B6B', borderWidth: 1 },
  playIconContainer: { marginRight: 15 },
  epTitle: { color: 'white', fontWeight: '600', fontSize: 15, marginBottom: 2 },
  activeEpText: { color: Colors.dark.tint || '#FF6B6B' },
  epDuration: { color: 'gray', fontSize: 12 },
  nowPlayingBadge: { 
    marginLeft: 10, backgroundColor: Colors.dark.tint || '#FF6B6B', 
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 
  },
  nowPlayingText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  // ✅ NEW: Download Button Style
  downloadBtn: {
      marginLeft: 10,
      width: 44,
      height: 44,
      backgroundColor: '#1E1E1E',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
  },

  // Details Tab Styles
  detailsContainer: { padding: 20 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  synopsis: { color: '#ccc', fontSize: 15, lineHeight: 24, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 15, borderRadius: 8, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  label: { color: '#888', marginBottom: 4, fontSize: 12 },
  value: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap' },
  genreTag: { 
    backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, marginRight: 8, marginBottom: 8 
  },
  genreText: { color: '#fff', fontSize: 12 },
});