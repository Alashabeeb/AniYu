import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

// Services
import {
    addAnimeReview
} from '../../services/animeService';
import {
    getMangaChapters,
    getMangaDetails,
    incrementMangaView
} from '../../services/mangaService';

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  
  const [manga, setManga] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => { 
      if (id) {
          loadData();
          checkAndIncrementView();
      } 
  }, [id]);

  const checkAndIncrementView = async () => {
      const user = auth.currentUser;
      if (!user || !id) return;
      try {
          const viewRef = doc(db, 'users', user.uid, 'viewed_manga', id as string);
          const viewSnap = await getDoc(viewRef);
          if (!viewSnap.exists()) {
              await setDoc(viewRef, { viewedAt: serverTimestamp() });
              await incrementMangaView(id as string);
          }
      } catch (e) {}
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [details, chaps] = await Promise.all([
          getMangaDetails(id as string),
          getMangaChapters(id as string)
      ]);
      setManga(details);
      setChapters(chaps);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const submitReview = async () => {
      // Reusing the review logic (you might want to separate this in services later)
      if (userRating === 0) return Alert.alert("Rate First", "Please tap the stars to rate.");
      const user = auth.currentUser;
      if (!user) return Alert.alert("Login Required", "You must be logged in to rate.");

      setSubmittingReview(true);
      const success = await addAnimeReview(id as string, user.uid, user.displayName || 'User', userRating);
      setSubmittingReview(false);

      if (success) {
          Alert.alert("Thank you!", "Your rating has been saved.");
          setModalVisible(false);
          setUserRating(0);
          loadData(); 
      }
  };

  if (loading) return <View style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  if (!manga) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerTitle: '', headerTransparent: true, headerTintColor: 'white' }} />

      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1 }}>
        
        {/* MANGA COVER HEADER */}
        <View style={styles.headerContainer}>
            <Image source={{ uri: manga.images?.jpg?.image_url }} style={styles.heroPoster} resizeMode="cover" />
            <View style={styles.headerOverlay} />
            
            <View style={styles.headerContent}>
                <Image source={{ uri: manga.images?.jpg?.image_url }} style={styles.smallPoster} />
                <View style={{flex: 1, justifyContent:'flex-end'}}>
                    <Text style={[styles.title, { color: 'white' }]}>{manga.title}</Text>
                    <Text style={{ color: '#ccc', fontSize: 13, marginTop: 4 }}>
                        {manga.year || 'N/A'} • {manga.status || 'Unknown'} • {manga.type || 'Manga'}
                    </Text>
                    <View style={{flexDirection:'row', alignItems:'center', marginTop: 5, gap: 5}}>
                        <Ionicons name="eye" size={14} color="#ccc" />
                        <Text style={{ color: '#ccc', fontSize: 13 }}>{manga.views || 0} Reads</Text>
                    </View>
                </View>
            </View>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.detailsContainer}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Synopsis</Text>
                <Text style={[styles.synopsis, { color: theme.subText }]}>{manga.synopsis}</Text>
                
                <View style={[styles.statsGrid, { backgroundColor: theme.card }]}>
                    <TouchableOpacity style={styles.statBox} onPress={() => setModalVisible(true)}>
                        <Text style={{ color: theme.subText }}>Rating</Text>
                        <Text style={[styles.val, { color: theme.text, marginTop: 4 }]}>
                            {manga.score ? `${Number(manga.score).toFixed(1)}/5` : 'N/A'}
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.statBox}>
                        <Text style={{ color: theme.subText }}>Chapters</Text>
                        <Text style={[styles.val, { color: theme.text, marginTop: 4 }]}>{manga.totalChapters || chapters.length}</Text>
                    </View>
                </View>

                {/* Genres */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 15 }}>
                    {manga.genres?.map((g: any) => (
                        <View key={g} style={{ backgroundColor: theme.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8, marginBottom: 8 }}>
                            <Text style={{ color: theme.text, fontSize: 12 }}>{g}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 20, marginBottom: 10 }]}>
                    Chapters ({chapters.length})
                </Text>
            </View>
            
            {/* CHAPTER LIST */}
            <View style={styles.chapterList}>
                {chapters.map((ch) => (
                    <TouchableOpacity 
                        key={ch.id} 
                        style={[styles.chapterCard, { backgroundColor: theme.card }]}
                        onPress={() => Alert.alert("Coming Soon", "PDF Reader not implemented yet.")}
                    >
                        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
                            <View>
                                <Text style={[styles.chapterNum, { color: theme.tint }]}>Chapter {ch.number}</Text>
                                <Text numberOfLines={1} style={[styles.chapterTitle, { color: theme.subText }]}>{ch.title}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>

        {/* Rating Modal */}
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Rate this Manga</Text>
                    <View style={styles.starRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                                <Ionicons name={userRating >= star ? "star" : "star-outline"} size={36} color="#FFD700" style={{ marginHorizontal: 5 }} />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}><Text style={{ color: theme.subText }}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={submitReview} style={[styles.submitBtn, { backgroundColor: theme.tint }]}>
                            {submittingReview ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>Submit</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerContainer: { width: '100%', height: 300, position: 'relative' },
  heroPoster: { width: '100%', height: '100%' },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  headerContent: { position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', gap: 15 },
  smallPoster: { width: 100, height: 150, borderRadius: 8 },
  title: { fontSize: 22, fontWeight: 'bold' },

  contentScroll: { flex: 1 },
  detailsContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  synopsis: { fontSize: 15, lineHeight: 24, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 8, marginBottom: 20 },
  statBox: { alignItems: 'center' },
  val: { fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { marginTop: 10 },
  
  chapterList: { padding: 20, paddingTop: 0 },
  chapterCard: { padding: 15, borderRadius: 10, marginBottom: 10 },
  chapterNum: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  chapterTitle: { fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
  modalContent: { padding: 25, borderRadius: 16, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  starRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 15 },
  cancelBtn: { padding: 12, flex: 1, alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8 },
  submitBtn: { padding: 12, flex: 1, alignItems: 'center', borderRadius: 8 }
});