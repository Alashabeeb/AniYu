import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AdConfig } from '../../config/adConfig';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { downloadChapterToFile, getMangaDownloads } from '../../services/downloadService';
import { getMangaHistory } from '../../services/historyService';
import {
    addMangaReview,
    getMangaChapters,
    getMangaDetails,
    incrementMangaView
} from '../../services/mangaService';

const interstitial = InterstitialAd.createForAdRequest(AdConfig.interstitial, {
  requestNonPersonalizedAdsOnly: true,
});

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const router = useRouter(); 
  
  const [manga, setManga] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
  
  const [downloadedChapters, setDownloadedChapters] = useState<string[]>([]);
  const [readChapters, setReadChapters] = useState<string[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);

  const [adLoaded, setAdLoaded] = useState(false);
  const [pendingDownloadChapter, setPendingDownloadChapter] = useState<any>(null);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });

    const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      interstitial.load();
      
      if (pendingDownloadChapter) {
          performDownload(pendingDownloadChapter);
          setPendingDownloadChapter(null);
      }
    });

    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, (error) => {
        setAdLoaded(false);
    });

    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [pendingDownloadChapter]);

  useFocusEffect(
    useCallback(() => {
        if (id) {
            loadStatus();
        }
    }, [id])
  );

  useFocusEffect(
    useCallback(() => {
        if(id) loadData();
    }, [id])
  );

  const loadStatus = async () => {
      const dls = await getMangaDownloads();
      const myDls = dls.filter(d => String(d.mal_id) === String(id));
      setDownloadedChapters(myDls.map(d => String(d.episodeId)));

      const hist = await getMangaHistory();
      const myHist = hist.filter(h => String(h.mal_id) === String(id));
      setReadChapters(myHist.map(h => String(h.chapterId)));
  };

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
      if(!manga) setLoading(true); 
      const [details, chaps] = await Promise.all([
          getMangaDetails(id as string),
          getMangaChapters(id as string)
      ]);
      setManga(details);
      setChapters(chaps);
      checkAndIncrementView();
      await loadStatus(); 
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const submitReview = async () => {
      if (userRating === 0) return Alert.alert("Rate First", "Please tap the stars to rate.");
      const user = auth.currentUser;
      if (!user) return Alert.alert("Login Required", "You must be logged in to rate.");

      setSubmittingReview(true);
      const success = await addMangaReview(id as string, user.uid, user.displayName || 'User', userRating);
      setSubmittingReview(false);

      if (success) {
          Alert.alert("Thank you!", "Your rating has been saved.");
          setModalVisible(false);
          setUserRating(0);
          loadData(); 
      } else {
          Alert.alert("Error", "Could not save rating.");
      }
  };

  // ✅ HELPER: Perform Download (Separated Logic)
  const performDownload = async (chapter: any) => {
      // ✅ FIX: Check chapter.pages[0] instead of fileUrl
      const fileUrl = chapter.pages && chapter.pages.length > 0 ? chapter.pages[0] : null;

      if (!fileUrl) return Alert.alert("Error", "No file to download.");
      
      const chId = String(chapter.id || chapter.number);
      setDownloadingIds(prev => [...prev, chId]);

      try {
          const episodeObj = {
              id: chId, 
              number: chapter.number,
              title: chapter.title || `Chapter ${chapter.number}`,
              url: fileUrl // ✅ Use extracted URL
          };
          
          await downloadChapterToFile(manga, episodeObj);
          setDownloadedChapters(prev => [...prev, chId]);
          
      } catch (e) {
          Alert.alert("Error", "Download failed.");
      } finally {
          setDownloadingIds(prev => prev.filter(id => id !== chId));
      }
  };

  const handleDownload = (chapter: any) => {
      const chId = String(chapter.id || chapter.number);
      
      if (downloadedChapters.includes(chId)) return; 

      if (adLoaded) {
          setPendingDownloadChapter(chapter); 
          interstitial.show();                
      } else {
          performDownload(chapter);           
      }
  };

  const handleReadChapter = (chapter: any) => {
      // ✅ FIX: Check chapter.pages[0] instead of fileUrl
      const fileUrl = chapter.pages && chapter.pages.length > 0 ? chapter.pages[0] : null;

      if (!fileUrl) {
          Alert.alert("Error", "Chapter file not available.");
          return;
      }
      
      router.push({
          pathname: '/chapter-read', 
          params: {
              url: fileUrl, // ✅ Pass the correct URL
              title: `${manga.title} - ${chapter.title || 'Chapter ' + chapter.number}`,
              mangaId: manga.mal_id, 
              chapterId: chapter.id || chapter.number,
              chapterNum: chapter.number
          }
      });
  };

  if (loading && !manga) return <View style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.tint} /></View>;
  if (!manga) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerTitle: '', headerTransparent: true, headerTintColor: 'white' }} />

      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1 }}>
        
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
            </View>

            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 20, marginBottom: 10 }]}>
                    Chapters ({chapters.length})
                </Text>
            </View>
            
            <View style={styles.chapterList}>
                {chapters.map((ch) => {
                    const chId = String(ch.id || ch.number);
                    const isRead = readChapters.includes(chId);
                    const isDownloaded = downloadedChapters.includes(chId);

                    return (
                        <View key={chId} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                            <TouchableOpacity 
                                style={[styles.chapterCard, { backgroundColor: theme.card, flex: 1 }]}
                                onPress={() => handleReadChapter(ch)}
                            >
                                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
                                    <View>
                                        <Text style={[styles.chapterNum, { color: isRead ? theme.subText : theme.tint }]}>
                                            Chapter {ch.number} 
                                            {isRead && (
                                                <Text style={{ color: '#10b981', fontSize: 12, fontWeight: 'bold' }}>
                                                    {'  '}✓ READ
                                                </Text>
                                            )}
                                        </Text>
                                        <Text numberOfLines={1} style={[styles.chapterTitle, { color: theme.subText }]}>{ch.title}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => handleDownload(ch)}
                                style={{padding: 10, marginLeft: 5}}
                                disabled={isDownloaded || downloadingIds.includes(chId)}
                            >
                                {downloadingIds.includes(chId) ? (
                                    <ActivityIndicator size="small" color={theme.tint} />
                                ) : isDownloaded ? (
                                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                ) : (
                                    <Ionicons name="download-outline" size={24} color={theme.subText} />
                                )}
                            </TouchableOpacity>
                        </View>
                    );
                })}
            </View>
        </ScrollView>

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
  chapterCard: { padding: 15, borderRadius: 10 },
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