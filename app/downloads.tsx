import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DownloadItem, getDownloads, removeDownload } from '../services/downloadService';

export default function DownloadsScreen() {
  const [groupedDownloads, setGroupedDownloads] = useState<any[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [])
  );

  const loadDownloads = async () => {
    const data = await getDownloads();
    groupData(data);
  };

  const groupData = (data: DownloadItem[]) => {
    const groups: any = {};
    
    data.forEach(item => {
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

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Download", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            const updated = await removeDownload(id);
            groupData(updated); 
        }}
    ]);
  };

  const renderGroup = ({ item }: { item: any }) => (
    <View style={styles.animeBlock}>
      
      {/* 1. Header: Play First Episode by default */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => router.push(`/anime/${item.mal_id}`)}
      >
        <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
        <View style={styles.headerInfo}>
            <Text numberOfLines={1} style={styles.animeTitle}>{item.title}</Text>
            <Text style={styles.epCount}>{item.episodes.length} Episodes Downloaded</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>

      {/* 2. List of Episodes */}
      <View style={styles.episodesContainer}>
        {item.episodes.map((ep: DownloadItem, index: number) => (
            <View key={ep.id} style={[
                styles.episodeRow, 
                index !== item.episodes.length - 1 && styles.borderBottom 
            ]}>
                {/* ✅ UPDATED: Make text area clickable to play specific episode */}
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  onPress={() => router.push(`/anime/${item.mal_id}?episodeId=${ep.episodeId}`)}
                >
                    <Text style={styles.epTitle}>{ep.episode}</Text>
                    <Text style={styles.epSize}>{ep.size}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => handleDelete(ep.id)} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
            </View>
        ))}
      </View>

    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
          headerTitle: 'Downloads', 
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: 'white',
          headerBackTitle: '', 
      }} />

      {groupedDownloads.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons name="download-outline" size={80} color="#333" />
            <Text style={styles.emptyText}>No downloads yet.</Text>
            <Text style={styles.subText}>Go download some episodes!</Text>
        </View>
      ) : (
        <FlatList
          data={groupedDownloads}
          keyExtractor={(item) => item.mal_id.toString()}
          renderItem={renderGroup}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  animeBlock: { backgroundColor: '#1E1E1E', borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', padding: 12, alignItems: 'center', backgroundColor: '#252525' },
  poster: { width: 50, height: 70, borderRadius: 4, backgroundColor: '#333' },
  headerInfo: { flex: 1, marginLeft: 12 },
  animeTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  epCount: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  episodesContainer: { paddingHorizontal: 12 },
  episodeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#333' },
  epTitle: { color: '#ddd', fontSize: 14, fontWeight: '500' },
  epSize: { color: 'gray', fontSize: 12, marginTop: 2 },
  trashBtn: { padding: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  subText: { color: 'gray', marginTop: 10 },
});