import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
// ✅ ADDED: Firestore updateDoc
import { useFocusEffect } from '@react-navigation/native';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
// ✅ ADDED: markLocalNotificationAsRead
import { AppNotification, getNotifications, markAllAsRead, markLocalNotificationAsRead } from '../services/notificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  const [localNotifs, setLocalNotifs] = useState<AppNotification[]>([]);
  const [socialNotifs, setSocialNotifs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Fetch Local Notifications (Drops)
  useFocusEffect(
    useCallback(() => {
      loadLocalData();
    }, [])
  );

  const loadLocalData = async () => {
    const data = await getNotifications();
    setLocalNotifs(data);
  };

  // 2. Fetch Social Notifications (Interactions)
  useEffect(() => {
      if (!currentUser) return;
      const q = query(
          collection(db, 'users', currentUser.uid, 'notifications'),
          orderBy('createdAt', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSocialNotifs(data);
      });
      return unsubscribe;
  }, []);

  const handleRefresh = async () => {
      setRefreshing(true);
      await loadLocalData();
      setRefreshing(false);
  };

  const handleMarkRead = async () => {
      await markAllAsRead();
      loadLocalData();
  };

  const combinedNotifications = [...socialNotifs, ...localNotifs].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : a.date;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : b.date;
      return timeB - timeA;
  });

  const getIcon = (type: string) => {
      switch(type) {
          case 'like': return { name: 'heart', color: '#FF6B6B' };
          case 'comment': return { name: 'chatbubble', color: '#4ECDC4' };
          case 'repost': return { name: 'repeat', color: '#45B7D1' };
          case 'follow': return { name: 'person-add', color: '#FFD700' };
          default: return { name: 'notifications', color: theme.tint };
      }
  };

  // ✅ UPDATED HANDLE PRESS
  const handlePress = async (item: any) => {
      if (!currentUser) return;

      // 1. Mark as Read Logic
      if (!item.read) {
          try {
              if (item.createdAt) {
                  // It's a Social Notif (Firestore)
                  await updateDoc(doc(db, 'users', currentUser.uid, 'notifications', item.id), {
                      read: true
                  });
              } else {
                  // It's a Local Notif (AsyncStorage)
                  await markLocalNotificationAsRead(item.id);
                  loadLocalData();
              }
          } catch (e) {
              console.log("Error marking read:", e);
          }
      }

      // 2. Navigation Logic
      if (item.targetId && (item.type === 'like' || item.type === 'comment' || item.type === 'repost')) {
          router.push({ pathname: '/post-details', params: { postId: item.targetId } });
      }
      else if (item.actorId && item.type === 'follow') {
          router.push({ pathname: '/feed-profile', params: { userId: item.actorId } });
      }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        <TouchableOpacity onPress={handleMarkRead} style={{ marginLeft: 'auto' }}>
            <Ionicons name="checkmark-done-outline" size={24} color={theme.tint} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={combinedNotifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.tint} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.subText} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
            const iconData = getIcon(item.type);
            return (
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handlePress(item)}
                style={[
                  styles.card, 
                  { backgroundColor: theme.card, borderLeftColor: item.read ? 'transparent' : theme.tint }
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${iconData.color}20` }]}>
                    <Ionicons name={iconData.name as any} size={24} color={iconData.color} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.title, { color: theme.text, fontWeight: item.read ? 'normal' : 'bold' }]}>
                      {item.title}
                  </Text>
                  <Text style={[styles.body, { color: theme.subText }]}>{item.body}</Text>
                  <Text style={[styles.date, { color: theme.subText }]}>
                    {item.createdAt?.seconds 
                        ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() 
                        : new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
                {!item.read && <View style={[styles.dot, { backgroundColor: theme.tint }]} />}
              </TouchableOpacity>
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
  
  card: { flexDirection: 'row', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, alignItems: 'center' },
  iconBox: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  info: { flex: 1 },
  title: { fontSize: 16, marginBottom: 4 },
  body: { fontSize: 14, marginBottom: 6 },
  date: { fontSize: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 10 }
});