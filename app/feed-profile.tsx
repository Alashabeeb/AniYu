import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../components/PostCard';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

const REPORT_REASONS = [
    "Pretending to be someone else",
    "Fake account",
    "Inappropriate profile info",
    "Harassment or bullying",
    "Spam",
    "Other"
];

export default function FeedProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { userId } = useLocalSearchParams(); 
  const currentUser = auth.currentUser;

  const targetUserId = (userId as string) || currentUser?.uid; 
  const isOwnProfile = targetUserId === currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Posts'); 
  const [isFollowing, setIsFollowing] = useState(false); 

  // Report User State
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    if (!targetUserId) return;

    // 1. Get User Profile
    const userRef = doc(db, "users", targetUserId);
    const unsubUser = onSnapshot(userRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            if (currentUser && data.followers?.includes(currentUser.uid)) {
                setIsFollowing(true);
            }
            setLoading(false);
        } else if (isOwnProfile && currentUser) {
             // CREATE PROFILE IF MISSING (Default Rank: GENIN)
             const newProfile = {
                username: currentUser.email?.split('@')[0] || "user",
                displayName: currentUser.displayName || "New User",
                email: currentUser.email,
                avatar: currentUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime',
                followers: [],
                following: [],
                watchedCount: 0,
                createdAt: new Date(),
                rank: "GENIN" 
            };
            await setDoc(userRef, newProfile);
            setLoading(false);
        }
    });

    // 2. Get Posts
    const qMyPosts = query(
        collection(db, 'posts'), 
        where('userId', '==', targetUserId), 
        orderBy('createdAt', 'desc')
    );
    const unsubPosts = onSnapshot(qMyPosts, (snapshot) => {
        setMyPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Get Reposts
    const qReposts = query(
        collection(db, 'posts'),
        where('reposts', 'array-contains', targetUserId),
        orderBy('createdAt', 'desc')
    );
    const unsubReposts = onSnapshot(qReposts, (snapshot) => {
        setRepostedPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUser(); unsubPosts(); unsubReposts(); };
  }, [targetUserId]);

  const handleFollow = async () => {
      if (!currentUser || isOwnProfile || !targetUserId) return;
      const myRef = doc(db, "users", currentUser.uid);
      const targetRef = doc(db, "users", targetUserId);

      if (isFollowing) {
          await setDoc(myRef, { following: arrayRemove(targetUserId) }, { merge: true });
          await setDoc(targetRef, { followers: arrayRemove(currentUser.uid) }, { merge: true });
      } else {
          await setDoc(myRef, { following: arrayUnion(targetUserId) }, { merge: true });
          await setDoc(targetRef, { followers: arrayUnion(currentUser.uid) }, { merge: true });
      }
  };

  const submitReportUser = async (reason: string) => {
    if (!currentUser || !targetUserId) return;
    setReportLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'user',
        targetId: targetUserId,
        targetName: userData?.username || 'Unknown',
        reportedBy: currentUser.uid,
        reason: reason,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      Alert.alert("Report Submitted", "We will review this profile.");
      setReportModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Could not submit report.");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={theme.tint} />
        </View>
    );
  }

  const followingCount = userData?.following?.length || 0;
  const followersCount = userData?.followers?.length || 0;
  const userRank = userData?.rank || "GENIN"; 

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>{userData?.displayName || "User"}</Text>
        
        {/* Report Menu Button (Only for others) */}
        {!isOwnProfile && (
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.backBtn, { marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Ionicons name="ellipsis-horizontal" size={24} color="white" />
            </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={activeTab === 'Posts' ? myPosts : repostedPosts} 
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        ListHeaderComponent={() => (
            <View>
                {/* ✅ CUSTOM BANNER DISPLAY */}
                {userData?.banner ? (
                    <Image 
                        source={{ uri: userData.banner }} 
                        style={styles.banner} 
                        contentFit="cover"
                    />
                ) : (
                    <View style={[styles.banner, { backgroundColor: '#333' }]} />
                )}

                <View style={styles.profileInfo}>
                    
                    <View>
                        <Image 
                            source={{ uri: userData?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime' }} 
                            style={[styles.avatar, { borderColor: theme.background }]} 
                        />
                        {/* RANK BADGE */}
                        <View style={[styles.rankBadge, { borderColor: theme.background, backgroundColor: '#FFD700' }]}>
                             <Text style={styles.rankText}>{userRank}</Text>
                        </View>
                    </View>
                    
                    {isOwnProfile ? (
                        <TouchableOpacity 
                            style={[styles.editBtn, { borderColor: theme.border }]}
                            onPress={() => router.push('/edit-profile')}
                        >
                            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Edit Profile</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.editBtn, { 
                                backgroundColor: isFollowing ? 'transparent' : theme.tint, 
                                borderColor: isFollowing ? theme.border : theme.tint,
                                borderWidth: 1
                            }]}
                            onPress={handleFollow}
                        >
                            <Text style={{ color: isFollowing ? theme.text : 'white', fontWeight: 'bold' }}>
                                {isFollowing ? "Following" : "Follow"}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.nameSection}>
                    <Text style={[styles.displayName, { color: theme.text }]}>{userData?.displayName || "Anonymous"}</Text>
                    <Text style={[styles.username, { color: theme.subText }]}>@{userData?.username || "username"}</Text>
                </View>

                {/* ✅ UPDATED: STATS ARE NOW CLICKABLE LINKS */}
                <View style={styles.statsRow}>
                    <TouchableOpacity 
                        onPress={() => router.push({ pathname: '/user-list', params: { type: 'following', userId: targetUserId } })}
                    >
                        <Text style={[styles.statNum, { color: theme.text }]}>
                            {followingCount} <Text style={[styles.statLabel, { color: theme.subText }]}>Following</Text>
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => router.push({ pathname: '/user-list', params: { type: 'followers', userId: targetUserId } })}
                        style={{ marginLeft: 20 }}
                    >
                        <Text style={[styles.statNum, { color: theme.text }]}>
                            {followersCount} <Text style={[styles.statLabel, { color: theme.subText }]}>Followers</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.tabRow, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity 
                        onPress={() => setActiveTab('Posts')}
                        style={[styles.tab, activeTab === 'Posts' && { borderBottomColor: theme.tint, borderBottomWidth: 3 }]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'Posts' ? theme.text : theme.subText }]}>Posts</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => setActiveTab('Reposts')}
                        style={[styles.tab, activeTab === 'Reposts' && { borderBottomColor: theme.tint, borderBottomWidth: 3 }]}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'Reposts' ? theme.text : theme.subText }]}>Reposts</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )}
        
        renderItem={({ item }) => (
             <View style={{ position: 'relative' }}>
                {activeTab === 'Reposts' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 10 }}>
                        <Ionicons name="repeat" size={12} color={theme.subText} />
                        <Text style={{ fontSize: 12, color: theme.subText, marginLeft: 5 }}>Reposted</Text>
                    </View>
                )}
                <PostCard post={item} />
             </View>
        )}
        
        ListEmptyComponent={
            <View style={{ marginTop: 50, alignItems: 'center' }}>
                <Text style={{ color: theme.subText }}>
                    {activeTab === 'Posts' ? "No posts yet." : "No reposts yet."}
                </Text>
            </View>
        }
      />

      {/* MENU MODAL */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => { setMenuVisible(false); setReportModalVisible(true); }}
                    >
                        <Ionicons name="flag-outline" size={20} color="red" />
                        <Text style={[styles.menuText, { color: 'red' }]}>Report Profile</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                         <Ionicons name="close" size={20} color={theme.text} />
                         <Text style={[styles.menuText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* REPORT REASON MODAL */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.reportContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.reportTitle, { color: theme.text }]}>Report User</Text>
                <Text style={{ color: theme.subText, marginBottom: 15, textAlign: 'center' }}>
                    Why are you reporting this profile?
                </Text>

                {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity 
                        key={reason} 
                        style={[styles.reasonBtn, { borderColor: theme.border }]}
                        onPress={() => submitReportUser(reason)}
                        disabled={reportLoading}
                    >
                        <Text style={{ color: theme.text }}>{reason}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.subText} />
                    </TouchableOpacity>
                ))}

                <TouchableOpacity 
                    style={{ marginTop: 10, padding: 10 }}
                    onPress={() => setReportModalVisible(false)}
                >
                    <Text style={{ color: theme.tint, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>

                {reportLoading && <ActivityIndicator style={{ position: 'absolute' }} size="large" color={theme.tint} />}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, position: 'absolute', top: 30, left: 0, zIndex: 10, width: '100%' },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 5, marginRight: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 5, marginLeft: 10 },
  banner: { height: 120, backgroundColor: '#333' },
  profileInfo: { paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -35 },
  avatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3 },
  
  rankBadge: { 
      position: 'absolute', 
      bottom: 0, 
      right: -5, 
      paddingHorizontal: 6, 
      paddingVertical: 2, 
      borderRadius: 10, 
      borderWidth: 2,
      zIndex: 5 
  },
  rankText: { fontSize: 9, fontWeight: 'bold', color: 'black' },

  editBtn: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 5 },
  nameSection: { paddingHorizontal: 15, marginTop: 5 },
  displayName: { fontSize: 20, fontWeight: 'bold' },
  username: { fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 15, marginTop: 15, marginBottom: 15 },
  statNum: { fontWeight: 'bold', fontSize: 15 },
  statLabel: { fontWeight: 'normal', fontSize: 14 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginTop: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontWeight: '600' },
  separator: { height: 0.5, width: '100%' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: 250, borderRadius: 12, padding: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { fontSize: 16, marginLeft: 12, fontWeight: '500' },
  reportContainer: { width: '90%', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 10 },
  reportTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 15, borderBottomWidth: 0.5 }
});