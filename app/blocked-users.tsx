import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { arrayRemove, doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    if (!currentUser) return;
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const blockedIds = userDoc.data()?.blockedUsers || [];

        if (blockedIds.length === 0) {
            setBlockedUsers([]);
            setLoading(false);
            return;
        }

        const usersData = await Promise.all(blockedIds.map(async (id: string) => {
            const uSnap = await getDoc(doc(db, 'users', id));
            return uSnap.exists() ? { id: uSnap.id, ...uSnap.data() } : null;
        }));

        setBlockedUsers(usersData.filter(u => u !== null));
    } catch (error) {
        console.error("Error fetching blocked users:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleUnblock = async (userId: string) => {
      if (!currentUser) return;
      Alert.alert("Unblock User", "Are you sure you want to unblock this user?", [
          { text: "Cancel", style: "cancel" },
          { 
              text: "Unblock", 
              onPress: async () => {
                  try {
                      const myRef = doc(db, 'users', currentUser.uid);
                      await updateDoc(myRef, {
                          blockedUsers: arrayRemove(userId)
                      });
                      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
                      Alert.alert("Success", "User unblocked.");
                  } catch (error) {
                      Alert.alert("Error", "Could not unblock user.");
                  }
              }
          }
      ]);
  };

  const renderItem = ({ item }: { item: any }) => (
      <View style={[styles.userCard, { backgroundColor: theme.card }]}>
          <Image source={{ uri: item.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime' }} style={styles.avatar} />
          <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={[styles.name, { color: theme.text }]}>{item.displayName || "Unknown"}</Text>
              <Text style={[styles.username, { color: theme.subText }]}>@{item.username || "user"}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.unblockBtn, { borderColor: theme.border }]} 
            onPress={() => handleUnblock(item.id)}
          >
              <Text style={{ color: theme.text, fontSize: 12, fontWeight: 'bold' }}>Unblock</Text>
          </TouchableOpacity>
      </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Blocked Users</Text>
      </View>

      {loading ? (
          <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.tint} />
          </View>
      ) : (
          <FlatList
              data={blockedUsers}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={renderItem}
              ListEmptyComponent={
                  <View style={styles.center}>
                      <Ionicons name="shield-checkmark-outline" size={60} color={theme.subText} />
                      <Text style={{ color: theme.subText, marginTop: 10 }}>No blocked users.</Text>
                  </View>
              }
          />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  name: { fontSize: 16, fontWeight: 'bold' },
  username: { fontSize: 14 },
  unblockBtn: { borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }
});