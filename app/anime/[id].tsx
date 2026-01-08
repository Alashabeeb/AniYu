import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext'; // ✅ Theme

import { getAnimeDetails, getAnimeEpisodes } from '../../services/animeService';
import { addDownload, DownloadItem, getDownloads } from '../../services/downloadService';
import { addToHistory } from '../../services/historyService';

export default function AnimeDetailScreen() {
  const { id, episodeId } = useLocalSearchParams();
  const { theme } = useTheme(); // ✅ Use Theme
  
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Episodes');
  const [downloadedEpIds, setDownloadedEpIds] = useState<string[]>([]);
  const [currentEpId, setCurrentEpId] = useState<number | null>(null);

  const videoSource = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  const player = useVideoPlayer(videoSource, player => { player.loop = true; player.play(); });

  useEffect(() => {
    if (episodeId) { setCurrentEpId(Number(episodeId)); setActiveTab('Episodes'); }
  }, [episodeId]);

  useEffect(() => { if (id) loadAllData(); }, [id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [detailsData, episodesData, allDownloads] = await Promise.all([
        getAnimeDetails(id as string),
        getAnimeEpisodes(id as string),
        getDownloads()
      ]);
      setAnime(detailsData);
      setEpisodes(episodesData);
      const myDownloads = allDownloads
        .filter((d: DownloadItem) => d.mal_id === detailsData.mal_id)
        .map((d: DownloadItem) => d.episodeId); 
      setDownloadedEpIds(myDownloads.map(String));

      if (!episodeId && episodesData.length > 0) setCurrentEpId(episodesData[0].mal_id);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleEpisodePress = (ep: any) => {
    setCurrentEpId(ep.mal_id);
    if (anime) addToHistory(anime, ep.title || `Episode ${ep.mal_id}`);
  };

  const handleDownload = async (ep: any) => {
    if (anime) {
        await addDownload(anime, ep);
        setDownloadedEpIds(prev => [...prev, String(ep.mal_id)]);
        Alert.alert("Success", `${ep.title} added to downloads!`);
    }
  };

  if (loading) return <View style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  if (!anime) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerTitle: '', headerTransparent: true, headerTintColor: 'white' }} />

      <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1 }}>
        <View style={styles.videoContainer}>
            <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
        </View>

        <View style={[styles.infoContainer, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>{anime.title}</Text>
            <Text style={[styles.meta, { color: theme.subText }]}>{anime.year || 'N/A'} • {anime.type} • Rating: {anime.score}</Text>

            <View style={styles.tabRow}>
                <TabButton title="Episodes" active={activeTab === 'Episodes'} onPress={() => setActiveTab('Episodes')} theme={theme} />
                <TabButton title="Details" active={activeTab === 'Details'} onPress={() => setActiveTab('Details')} theme={theme} />
            </View>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {activeTab === 'Episodes' ? (
                <View style={styles.episodeList}>
                    {episodes.map((ep) => {
                        const isActive = Number(currentEpId) === Number(ep.mal_id);
                        const isDownloaded = downloadedEpIds.includes(String(ep.mal_id));
                        return (
                            <View key={ep.mal_id} style={styles.epRowWrapper}>
                                <TouchableOpacity 
                                    style={[styles.epCard, { backgroundColor: theme.card }, isActive && { borderColor: theme.tint, borderWidth: 1 }]}
                                    onPress={() => handleEpisodePress(ep)}
                                >
                                    <Ionicons name={isActive ? "play" : "play-outline"} size={20} color={isActive ? theme.tint : theme.subText} style={{ marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text numberOfLines={1} style={[styles.epTitle, { color: isActive ? theme.tint : theme.text }]}>{ep.title}</Text>
                                        <Text style={{ color: theme.subText, fontSize: 12 }}>{ep.aired ? new Date(ep.aired).toLocaleDateString() : 'Unknown Date'}</Text>
                                    </View>
                                </TouchableOpacity>
                                {isDownloaded ? (
                                    <View style={styles.downloadBtn}><Ionicons name="checkmark-circle" size={20} color="#4CAF50" /></View>
                                ) : (
                                    <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: theme.card }]} onPress={() => handleDownload(ep)}>
                                        <Ionicons name="download-outline" size={20} color={theme.subText} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            ) : (
                <View style={styles.detailsContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Synopsis</Text>
                    <Text style={[styles.synopsis, { color: theme.subText }]}>{anime.synopsis}</Text>
                    
                    <View style={[styles.statsGrid, { backgroundColor: theme.card }]}>
                        <View style={styles.statBox}><Text style={{ color: theme.subText }}>Rank</Text><Text style={[styles.val, { color: theme.text }]}>#{anime.rank}</Text></View>
                        <View style={styles.statBox}><Text style={{ color: theme.subText }}>Popularity</Text><Text style={[styles.val, { color: theme.text }]}>#{anime.popularity}</Text></View>
                        <View style={styles.statBox}><Text style={{ color: theme.subText }}>Episodes</Text><Text style={[styles.val, { color: theme.text }]}>{anime.episodes}</Text></View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Genres</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {anime.genres?.map((g: any) => (
                            <View key={g.mal_id} style={{ backgroundColor: theme.card, padding: 8, borderRadius: 10, marginRight: 8, marginBottom: 8 }}>
                                <Text style={{ color: theme.text, fontSize: 12 }}>{g.name}</Text>
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

function TabButton({ title, active, onPress, theme }: any) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.tabBtn, active && { borderBottomColor: theme.tint, borderBottomWidth: 2 }]}>
            <Text style={{ color: active ? theme.tint : theme.subText, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  videoContainer: { width: '100%', height: 250, backgroundColor: 'black' },
  video: { width: '100%', height: '100%' },
  infoContainer: { padding: 16, paddingBottom: 0, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  meta: { fontSize: 13, marginBottom: 15 },
  tabRow: { flexDirection: 'row', marginTop: 5 },
  tabBtn: { marginRight: 20, paddingBottom: 10 },
  contentScroll: { flex: 1 },
  episodeList: { padding: 16 },
  epRowWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  epCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  epTitle: { fontWeight: '600', fontSize: 15, marginBottom: 2 },
  downloadBtn: { marginLeft: 10, width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  detailsContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  synopsis: { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 8, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  val: { fontWeight: 'bold', fontSize: 16 },
});