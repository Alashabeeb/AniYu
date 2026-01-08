import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext'; // ✅ Theme
import { DownloadItem, getDownloads, removeDownload } from '../services/downloadService';

export default function DownloadsScreen() {
  const [groupedDownloads, setGroupedDownloads] = useState<any[]>([]);
  const router = useRouter();
  const { theme } = useTheme(); // ✅ Use Theme

  useFocusEffect(useCallback(() => { loadDownloads(); }, []));

  const loadDownloads = async () => {
    const data = await getDownloads();
    groupData(data);
  };

  const groupData = (data: DownloadItem[]) => {
    const groups: any = {};
    data.forEach(item => {
      if (!groups[item.mal_id]) {
        groups[item.mal_id] = { mal_id: item.mal_id, title: item.title, image: item.image, episodes: [] };
      }
      groups[item.mal_id].episodes.push(item);
    });
    setGroupedDownloads(Object.values(groups));
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            const updated = await removeDownload(id);
            groupData(updated); 
        }}
    ]);
  };

  const renderGroup = ({ item }: { item: any }) => (
    <View style={[styles.animeBlock, { backgroundColor: theme.card }]}>
      <TouchableOpacity style={[styles.header, { backgroundColor: theme.border }]} onPress={() => router.push(`/anime/${item.mal_id}`)}>
        <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
        <View style={styles.headerInfo}>
            <Text numberOfLines={1} style={[styles.animeTitle, { color: theme.text }]}>{item.title}</Text>
            <Text style={{ color: theme.tint, fontSize: 12 }}>{item.episodes.length} Episodes</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.subText} />
      </TouchableOpacity>

      <View style={styles.episodesContainer}>
        {item.episodes.map((ep: DownloadItem, index: number) => (
            <View key={ep.id} style={[styles.episodeRow, index !== item.episodes.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push(`/anime/${item.mal_id}?episodeId=${ep.episodeId}`)}>
                    <Text style={{ color: theme.text, fontSize: 14 }}>{ep.episode}</Text>
                    <Text style={{ color: theme.subText, fontSize: 12 }}>{ep.size}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(ep.id)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={20} color={theme.tint} />
                </TouchableOpacity>
            </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ 
          headerTitle: 'Downloads', 
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerBackTitle: '', 
      }} />

      {groupedDownloads.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons name="download-outline" size={80} color={theme.subText} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No downloads yet.</Text>
        </View>
      ) : (
        <FlatList data={groupedDownloads} keyExtractor={(item) => item.mal_id.toString()} renderItem={renderGroup} contentContainerStyle={{ padding: 20 }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  animeBlock: { borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  poster: { width: 50, height: 70, borderRadius: 4, backgroundColor: '#333' },
  headerInfo: { flex: 1, marginLeft: 12 },
  animeTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  episodesContainer: { paddingHorizontal: 12 },
  episodeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
});