import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { DownloadItem, getDownloads, removeDownload } from '../services/downloadService';

// Enable LayoutAnimation for Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface GroupedDownload {
  mal_id: number;
  title: string;
  image: string;
  episodes: DownloadItem[];
}

export default function DownloadsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [groupedDownloads, setGroupedDownloads] = useState<GroupedDownload[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [])
  );

  const loadDownloads = async () => {
    setLoading(true);
    const data = await getDownloads();
    processGroups(data);
    setLoading(false);
  };

  const processGroups = (data: DownloadItem[]) => {
    const groups: { [key: number]: GroupedDownload } = {};
    
    data.forEach((item) => {
        if (!groups[item.mal_id]) {
            groups[item.mal_id] = {
                mal_id: item.mal_id,
                title: item.title,
                image: item.image,
                episodes: []
            };
        }
        groups[item.mal_id].episodes.push(item);
    });

    setGroupedDownloads(Object.values(groups));
  };

  const handleDelete = async (mal_id: number, episodeId: number) => {
    const updated = await removeDownload(mal_id, episodeId);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    processGroups(updated);
  };

  const handlePlay = (item: DownloadItem) => {
      router.push({
          pathname: '/anime/[id]',
          params: { id: item.mal_id, episodeId: item.episodeId }
      });
  };

  const toggleExpand = (id: number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Downloads</Text>
      </View>

      <FlatList
        data={groupedDownloads}
        keyExtractor={(item) => String(item.mal_id)}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="download-outline" size={64} color={theme.subText} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>No downloads yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
            const isExpanded = expandedId === item.mal_id;
            
            return (
                <View style={[styles.groupCard, { backgroundColor: theme.card }]}>
                    {/* Anime Series Header (Tap to Expand) */}
                    <TouchableOpacity 
                        style={styles.groupHeader} 
                        onPress={() => toggleExpand(item.mal_id)}
                        activeOpacity={0.7}
                    >
                        <Image 
                            source={{ uri: item.image || 'https://via.placeholder.com/100' }} 
                            style={styles.groupImage} 
                            contentFit="cover"
                        />
                        <View style={styles.groupInfo}>
                            <Text style={[styles.groupTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</Text>
                            <Text style={{ color: theme.subText, fontSize: 12 }}>
                                {item.episodes.length} Episode{item.episodes.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <Ionicons 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={20} 
                            color={theme.subText} 
                        />
                    </TouchableOpacity>

                    {/* Episodes List (Visible only when expanded) */}
                    {isExpanded && (
                        <View style={[styles.episodesList, { borderTopColor: theme.border }]}>
                            {item.episodes.map((ep) => (
                                <View key={ep.episodeId} style={[styles.episodeRow, { borderBottomColor: theme.border }]}>
                                    <TouchableOpacity 
                                        style={styles.episodeInfo} 
                                        onPress={() => handlePlay(ep)}
                                    >
                                        <Ionicons name="play-circle" size={24} color={theme.tint} style={{ marginRight: 10 }} />
                                        <Text style={[styles.episodeTitle, { color: theme.text }]} numberOfLines={1}>
                                            {ep.episode}
                                        </Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        onPress={() => handleDelete(ep.mal_id, ep.episodeId)} 
                                        style={styles.deleteBtn}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                                    </TouchableOpacity>
                                </View>
                            ))}
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 10, fontSize: 16 },
  
  // Group Styling
  groupCard: { borderRadius: 12, marginBottom: 15, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  groupImage: { width: 60, height: 60, borderRadius: 8 },
  groupInfo: { flex: 1, marginLeft: 15 },
  groupTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  
  // Episode List Styling
  episodesList: { borderTopWidth: 1 },
  episodeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  episodeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  episodeTitle: { fontSize: 14, fontWeight: '500' },
  deleteBtn: { padding: 8 }
});