import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 1. Header / Avatar */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
             <Image 
                source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
                style={styles.avatar} 
             />
             <View style={styles.rankBadge}>
                 <Text style={styles.rankText}>JONIN</Text>
             </View>
          </View>
          <Text style={styles.username}>@OtakuKing</Text>
          <Text style={styles.bio}>Just a guy looking for the One Piece.</Text>
        </View>

        {/* 2. Stats Row */}
        <View style={styles.statsRow}>
            <View style={styles.statItem}>
                <Text style={styles.statNum}>142</Text>
                <Text style={styles.statLabel}>Watched</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <Text style={styles.statNum}>58</Text>
                <Text style={styles.statLabel}>Read</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statItem}>
                <Text style={styles.statNum}>1.2k</Text>
                <Text style={styles.statLabel}>Followers</Text>
            </View>
        </View>

        {/* 3. Menu Options */}
        <View style={styles.menuContainer}>
            <MenuItem icon="settings-outline" label="Settings" />
            <MenuItem icon="download-outline" label="Downloads" />
            <MenuItem icon="notifications-outline" label="Notifications" />
            <MenuItem icon="help-circle-outline" label="Help & Support" />
            
            {/* Logout - Red Color */}
            <TouchableOpacity style={styles.menuItem}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                    <Ionicons name="log-out-outline" size={22} color={Colors.dark.tint} />
                </View>
                <Text style={[styles.menuLabel, { color: Colors.dark.tint }]}>Log Out</Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
            </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Component for Menu Items
function MenuItem({ icon, label }: { icon: any, label: string }) {
    return (
        <TouchableOpacity style={styles.menuItem}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={22} color="white" />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#333" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  profileHeader: { alignItems: 'center', marginTop: 20 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.dark.tint },
  rankBadge: { 
    position: 'absolute', bottom: 0, right: 0, 
    backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
    borderWidth: 2, borderColor: '#121212'
  },
  rankText: { fontSize: 10, fontWeight: 'bold', color: 'black' },
  username: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  bio: { color: 'gray', marginTop: 4 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 30, backgroundColor: '#1E1E1E', paddingVertical: 20, marginHorizontal: 20, borderRadius: 16 },
  statItem: { alignItems: 'center' },
  statNum: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: 'gray', fontSize: 12 },
  divider: { width: 1, backgroundColor: '#333' },

  menuContainer: { marginTop: 30, paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuLabel: { flex: 1, color: 'white', fontSize: 16, fontWeight: '500' },
});