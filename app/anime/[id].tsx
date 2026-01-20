import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { arrayUnion, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

import { getAnimeDetails, getAnimeEpisodes, getSimilarAnime, incrementAnimeView } from '../../services/animeService';
import {
    downloadEpisodeToFile,
    getLocalEpisodeUri,
    isDownloading,
    registerDownloadListener,
    removeDownload,
    unregisterDownloadListener
} from '../../services/downloadService';
import { addToHistory } from '../../services/historyService';

const RANKS = [
    { name: 'GENIN', min: 0, max: 4 },       
    { name: 'CHUNIN', min: 5, max: 19 },      
    { name: 'JONIN', min: 20, max: 49 },      
    { name: 'ANBU', min: 50, max: 99 },       
    { name: 'KAGE', min: 100, max: Infinity },
];

export default function AnimeDetailScreen() {
  const { id, episodeId } = useLocalSearchParams();
  const { theme } = useTheme();
  const router = useRouter();
  
  const [anime, setAnime] = useState<any>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [similarAnime, setSimilarAnime] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview'); 
  
  const [downloadedEpIds, setDownloadedEpIds] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({}); 
  
  const [currentEpId, setCurrentEpId] = useState<string | null>(null);
  const [currentVideoSource, setCurrentVideoSource] = useState<string | null>(null);

  const player = useVideoPlayer(currentVideoSource, player => { 
      player.loop = false; 
      if (currentVideoSource) player.play(); 
  });

  useEffect(() => {
    if (currentVideoSource) {
      player.replace(currentVideoSource);
      player.play();
    }
  }, [currentVideoSource]);

  useEffect(() => {
      const subscription = player.addListener('playToEnd', () => handleVideoFinished());
      return () => subscription.remove();
  }, [player]);

  const handleVideoFinished = async () => {
      const user = auth.currentUser;
      if (!user || !anime || !currentEpId) return;

      try {
          const progressRef = doc(db, 'users', user.uid, 'anime_progress', String(anime.mal_id));
          await setDoc(progressRef, {
              watchedEpisodes: arrayUnion(currentEpId),
              totalEpisodes: anime.totalEpisodes || episodes.length 
          }, { merge: true });

          const progressSnap = await getDoc(progressRef);
          if (progressSnap.exists()) {
              const data = progressSnap.data();
              if ((data.watchedEpisodes?.length || 0) >= (data.totalEpisodes || 0) && !data.isCompleted) {
                  await updateDoc(progressRef, { isCompleted: true });
                  const userRef = doc(db, 'users', user.uid);
                  await updateDoc(userRef, { completedAnimeCount: increment(1) });
                  
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                      const score = userSnap.data().completedAnimeCount || 0;
                      const newRank = RANKS.find(r => score >= r.min && score <= r.max)?.name || "GENIN";
                      if (userSnap.data().rank !== newRank) {
                          await updateDoc(userRef, { rank: newRank });
                          Alert.alert("🎉 RANK PROMOTION!", `You are now a ${newRank}!`);
                      }
                  }
              }
          }
      } catch (error) { console.log("Error updating progress:", error); }
  };

  useEffect(() => {
    if (episodeId) { setCurrentEpId(episodeId as string); setActiveTab('Overview'); }
  }, [episodeId]);

  useEffect(() => { 
      if (id) {
          loadAllData();
          checkAndIncrementView();
      } 
      return () => {};
  }, [id]);

  useEffect(() => {
      const determineSource = async () => {
          if (!currentEpId) return;
          const localUri = await getLocalEpisodeUri(currentEpId);
          if (localUri) {
              console.log("Playing Offline File");
              setCurrentVideoSource(localUri);
          } else {
              const activeEpisode = episodes.find(e => e.mal_id === currentEpId);
              if (activeEpisode?.url) setCurrentVideoSource(activeEpisode.url);
          }
      };
      determineSource();
  }, [currentEpId, episodes, downloadedEpIds]); 

  const checkAndIncrementView = async () => {
      const user = auth.currentUser;
      if (!user || !id) return;
      try {
          const viewRef = doc(db, 'users', user.uid, 'viewed_anime', id as string);
          const viewSnap = await getDoc(viewRef);
          if (!viewSnap.exists()) {
              await setDoc(viewRef, { viewedAt: serverTimestamp() });
              await incrementAnimeView(id as string);
          }
      } catch (e) {}
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [detailsData, episodesData] = await Promise.all([
        getAnimeDetails(id as string),
        getAnimeEpisodes(id as string)
      ]);
      setAnime(detailsData);
      setEpisodes(episodesData);
      
      const animeData = detailsData as any; 
      if (animeData?.genres) {
          const similar = await getSimilarAnime(animeData.genres, id as string);
          setSimilarAnime(similar);
      }

      const ids: string[] = [];
      for (const ep of episodesData) {
          const localUri = await getLocalEpisodeUri(ep.mal_id);
          if (localUri) ids.push(String(ep.mal_id));
      }
      setDownloadedEpIds(ids);

      episodesData.forEach(ep => {
          const epId = String(ep.mal_id);
          if (isDownloading(epId)) {
              setDownloadProgress(prev => ({ ...prev, [epId]: 0.01 }));
              registerDownloadListener(epId, (p) => {
                  setDownloadProgress(prev => ({ ...prev, [epId]: p }));
                  if (p >= 1) {
                      setDownloadedEpIds(prev => [...prev, epId]);
                      setDownloadProgress(prev => { const n={...prev}; delete n[epId]; return n; });
                      unregisterDownloadListener(epId);
                  }
              });
          }
      });

      // ✅ REMOVED: No longer auto-selecting the first episode
      // if (!episodeId && episodesData.length > 0) setCurrentEpId(episodesData[0].mal_id);

    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleEpisodePress = (ep: any) => {
    setCurrentEpId(ep.mal_id);
    if (anime) addToHistory(anime, ep.title || `Episode ${ep.number}`);
  };

  const handleDownload = async (ep: any) => {
    const epId = String(ep.mal_id);

    if (downloadedEpIds.includes(epId)) {
        Alert.alert("Delete Download?", "Remove this episode from offline storage?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await removeDownload(epId);
                setDownloadedEpIds(prev => prev.filter(id => id !== epId));
            }}
        ]);
        return;
    }

    try {
        setDownloadProgress(prev => ({ ...prev, [epId]: 0.01 }));
        registerDownloadListener(epId, (progress) => {
             setDownloadProgress(prev => ({ ...prev, [epId]: progress }));
        });

        const localUri = await downloadEpisodeToFile(anime, ep);

        if (localUri) {
            setDownloadedEpIds(prev => [...prev, epId]);
            setDownloadProgress(prev => {
                const newState = { ...prev };
                delete newState[epId]; 
                return newState;
            });
            unregisterDownloadListener(epId);

            const user = auth.currentUser;
            if (user) {
                const userDownloadRef = doc(db, 'users', user.uid, 'downloaded_episodes', epId);
                const snap = await getDoc(userDownloadRef);
                if (!snap.exists()) {
                    await setDoc(userDownloadRef, { downloadedAt: serverTimestamp() });
                    const epRef = doc(db, 'anime', String(anime.mal_id), 'episodes', epId);
                    await updateDoc(epRef, { downloads: increment(1) });
                }
            }
        }
    } catch (e) {
        Alert.alert("Error", "Download failed.");
        setDownloadProgress(prev => { const n = { ...prev }; delete n[epId]; return n; });
        unregisterDownloadListener(epId);
    }
  };

  const formatSize = (bytes: number) => {
      if (!bytes || bytes === 0) return 'Unknown Size';
      const mb = bytes / (1024 * 1024);
      return mb.toFixed(1) + ' MB';
  };

  if (loading) return <View style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  if (!anime) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerTitle: '', headerTransparent: true, headerTintColor: 'white' }} />

      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1 }}>
        
        {/* ✅ UPDATED: Show Cover Image if no episode is playing */}
        <View style={styles.videoContainer}>
            {currentVideoSource ? (
                <VideoView style={styles.video} player={player} allowsPictureInPicture />
            ) : (
                <View style={styles.posterContainer}>
                    <Image 
                        source={{ uri: anime.images?.jpg?.image_url }} 
                        style={styles.heroPoster} 
                        resizeMode="cover"
                    />
                    {/* Optional Overlay to indicate 'Select an Episode' */}
                    <View style={styles.posterOverlay}>
                        <Ionicons name="play-circle-outline" size={50} color="white" style={{opacity: 0.8}} />
                        <Text style={{color:'white', fontWeight:'bold', marginTop:5}}>Select an Episode</Text>
                    </View>
                </View>
            )}
        </View>

        <View style={[styles.infoContainer, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>{anime.title}</Text>
            <Text style={[styles.meta, { color: theme.subText }]}>{anime.year || 'N/A'} • {anime.type} • Rating: {anime.score || 'N/A'}</Text>

            <View style={styles.tabRow}>
                <TabButton title="Overview" active={activeTab === 'Overview'} onPress={() => setActiveTab('Overview')} theme={theme} />
                <TabButton title="Similar" active={activeTab === 'Similar'} onPress={() => setActiveTab('Similar')} theme={theme} />
            </View>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {activeTab === 'Overview' ? (
                <>
                    <View style={styles.detailsContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Synopsis</Text>
                        <Text style={[styles.synopsis, { color: theme.subText }]}>{anime.synopsis}</Text>
                        
                        <View style={[styles.statsGrid, { backgroundColor: theme.card }]}>
                            <View style={styles.statBox}><Text style={{ color: theme.subText }}>Views</Text><Text style={[styles.val, { color: theme.text }]}>{anime.views || 0}</Text></View>
                            <View style={styles.statBox}><Text style={{ color: theme.subText }}>Episodes</Text><Text style={[styles.val, { color: theme.text }]}>{anime.totalEpisodes || episodes.length}</Text></View>
                            <View style={styles.statBox}><Text style={{ color: theme.subText }}>Rank</Text><Text style={[styles.val, { color: theme.text }]}>#{anime.rank || 'N/A'}</Text></View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Genres</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {anime.genres?.map((g: any) => (
                                <View key={g} style={{ backgroundColor: theme.card, padding: 8, borderRadius: 10, marginRight: 8, marginBottom: 8 }}>
                                    <Text style={{ color: theme.text, fontSize: 12 }}>{g}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 20, marginBottom: 10 }]}>Episodes ({episodes.length})</Text>
                    </View>
                    <View style={styles.episodeList}>
                        {episodes.map((ep) => {
                            const epIdStr = String(ep.mal_id);
                            const isActive = currentEpId === epIdStr;
                            const isDownloaded = downloadedEpIds.includes(epIdStr);
                            const progress = downloadProgress[epIdStr];
                            const isDownloading = progress !== undefined;

                            return (
                                <View key={ep.mal_id} style={styles.epRowWrapper}>
                                    <TouchableOpacity 
                                        style={[styles.epCard, { backgroundColor: theme.card }, isActive && { borderColor: theme.tint, borderWidth: 1 }]}
                                        onPress={() => handleEpisodePress(ep)}
                                    >
                                        <Ionicons name={isActive ? "play" : "play-outline"} size={20} color={isActive ? theme.tint : theme.subText} style={{ marginRight: 10 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text numberOfLines={1} style={[styles.epTitle, { color: isActive ? theme.tint : theme.text }]}>{ep.title}</Text>
                                            <View style={{flexDirection:'row', alignItems:'center', gap: 5}}>
                                                <Text style={{ color: theme.subText, fontSize: 12 }}>
                                                    {ep.aired ? new Date(ep.aired).toLocaleDateString() : 'Ep ' + ep.number}
                                                </Text>
                                                <Text style={{ color: theme.subText, fontSize: 12 }}>• {formatSize(ep.size)}</Text>
                                                {isDownloaded && <Text style={{ color: theme.tint, fontSize: 10, fontWeight: 'bold' }}> • Downloaded</Text>}
                                            </View>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.actionContainer}>
                                        {isDownloading ? (
                                            <View style={styles.progressWrapper}>
                                                <Text style={{fontSize: 9, color: theme.tint, marginBottom: 2, textAlign:'center'}}>{Math.round(progress * 100)}%</Text>
                                                <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                                    <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.tint }]} />
                                                </View>
                                            </View>
                                        ) : (
                                            <TouchableOpacity 
                                                style={[styles.downloadBtn, { backgroundColor: theme.card }]} 
                                                onPress={() => handleDownload(ep)}
                                            >
                                                <Ionicons 
                                                    name={isDownloaded ? "checkmark-done-circle" : "download-outline"} 
                                                    size={22} 
                                                    color={isDownloaded ? "#4CAF50" : theme.subText} 
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </>
            ) : (
                <View style={styles.similarContainer}>
                    {similarAnime.length > 0 ? (
                        <View style={styles.grid}>
                            {similarAnime.map((item) => (
                                <TouchableOpacity 
                                    key={item.mal_id} 
                                    style={[styles.similarCard, { backgroundColor: theme.card }]}
                                    onPress={() => router.push(`/anime/${item.mal_id}`)}
                                >
                                    <Image source={{ uri: item.images?.jpg?.image_url }} style={styles.similarPoster} />
                                    <Text numberOfLines={2} style={[styles.similarTitle, { color: theme.text }]}>{item.title}</Text>
                                    <Text style={{ color: theme.subText, fontSize: 10 }}>{item.type} • {item.score}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Ionicons name="film-outline" size={50} color={theme.subText} />
                            <Text style={{ color: theme.subText, marginTop: 10 }}>No similar anime found.</Text>
                        </View>
                    )}
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
  // ✅ New Styles for Poster Placeholder
  posterContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  heroPoster: { width: '100%', height: '100%' },
  posterOverlay: { 
      position: 'absolute', 
      backgroundColor: 'rgba(0,0,0,0.4)', 
      width: '100%', height: '100%', 
      justifyContent: 'center', alignItems: 'center' 
  },
  
  infoContainer: { padding: 16, paddingBottom: 0, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  meta: { fontSize: 13, marginBottom: 15 },
  tabRow: { flexDirection: 'row', marginTop: 5 },
  tabBtn: { marginRight: 20, paddingBottom: 10 },
  contentScroll: { flex: 1 },
  
  episodeList: { padding: 16, paddingTop: 0 },
  epRowWrapper: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  epCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  epTitle: { fontWeight: '600', fontSize: 15, marginBottom: 2 },
  actionContainer: { marginLeft: 10, width: 50, alignItems: 'center', justifyContent: 'center' },
  downloadBtn: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  progressWrapper: { width: '100%', alignItems: 'center' },
  progressBarBg: { width: 40, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  
  detailsContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  synopsis: { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 8, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  val: { fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { marginTop: 10 },

  similarContainer: { padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  similarCard: { width: '48%', marginBottom: 16, borderRadius: 8, padding: 8 },
  similarPoster: { width: '100%', height: 150, borderRadius: 6, marginBottom: 8 },
  similarTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 }
});