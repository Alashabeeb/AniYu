import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DownloadItem, getDownloads, removeDownload } from '../services/downloadService';

export default function DownloadsScreen() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
    }, [])
  );

  const loadDownloads = async () => {
    const data = await getDownloads();
    setDownloads(data);
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Download", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            const updated = await removeDownload(id);
            setDownloads(updated);
        }}
    ]);
  };

  const renderItem = ({ item }: { item: DownloadItem }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardContent}
        onPress={() => router.push(`/anime/${item.mal_id}`)}
      >
        <Image source={{ uri: item.image }} style={styles.poster} contentFit="cover" />
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
          <Text style={styles.episode}>{item.episode}</Text>
          <Text style={styles.size}>Downloaded • {item.size}</Text>
        </View>
      </TouchableOpacity>
      
      {/* Delete Button */}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
         <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
          headerTitle: 'Downloads', 
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: 'white',
          headerBackTitleVisible: false,
      }} />

      {downloads.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons name="download-outline" size={80} color="#333" />
            <Text style={styles.emptyText}>No downloads yet.</Text>
            <Text style={styles.subText}>Go download some episodes!</Text>
        </View>
      ) : (
        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  card: { flexDirection: 'row', backgroundColor: '#1E1E1E', borderRadius: 12, marginBottom: 15, overflow: 'hidden', alignItems: 'center' },
  cardContent: { flex: 1, flexDirection: 'row' },
  poster: { width: 80, height: 110, backgroundColor: '#333' },
  info: { flex: 1, padding: 12, justifyContent: 'center' },
  title: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  episode: { color: '#FFD700', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  size: { color: 'gray', fontSize: 12 },
  deleteBtn: { padding: 15, height: '100%', justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#333' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  subText: { color: 'gray', marginTop: 10 },
});