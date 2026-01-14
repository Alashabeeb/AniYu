import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function UserListScreen() {
  const { type, userId } = useLocalSearchParams(); // type = 'following' or 'followers'
  const router = useRouter();
  const { theme } = useTheme();
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
        const targetId = (userId as string) || auth.currentUser?.uid;
        if (!targetId) return;

        // 1. Get the list of IDs (following or followers)
        const userDoc = await getDoc(doc(db, "users", targetId));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        const ids = type === 'following' ? userData.following : userData.followers;

        if (!ids || ids.length === 0) {
            setLoading(false);
            return;
        }

        // 2. Fetch profile data for each ID
        // (Firestore "in" query is limited to 10, so we fetch individually for now)
        const userPromises = ids.map((id: string) => getDoc(doc(db, "users", id)));
        const userSnaps = await Promise.all(userPromises);

        const loadedUsers = userSnaps
            .filter(snap => snap.exists())
            .map(snap => ({ id: snap.id, ...snap.data() }));

        setUsers(loadedUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
            {type === 'following' ? 'Following' : 'Followers'}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={theme.tint} />
      ) : (
        <FlatList
            data={users}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
                <Text style={{ textAlign: 'center', marginTop: 50, color: theme.subText }}>
                    No users found.
                </Text>
            }
            renderItem={({ item }) => (
                <TouchableOpacity 
                    style={[styles.userCard, { backgroundColor: theme.card }]}
                    onPress={() => router.push({ pathname: '/feed-profile', params: { userId: item.id } })}
                >
                    <Image 
                        source={{ uri: item.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime' }} 
                        style={styles.avatar} 
                    />
                    <View style={styles.info}>
                        <Text style={[styles.name, { color: theme.text }]}>{item.displayName || 'User'}</Text>
                        <Text style={[styles.username, { color: theme.subText }]}>@{item.username}</Text>
                    </View>
                    
                    {/* Rank Badge */}
                    <View style={[styles.badge, { backgroundColor: theme.tint }]}>
                        <Text style={styles.badgeText}>{item.rank || 'GENIN'}</Text>
                    </View>
                </TouchableOpacity>
            )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', textTransform: 'capitalize' },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold' },
  username: { fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' }
});