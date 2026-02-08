import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import {
    DownloadItem,
    addCompletionListener, // ✅ Import listener
    cancelDownload,
    getActiveDownloads,
    getDownloads,
    isDownloading,
    registerDownloadListener,
    removeCompletionListener, // ✅ Import remove listener
    removeDownload,
    unregisterDownloadListener
} from '../services/downloadService';

export default function DownloadsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  
  const [groupedDownloads, setGroupedDownloads] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAnime, setExpandedAnime] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDownloads();
    
    // ✅ NEW: Listen for completions instead of polling
    const onComplete = () => loadDownloads();
    addCompletionListener(onComplete);

    return () => removeCompletionListener(onComplete);
  }, []);

  const loadDownloads = async () => {
    const completed = await getDownloads();
    const active = getActiveDownloads();

    const all = [...active, ...completed.filter(c => !active.find(a => String(a.episodeId) === String(c.episodeId)))];
    
    groupData(all);

    active.forEach(item => {
        const epId = String(item.episodeId);
        registerDownloadListener(epId, (p) => {
             setDownloadProgress(prev => ({ ...prev, [epId]: p }));
             if (p >= 1) {
                 unregisterDownloadListener(epId);
                 // Note: The completion listener handles the reload now
             }
        });
    });
  };

  const groupData = (data: DownloadItem[]) => {
    const groups: Record<string, { anime: any, episodes: DownloadItem[] }> = {};
    data.forEach(item => {
        const id = String(item.mal_id);
        if (!groups[id]) {
            groups[id] = {
                anime: { title: item.animeTitle, image: item.image, id: item.mal_id },
                episodes: []
            };
        }
        groups[id].episodes.push(item);
    });
    setGroupedDownloads(Object.values(groups));
  };

  const toggleExpand = (animeId: string) => {
      setExpandedAnime(prev => ({ ...prev, [animeId]: !prev[animeId] }));
  };

  const handleDelete = (item: DownloadItem) => {
    const isActive = isDownloading(String(item.episodeId));
    Alert.alert(isActive ? "Cancel Download" : "Delete Download", `Remove ${item.title}?`, [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
          if (isActive) await cancelDownload(item.episodeId);
          else await removeDownload(item.episodeId);
          loadDownloads(); 
      }}
    ]);
  };

  const playLocal = (item: DownloadItem) => {
      if (isDownloading(String(item.episodeId))) {
          Alert.alert("Please Wait", "This episode is still downloading.");
          return;
      }
      router.push(`/anime/${item.mal_id}?episodeId=${item.episodeId}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Downloads</Text>
      </View>

      <FlatList
        data={groupedDownloads}
        keyExtractor={(item) => String(item.anime.id)}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadDownloads(); setRefreshing(false); }} />}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="download-outline" size={64} color={theme.subText} />
                <Text style={{ color: theme.subText, marginTop: 10 }}>No downloads yet.</Text>
            </View>
        }
        renderItem={({ item }) => {
            const isExpanded = expandedAnime[String(item.anime.id)];
            return (
                <View style={[styles.animeCard, { backgroundColor: theme.card }]}>
                    <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(String(item.anime.id))}>
                        <Image source={{ uri: item.anime.image }} style={styles.poster} />
                        <View style={{ flex: 1, paddingHorizontal: 12 }}>
                            <Text style={[styles.animeTitle, { color: theme.text }]} numberOfLines={2}>{item.anime.title}</Text>
                            <Text style={{ color: theme.tint, fontSize: 12, marginTop: 4 }}>{item.episodes.length} Episodes</Text>
                        </View>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.subText} />
                    </TouchableOpacity>

                    {isExpanded && (
                        <View style={[styles.episodesContainer, { borderTopColor: theme.border }]}>
                            {item.episodes.map((ep: DownloadItem) => {
                                const epIdStr = String(ep.episodeId);
                                const isDownloadingItem = isDownloading(epIdStr);
                                const progress = downloadProgress[epIdStr] || 0;

                                return (
                                    <View key={ep.episodeId} style={styles.episodeRow}>
                                        <TouchableOpacity style={{ flex: 1 }} onPress={() => playLocal(ep)}>
                                            {/* ✅ ADDED EPISODE NUMBER DISPLAY */}
                                            <Text style={[styles.epTitle, { color: theme.text }]} numberOfLines={1}>
                                                <Text style={{color: theme.tint, fontWeight:'700'}}>Ep {ep.number}</Text> • {ep.title}
                                            </Text>
                                            
                                            {isDownloadingItem ? (
                                                <View style={{ marginTop: 4 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                                        <Text style={{ fontSize: 10, color: theme.tint }}>Downloading...</Text>
                                                        <Text style={{ fontSize: 10, color: theme.tint }}>{Math.round(progress * 100)}%</Text>
                                                    </View>
                                                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                                                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: theme.tint }]} />
                                                    </View>
                                                </View>
                                            ) : (
                                                <Text style={{ color: theme.subText, fontSize: 11 }}>Play Offline</Text>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => handleDelete(ep)} style={{ padding: 8 }}>
                                            <Ionicons name="trash-outline" size={18} color="#FF4444" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  animeCard: { marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  poster: { width: 50, height: 70, borderRadius: 6, backgroundColor: '#eee' },
  animeTitle: { fontSize: 16, fontWeight: 'bold' },
  episodesContainer: { borderTopWidth: 1, paddingVertical: 5 },
  episodeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  epTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  progressBarBg: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
});