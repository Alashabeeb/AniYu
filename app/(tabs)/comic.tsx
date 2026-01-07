import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MangaGrid from '../../components/MangaGrid';

export default function ComicScreen() {
  const [activeTab, setActiveTab] = useState('Library'); // 'Library' or 'Discover'

  return (
    <SafeAreaView style={styles.container}>
      
      {/* 1. Header with Tab Switcher */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manga</Text>
        
        <View style={styles.switchContainer}>
          <TouchableOpacity 
            style={[styles.switchBtn, activeTab === 'Library' && styles.activeBtn]}
            onPress={() => setActiveTab('Library')}
          >
            <Text style={[styles.switchText, activeTab === 'Library' && styles.activeText]}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.switchBtn, activeTab === 'Discover' && styles.activeBtn]}
            onPress={() => setActiveTab('Discover')}
          >
            <Text style={[styles.switchText, activeTab === 'Discover' && styles.activeText]}>Discover</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. The Content Grid */}
      <View style={styles.content}>
        {activeTab === 'Library' ? (
            <MangaGrid />
        ) : (
            // Placeholder for Discover tab
            <View style={styles.center}>
                <Text style={{color: 'gray'}}>Search New Manga (Coming Soon)</Text>
            </View>
        )}
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  
  switchContainer: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 10, padding: 4 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  activeBtn: { backgroundColor: '#3A3A3A' }, // Slightly lighter when active
  switchText: { color: 'gray', fontWeight: '600' },
  activeText: { color: 'white' },

  content: { flex: 1, marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});