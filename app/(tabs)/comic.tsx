import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MangaGrid from '../../components/MangaGrid';
import { useTheme } from '../../context/ThemeContext'; // ✅ Import Theme

export default function ComicScreen() {
  const [activeTab, setActiveTab] = useState('Library'); 
  const { theme } = useTheme(); // ✅ Get Theme

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 1. Header with Tab Switcher */}
      <View style={styles.header}>
        {/* Dynamic Title Color */}
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manga</Text>
        
        {/* Dynamic Switcher Container */}
        <View style={[styles.switchContainer, { backgroundColor: theme.border }]}>
          <TouchableOpacity 
            style={[
                styles.switchBtn, 
                activeTab === 'Library' && { backgroundColor: theme.card } // Active Tab Color
            ]}
            onPress={() => setActiveTab('Library')}
          >
            <Text style={[
                styles.switchText, 
                { color: activeTab === 'Library' ? theme.text : theme.subText }
            ]}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
                styles.switchBtn, 
                activeTab === 'Discover' && { backgroundColor: theme.card }
            ]}
            onPress={() => setActiveTab('Discover')}
          >
            <Text style={[
                styles.switchText, 
                { color: activeTab === 'Discover' ? theme.text : theme.subText }
            ]}>Discover</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. The Content Grid */}
      <View style={styles.content}>
        {activeTab === 'Library' ? (
            // Pass theme to MangaGrid
            <MangaGrid theme={theme} />
        ) : (
            <View style={styles.center}>
                <Text style={{color: theme.subText}}>Search New Manga (Coming Soon)</Text>
            </View>
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Removed hardcoded BG
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  
  switchContainer: { flexDirection: 'row', borderRadius: 10, padding: 4 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  // activeBtn style removed in favor of dynamic inline style
  switchText: { fontWeight: '600' },

  content: { flex: 1, marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});