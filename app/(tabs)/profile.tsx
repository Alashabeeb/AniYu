import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

import TrendingRail from '../../components/TrendingRail';
import { getFavorites } from '../../services/favoritesService';

// 👇 1. Import Firebase functions
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme(); 
  const [favorites, setFavorites] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => { loadProfileData(); }, [])
  );

  const loadProfileData = async () => {
    const favs = await getFavorites();
    setFavorites(favs);
  };

  // 👇 2. The Function to upload dummy data
  const addAnimeToDatabase = async () => {
    const animeList = [
      {
        title: "One Piece",
        image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg",
        synopsis: "Gol D. Roger was known as the 'Pirate King', the strongest and most infamous being to have sailed the Grand Line. The capture and death of Roger by the World Government brought a change to the world.",
        score: 9.2,
        year: 1999,
        type: "TV",
        episodes: 1000,
        popularity: 1
      },
      {
        title: "Attack on Titan",
        image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg",
        synopsis: "Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called titans, forcing humans to hide in fear behind enormous concentric walls.",
        score: 9.0,
        year: 2013,
        type: "TV",
        episodes: 25,
        popularity: 2
      },
      {
        title: "Jujutsu Kaisen",
        image: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg",
        synopsis: "Idly indulging in baseless paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days at either the clubroom or the hospital, where he visits his bedridden grandfather.",
        score: 8.7,
        year: 2020,
        type: "TV",
        episodes: 24,
        popularity: 3
      },
      {
        title: "Demon Slayer",
        image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
        synopsis: "Ever since the death of his father, the burden of supporting the family has fallen upon Tanjirou Kamado's shoulders.",
        score: 8.9,
        year: 2019,
        type: "TV",
        episodes: 26,
        popularity: 4
      }
    ];

    try {
      for (const anime of animeList) {
        await addDoc(collection(db, 'anime'), anime);
      }
      Alert.alert("Success!", "Anime added to database. Restart the app to see them!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
             <Image source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} style={[styles.avatar, { borderColor: theme.tint }]} />
             <View style={[styles.rankBadge, { borderColor: theme.background }]}>
                 <Text style={styles.rankText}>JONIN</Text>
             </View>
          </View>
          <Text style={[styles.username, { color: theme.text }]}>@OtakuKing</Text>
          <Text style={[styles.bio, { color: theme.subText }]}>Just a guy looking for the One Piece.</Text>
        </View>

        {/* 👇 3. Temporary Admin Button */}
        <TouchableOpacity 
            onPress={addAnimeToDatabase} 
            style={{ backgroundColor: '#FF6B6B', padding: 15, marginHorizontal: 20, marginTop: 20, borderRadius: 12 }}
        >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                ADMIN: Upload Anime Data
            </Text>
        </TouchableOpacity>

        <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
            <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.text }]}>142</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Watched</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.text }]}>{favorites.length}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Favorites</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.text }]}>1.2k</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Followers</Text>
            </View>
        </View>

        <View style={{ marginTop: 20 }}>
            {favorites.length > 0 && (
                <TrendingRail title="My Favorites ❤️" data={favorites} />
            )}
        </View>

        <View style={styles.menuContainer}>
            <MenuItem icon="settings-outline" label="Settings" theme={theme} onPress={() => router.push('/settings')} isLink />
            <MenuItem icon="download-outline" label="Downloads" theme={theme} onPress={() => router.push('/downloads')} isLink />
            <MenuItem icon="notifications-outline" label="Notifications" theme={theme} />
            <MenuItem icon="help-circle-outline" label="Help & Support" theme={theme} />
            
            <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                    <Ionicons name="log-out-outline" size={22} color={theme.tint} />
                </View>
                <Text style={[styles.menuLabel, { color: theme.tint }]}>Log Out</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, theme, onPress, isLink }: any) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.iconBox, { backgroundColor: theme.card }]}>
                <Ionicons name={icon} size={22} color={theme.text} />
            </View>
            <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.subText} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: 'center', marginTop: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  rankBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 2 },
  rankText: { fontSize: 10, fontWeight: 'bold', color: 'black' },
  username: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  bio: { marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 30, paddingVertical: 20, marginHorizontal: 20, borderRadius: 16 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  divider: { width: 1 },
  menuContainer: { marginTop: 30, paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
});