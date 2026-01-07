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

// Services
import { getAnimeDetails, getAnimeEpisodes } from '../../services/animeService';
import { addDownload, DownloadItem, getDownloads } from '../../services/downloadService'; // ✅ Import getDownloads
import { checkIsFavorite, toggleFavorite } from '../../services/favoritesService';
import { addToHistory } from '../../services/historyService';

export default function AnimeDetailScreen() {
  const { id, episodeId } = useLocalSearchParams();
  
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Episodes');
  
  // ✅ NEW: Store IDs of downloaded episodes
  const [downloadedEpIds, setDownloadedEpIds] = useState<string[]>([]);

  const [currentEpId, setCurrentEpId] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);

  const videoSource = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.play();
  });

  // Listener for params (deep linking from Downloads)
  useEffect(() => {
    if (episodeId) {
        setCurrentEpId(Number(episodeId));
        setActiveTab('Episodes');
    }
  }, [episodeId]);

  useEffect(() => {
    if (id) {
      loadAllData();
    }
  }, [id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [detailsData, episodesData, allDownloads] = await Promise.all([
        getAnimeDetails(id as string),
        getAnimeEpisodes(id as string),
        getDownloads() // ✅ Fetch downloads
      ]);

      setAnime(detailsData);
      setEpisodes(episodesData);
      
      // ✅ Filter downloads for THIS anime only
      const myDownloads = allDownloads
        .filter((d: DownloadItem) => d.mal_id === detailsData.mal_id)
        .map((d: DownloadItem) => d.episodeId); // Keep just the IDs
        
      setDownloadedEpIds(myDownloads.map(String)); // Store as strings for easy comparison

      const favStatus = await checkIsFavorite(detailsData.mal_id);
      setIsFav(favStatus);

      if (!episodeId && episodesData.length > 0) {
          setCurrentEpId(episodesData[0].mal_id);
      }
    } catch (error) {
      console.error("Failed to load anime data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodePress = (ep: any) => {
    setCurrentEpId(ep.mal_id);
    if (anime) {
        addToHistory(anime, ep.title || `Episode ${ep.mal_id}`);
    }
  };

  const handleToggleFav = async () => {
    if (!anime) return;
    const newStatus = await toggleFavorite(anime);
    setIsFav(newStatus);
  };

  const handleDownload = async (ep: any) => {
    if (anime) {
        await addDownload(anime, ep);
        // ✅ Instantly update UI to show "Downloaded"
        setDownloadedEpIds(prev => [...prev, String(ep.mal_id)]);
        Alert.alert("Success", `${ep.title} added to downloads!`);
    }
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

      <TouchableOpacity 
        style={styles.favButton} 
        onPress={handleToggleFav}
      >
        <Ionicons 
          name={isFav ? "heart" : "heart-outline"} 
          size={28} 
          color={isFav ? "#FF6B6B" : "white"} 
        />
      </TouchableOpacity>

      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
        
        <View style={styles.videoContainer}>
            <VideoView 
                style={styles.video} 
                player={player} 
                allowsFullscreen 
                allowsPictureInPicture
            />
        </View>

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

        <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            
            {activeTab === 'Episodes' ? (
                <View style={styles.episodeList}>
                    {episodes.length === 0 ? (
                       <Text style={{ color: 'gray', textAlign: 'center', marginTop: 20 }}>No episodes found.</Text>
                    ) : (
                        episodes.map((ep) => {
                            const isActive = Number(currentEpId) === Number(ep.mal_id);
                            // ✅ Check if this episode is in our downloaded list
                            const isDownloaded = downloadedEpIds.includes(String(ep.mal_id));
                            
                            return (
                                <View key={ep.mal_id} style={styles.epRowWrapper}>
                                    
                                    <TouchableOpacity 
                                        style={[
                                            styles.epCard, 
                                            isActive && styles.activeEpCard 
                                        ]}
                                        onPress={() => handleEpisodePress(ep)}
                                    >
                                        <View style={styles.playIconContainer}>
                                            <Ionicons 
                                                name={isActive ? "play" : "play-outline"} 
                                                size={20} 
                                                color={isActive ? Colors.dark.tint || "#FF6B6B" : "gray"} 
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={[
                                                styles.epTitle, 
                                                isActive && styles.activeEpText
                                            ]}>
                                                {ep.title}
                                            </Text>
                                            <Text style={styles.epDuration}>
                                                {ep.aired ? new Date(ep.aired).toLocaleDateString() : 'Unknown Date'}
                                            </Text>
                                        </View>
                                        {isActive && (
                                            <View style={styles.nowPlayingBadge}>
                                                <Text style={styles.nowPlayingText}>PLAYING</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {/* ✅ CONDITIONAL RENDER: Download Button vs Downloaded Label */}
                                    {isDownloaded ? (
                                        <View style={styles.downloadedBadge}>
                                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={styles.downloadBtn} 
                                            onPress={() => handleDownload(ep)}
                                        >
                                            <Ionicons name="download-outline" size={20} color="gray" />
                                        </TouchableOpacity>
                                    )}

                                </View>
                            );
                        })
                    )}
                </View>
            ) : (
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
  favButton: {
    position: 'absolute',
    top: 60, right: 20, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20,
  },
  videoContainer: { width: '100%', height: 250, backgroundColor: 'black' },
  video: { width: '100%', height: '100%' },
  infoContainer: { padding: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  meta: { color: '#aaa', fontSize: 13, marginBottom: 15 },
  tabRow: { flexDirection: 'row', marginTop: 5 },
  tabBtn: { marginRight: 20, paddingBottom: 10 },
  activeTabBtn: { borderBottomWidth: 2, borderBottomColor: Colors.dark.tint || '#FF6B6B' },
  tabText: { color: 'gray', fontSize: 16, fontWeight: '600' },
  activeTabText: { color: Colors.dark.tint || '#FF6B6B' },
  contentScroll: { flex: 1 },
  episodeList: { padding: 16 },
  epRowWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  epCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#1E1E1E' },
  activeEpCard: { backgroundColor: '#2A1A1A', borderColor: Colors.dark.tint || '#FF6B6B', borderWidth: 2 },
  activeEpText: { color: Colors.dark.tint || '#FF6B6B', fontWeight: 'bold', fontSize: 16 },
  playIconContainer: { marginRight: 15 },
  epTitle: { color: 'white', fontWeight: '600', fontSize: 15, marginBottom: 2 },
  epDuration: { color: 'gray', fontSize: 12 },
  nowPlayingBadge: { marginLeft: 10, backgroundColor: Colors.dark.tint || '#FF6B6B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  nowPlayingText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  downloadBtn: { marginLeft: 10, width: 44, height: 44, backgroundColor: '#1E1E1E', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  // ✅ NEW STYLE for Checkmark
  downloadedBadge: { marginLeft: 10, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  detailsContainer: { padding: 20 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  synopsis: { color: '#ccc', fontSize: 15, lineHeight: 24, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1E1E1E', padding: 15, borderRadius: 8, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  label: { color: '#888', marginBottom: 4, fontSize: 12 },
  value: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap' },
  genreTag: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8 },
  genreText: { color: '#fff', fontSize: 12 },
});