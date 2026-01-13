import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MangaGrid from '../../components/MangaGrid';
import { useTheme } from '../../context/ThemeContext';

export default function ComicScreen() {
  const [activeTab, setActiveTab] = useState('Library'); 
  const { theme } = useTheme();
  
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Manga</Text>
        
        <View style={[styles.switchContainer, { backgroundColor: theme.border }]}>
          <TouchableOpacity 
            style={[styles.switchBtn, activeTab === 'Library' && { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('Library')}
          >
            <Text style={[styles.switchText, { color: activeTab === 'Library' ? theme.text : theme.subText }]}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.switchBtn, activeTab === 'Discover' && { backgroundColor: theme.card }]}
            onPress={() => setActiveTab('Discover')}
          >
            <Text style={[styles.switchText, { color: activeTab === 'Discover' ? theme.text : theme.subText }]}>Discover</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'Library' ? (
            // ✅ NO ScrollView here. Pass props to MangaGrid instead.
            <MangaGrid 
                theme={theme} 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
            />
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
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 15 },
  
  switchContainer: { flexDirection: 'row', borderRadius: 10, padding: 4 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  switchText: { fontWeight: '600' },

  content: { flex: 1, marginTop: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});