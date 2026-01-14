import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
// ✅ ADDED: setDoc and arrayUnion for tracking episode progress
import { arrayUnion, doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

import { getAnimeDetails, getAnimeEpisodes } from '../../services/animeService';
import { addDownload, DownloadItem, getDownloads } from '../../services/downloadService';
import { addToHistory } from '../../services/historyService';

// ✅ UPDATED: Competitive Ranks (Based on COMPLETED SERIES, not episodes)
const RANKS = [
    { name: 'GENIN', min: 0, max: 4 },       // 0-4 Completed Series
    { name: 'CHUNIN', min: 5, max: 19 },      // 5-19 Completed Series
    { name: 'JONIN', min: 20, max: 49 },      // 20-49 Completed Series
    { name: 'ANBU', min: 50, max: 99 },       // 50-99 Completed Series
    { name: 'KAGE', min: 100, max: Infinity },// 100+ Completed Series (Legendary)
];

export default function AnimeDetailScreen() {
  const { id, episodeId } = useLocalSearchParams();
  const { theme } = useTheme();
  
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Episodes');
  const [downloadedEpIds, setDownloadedEpIds] = useState<string[]>([]);
  const [currentEpId, setCurrentEpId] = useState<number | null>(null);

  const videoSource = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  
  const player = useVideoPlayer(videoSource, player => { 
      player.loop = false; // Must be false to detect completion
      player.play(); 
  });

  // LISTEN FOR VIDEO COMPLETION
  useEffect(() => {
      const subscription = player.addListener('playToEnd', () => {
          handleVideoFinished();
      });
      return () => subscription.remove();
  }, [player]);

  // ✅ NEW LOGIC: Count Series Completion
  const handleVideoFinished = async () => {
      const user = auth.currentUser;
      // We need anime info and current episode to track progress
      if (!user || !anime || !currentEpId) return;

      try {
          // 1. Reference to this specific anime's progress (Subcollection to keep it organized)
          const progressRef = doc(db, 'users', user.uid, 'anime_progress', String(anime.mal_id));
          
          // 2. Add this episode to the user's "Watched List" for this show
          // (arrayUnion ensures we don't count the same episode twice)
          await setDoc(progressRef, {
              watchedEpisodes: arrayUnion(currentEpId),
              totalEpisodes: anime.episodes || episodes.length // Use API total or fallback to list length
          }, { merge: true });

          // 3. Check if the User has finished the WHOLE series
          const progressSnap = await getDoc(progressRef);
          if (progressSnap.exists()) {
              const data = progressSnap.data();
              const watchedCount = data.watchedEpisodes?.length || 0;
              const total = data.totalEpisodes || 0;
              const alreadyCompleted = data.isCompleted || false;

              // CONDITION: Have they watched ALL episodes? And is it the FIRST time finishing?
              if (watchedCount >= total && total > 0 && !alreadyCompleted) {
                  
                  // A. Mark Series as Completed in DB
                  await updateDoc(progressRef, { isCompleted: true });

                  // B. Increment the main "Completed Anime" counter (This is what determines Rank)
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, { 
                      completedAnimeCount: increment(1) 
                  });
                  
                  // C. Check for Rank Up
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                      const userData = userSnap.data();
                      const score = userData.completedAnimeCount || 0;
                      
                      const newRank = RANKS.find(r => score >= r.min && score <= r.max)?.name || "GENIN";
                      
                      if (userData.rank !== newRank) {
                          await updateDoc(userRef, { rank: newRank });
                          Alert.alert("🎉 RANK PROMOTION!", `You are now a ${newRank}!\n(Completed ${score} Anime Series)`);
                      } else {
                          Alert.alert("🏆 SERIES COMPLETED!", `You finished ${anime.title}!\nIt now counts towards your Rank.`);
                      }
                  }
              }
          }
      } catch (error) {
          console.log("Error updating progress:", error);
      }
  };

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
        // Fixed Red Underline: Convert to String and use safe check
        .filter((d: DownloadItem) => String(d.mal_id) === String(detailsData?.mal_id || ''))
        .map((d: DownloadItem) => d.episodeId); 
        
      setDownloadedEpIds(myDownloads.map(String));

      if (!episodeId && episodesData.length > 0) setCurrentEpId(episodesData[0].mal_id);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleEpisodePress = (ep: any) => {
    setCurrentEpId(ep.mal_id);
    if (anime) addToHistory(anime, ep.title || `Episode ${ep.mal_id}`);
    player.replay();
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
            <VideoView 
                style={styles.video} 
                player={player} 
                allowsPictureInPicture 
            />
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