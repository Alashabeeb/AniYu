import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

import TrendingRail from '../../components/TrendingRail';
import { getFavorites } from '../../services/favoritesService';

export default function ProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null); 
  const [refreshing, setRefreshing] = useState(false);

  // Load data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => { 
        loadProfileData(); 
    }, [])
  );

  const loadProfileData = async () => {
    setRefreshing(true);
    try {
        const favs = await getFavorites();
        setFavorites(favs);

        const user = auth.currentUser;
        if (user) {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setUserData(docSnap.data());
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  const followingCount = userData?.following?.length || 0;
  const followersCount = userData?.followers?.length || 0;
  
  // ✅ FIXED: Default is now GENIN. 
  // NOTE: If your DB already has "ACADEMY STUDENT" saved, you must watch 1 video to force an update.
  const userRank = userData?.rank || "GENIN";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadProfileData} tintColor={theme.tint} />}
      >
        
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
             <Image 
                source={{ uri: userData?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
                style={[styles.avatar, { borderColor: theme.tint }]} 
             />
             {/* Dynamic Rank Badge */}
             <View style={[styles.rankBadge, { borderColor: theme.background, backgroundColor: '#FFD700' }]}>
                 <Text style={styles.rankText}>{userRank}</Text>
             </View>
          </View>
          
          <Text style={[styles.displayName, { color: theme.text }]}>
            {userData?.displayName || "New User"}
          </Text>
          <Text style={[styles.username, { color: theme.subText }]}>
            @{userData?.username || "username"}
          </Text>
          
          <Text style={[styles.bio, { color: theme.subText }]}>
            {userData?.bio || "No bio yet."}
          </Text>

          <TouchableOpacity 
            style={[styles.editBtn, { borderColor: theme.border }]}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={{ color: theme.text, fontWeight: '600' }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: theme.card }]}>
            <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.text }]}>{followingCount}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Following</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.text }]}>{favorites.length}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Favorites</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: theme.text }]}>{followersCount}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Followers</Text>
            </View>
        </View>

        <View style={{ marginTop: 20 }}>
            {favorites.length > 0 && (
                <TrendingRail title="My Favorites ❤️" data={favorites} />
            )}
        </View>

        {/* Menu */}
        <View style={styles.menuContainer}>
            <MenuItem icon="settings-outline" label="Settings" theme={theme} onPress={() => router.push('/settings')} isLink />
            <MenuItem icon="download-outline" label="Downloads" theme={theme} onPress={() => router.push('/downloads')} isLink />
            <MenuItem icon="notifications-outline" label="Notifications" theme={theme} />
            <MenuItem icon="help-circle-outline" label="Help & Support" theme={theme} />
            
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
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

function MenuItem({ icon, label, theme, onPress }: any) {
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
  rankBadge: { 
      position: 'absolute', 
      bottom: 0, 
      right: 0, 
      paddingHorizontal: 8, 
      paddingVertical: 2, 
      borderRadius: 10, 
      borderWidth: 2,
      minWidth: 50,
      alignItems: 'center'
  },
  rankText: { fontSize: 10, fontWeight: 'bold', color: 'black' },
  displayName: { fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  username: { fontSize: 14, marginTop: 2 },
  bio: { marginTop: 8, textAlign: 'center', paddingHorizontal: 40, fontSize: 13, lineHeight: 18 },
  editBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 25, paddingVertical: 20, marginHorizontal: 20, borderRadius: 16 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  divider: { width: 1 },
  menuContainer: { marginTop: 30, paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
});