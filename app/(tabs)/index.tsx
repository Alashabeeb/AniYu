import { useFocusEffect } from 'expo-router'; // IMPORTANT: New Import for auto-refresh
import React, { useCallback, useEffect, useState } from 'react'; // Added useCallback
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
// ✅ FIX: Import SafeAreaView from the context library
import { SafeAreaView } from 'react-native-safe-area-context';

import HeroCarousel from '../../components/HeroCarousel';
import TrendingRail from '../../components/TrendingRail';
import { getTopAnime } from '../../services/animeService';
import { getContinueWatching, HistoryItem } from '../../services/historyService'; // Import History

export default function HomeScreen() {
  const [trending, setTrending] = useState<any[]>([]);
  const [continueWatching, setContinueWatching] = useState<HistoryItem[]>([]); // New State
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // REFRESH HISTORY whenever user comes back to this screen
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const history = await getContinueWatching();
    setContinueWatching(history);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTopAnime();
      setTrending(data);
      await loadHistory(); // Load history initially too
    } catch (error) {
      console.error("Failed to load anime:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    // ✅ FIX: Changed View to SafeAreaView and added edges=['top']
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 1. Hero Section */}
        <HeroCarousel data={trending.slice(0, 5)} />

        {/* 2. Trending Section */}
        <TrendingRail title="Trending Now" data={trending} />

        {/* 3. Recommended Section */}
        <TrendingRail title="Recommended for You" data={trending.slice(5)} />

        {/* 4. NEW: Continue Watching Section */}
        {continueWatching.length > 0 && (
            <TrendingRail title="Continue Watching" data={continueWatching} />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ FIX: Removed flex: 1 here if you want scrolling to feel native, 
  // but keeping it is fine as long as SafeAreaView wraps it.
  container: { flex: 1, backgroundColor: '#121212' },
  loadingContainer: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center' },
});