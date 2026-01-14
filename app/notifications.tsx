import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { AppNotification, addNewDropNotification, getNotifications, markAllAsRead } from '../services/notificationService';

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const data = await getNotifications();
    setNotifications(data);
    
    // Mark as read when opening screen (Optional logic)
    // await markAllAsRead(); 
  };

  const handleRefresh = async () => {
      setRefreshing(true);
      await loadData();
      setRefreshing(false);
  };

  const handleMarkRead = async () => {
      const updated = await markAllAsRead();
      setNotifications(updated);
  };

  // 👇 FOR TESTING: Button to simulate a new drop!
  const simulateNewDrop = async () => {
      await addNewDropNotification("New Episode Alert! 🚨", "Demon Slayer Ep 5 just dropped!", "anime");
      loadData();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
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
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.tint} />}
        ListHeaderComponent={
            <TouchableOpacity 
                onPress={simulateNewDrop} 
                style={{ padding: 10, backgroundColor: theme.card, marginBottom: 15, borderRadius: 8, alignItems: 'center' }}
            >
                <Text style={{ color: theme.tint, fontWeight: 'bold' }}>⚡ TAP TO SIMULATE NEW DROP</Text>
            </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.subText} />
            <Text style={[styles.emptyText, { color: theme.subText }]}>No notifications yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[
              styles.card, 
              { backgroundColor: theme.card, borderLeftColor: item.read ? 'transparent' : theme.tint }
          ]}>
            <View style={[styles.iconBox, { backgroundColor: item.type === 'anime' ? '#FF6B6B20' : '#4ECDC420' }]}>
                <Ionicons 
                    name={item.type === 'anime' ? 'play-circle' : 'book'} 
                    size={24} 
                    color={item.type === 'anime' ? '#FF6B6B' : '#4ECDC4'} 
                />
            </View>
            <View style={styles.info}>
              <Text style={[styles.title, { color: theme.text, fontWeight: item.read ? 'normal' : 'bold' }]}>
                  {item.title}
              </Text>
              <Text style={[styles.body, { color: theme.subText }]}>{item.body}</Text>
              <Text style={[styles.date, { color: theme.subText }]}>
                  {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString()}
              </Text>
            </View>
            {!item.read && <View style={[styles.dot, { backgroundColor: theme.tint }]} />}
          </View>
        )}
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