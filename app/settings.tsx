import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { clearHistory } from '../services/historyService';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleClearHistory = async () => {
      Alert.alert(
          "Clear History",
          "Are you sure you want to delete your watch history?",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                      await clearHistory();
                      Alert.alert("Success", "History cleared.");
                  } 
              }
          ]
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.tint }]}>APPEARANCE</Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="moon-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
                </View>
                <Switch 
                    value={isDark} 
                    onValueChange={toggleTheme} 
                    trackColor={{ false: '#767577', true: theme.tint }}
                    thumbColor={'white'}
                />
            </View>
        </View>

        {/* Notifications Section */}
        <Text style={[styles.sectionTitle, { color: theme.tint, marginTop: 25 }]}>NOTIFICATIONS</Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="notifications-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Push Notifications</Text>
                </View>
                <Switch 
                    value={notificationsEnabled} 
                    onValueChange={setNotificationsEnabled} 
                    trackColor={{ false: '#767577', true: theme.tint }}
                    thumbColor={'white'}
                />
            </View>
        </View>

        {/* Data & Storage Section */}
        <Text style={[styles.sectionTitle, { color: theme.tint, marginTop: 25 }]}>DATA & STORAGE</Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            
            <TouchableOpacity style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]} onPress={() => router.push('/downloads')}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="download-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Manage Downloads</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={handleClearHistory}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Clear Watch History</Text>
                </View>
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
        </View>

        {/* About Section */}
        <Text style={[styles.sectionTitle, { color: theme.tint, marginTop: 25 }]}>ABOUT</Text>
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="information-circle-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Version</Text>
                </View>
                <Text style={{ color: theme.subText }}>1.0.0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="document-text-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Terms of Service</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
            </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  section: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 16, fontWeight: '500' }
});