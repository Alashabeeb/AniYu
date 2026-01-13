import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

const REPORT_REASONS = [
    "Offensive content",
    "Abusive behavior",
    "Spam",
    "Misinformation",
    "Sexual content",
    "Pretending to be someone else",
    "Other"
];

export default function FeedProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { userId } = useLocalSearchParams(); 
  const currentUser = auth.currentUser;

  // targetUserId can be string OR undefined
  const targetUserId = (userId as string) || currentUser?.uid; 
  const isOwnProfile = targetUserId === currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [repostedPosts, setRepostedPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Posts'); 
  const [isFollowing, setIsFollowing] = useState(false); 

  // Report State
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: 'user' | 'post', id: string, content?: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, [targetUserId]);

  const fetchData = async () => {
    if (!targetUserId) return;
    try {
        const userRef = doc(db, "users", targetUserId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            if (currentUser && data.followers?.includes(currentUser.uid)) {
                setIsFollowing(true);
            }
        } else if (isOwnProfile && currentUser) {
            const newProfile = {
                username: currentUser.email?.split('@')[0] || "user",
                displayName: currentUser.displayName || "New User",
                email: currentUser.email,
                avatar: currentUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime',
                followers: [],
                following: [],
                createdAt: new Date()
            };
            await setDoc(userRef, newProfile);
            setUserData(newProfile);
        }

        const qMyPosts = query(
            collection(db, 'posts'), 
            where('userId', '==', targetUserId), 
            orderBy('createdAt', 'desc')
        );
        const myPostsSnap = await getDocs(qMyPosts);
        setMyPosts(myPostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const qReposts = query(
            collection(db, 'posts'),
            where('reposts', 'array-contains', targetUserId),
            orderBy('createdAt', 'desc')
        );
        const repostSnap = await getDocs(qReposts);
        setRepostedPosts(repostSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (e) {
        console.error("Error fetching data:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleFollow = async () => {
      if (!currentUser || isOwnProfile || !targetUserId) return;
      setIsFollowing(!isFollowing); 

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

  const handleDelete = (postId: string) => {
    if (!isOwnProfile) return; 
    Alert.alert("Delete Post", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
                await deleteDoc(doc(db, "posts", postId));
                setMyPosts(prev => prev.filter(p => p.id !== postId));
                setRepostedPosts(prev => prev.filter(p => p.id !== postId));
            } 
        }
    ]);
  };

  const toggleLike = async (postId: string, currentLikes: string[]) => {
     if (!currentUser) return;
     const updateList = (list: any[]) => list.map(p => {
        if (p.id === postId) {
            const isLiked = p.likes?.includes(currentUser.uid);
            const newLikes = isLiked 
                ? p.likes.filter((uid: string) => uid !== currentUser.uid)
                : [...(p.likes || []), currentUser.uid];
            return { ...p, likes: newLikes };
        }
        return p;
     });
     setMyPosts(updateList);
     setRepostedPosts(updateList);

     const postRef = doc(db, 'posts', postId);
     const isLiked = currentLikes?.includes(currentUser.uid);
     await updateDoc(postRef, {
       likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
     });
  };

  const toggleRepost = async (postId: string, currentReposts: string[]) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const isReposted = currentReposts?.includes(currentUser.uid);

    const updateList = (list: any[]) => list.map(p => {
        if (p.id === postId) {
            const newReposts = isReposted 
                ? p.reposts.filter((uid: string) => uid !== currentUser.uid)
                : [...(p.reposts || []), currentUser.uid];
            return { ...p, reposts: newReposts };
        }
        return p;
    });

    setMyPosts(updateList);
    setRepostedPosts(updateList);

    await updateDoc(postRef, {
      reposts: isReposted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
    
    if (isOwnProfile) fetchData(); 
  };

  const handleShare = async (text: string) => {
    try { await Share.share({ message: `Check out this post: "${text}"` }); } catch (error) { console.log(error); }
  };

  const goToDetails = (postId: string) => {
      router.push({ pathname: '/post-details', params: { postId } });
  };

  // ✅ SUBMIT REPORT
  const submitReport = async (reason: string) => {
    if (!currentUser || !reportTarget) return;
    setReportLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: reportTarget.type,
        targetId: reportTarget.id,
        targetContent: reportTarget.content || 'Profile',
        reportedBy: currentUser.uid,
        reason: reason,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      Alert.alert("Report Submitted", "Thank you. We will review this.");
      setReportModalVisible(false);
      setReportTarget(null);
    } catch (error) {
      Alert.alert("Error", "Could not submit report.");
    } finally {
      setReportLoading(false);
    }
  };

  // ✅ OPEN MENU HELPERS
  const openUserMenu = () => {
      // 🟢 FIX: Ensure targetUserId exists before setting it to state
      if (!targetUserId) return; 
      
      setReportTarget({ type: 'user', id: targetUserId });
      setMenuVisible(true);
  };

  const openPostMenu = (post: any) => {
      setReportTarget({ type: 'post', id: post.id, content: post.text });
      setMenuVisible(true);
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>{userData?.displayName || "User"}</Text>
        
        {/* Report Button (Only for other users) */}
        {!isOwnProfile && (
            <TouchableOpacity onPress={openUserMenu} style={[styles.backBtn, { marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
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
                <View style={styles.banner} />
                <View style={styles.profileInfo}>
                    <Image 
                        source={{ uri: userData?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime' }} 
                        style={[styles.avatar, { borderColor: theme.background }]} 
                    />
                    
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

                <View style={styles.statsRow}>
                    <Text style={[styles.statNum, { color: theme.text }]}>
                        {followingCount} <Text style={[styles.statLabel, { color: theme.subText }]}>Following</Text>
                    </Text>
                    <Text style={[styles.statNum, { color: theme.text, marginLeft: 20 }]}>
                        {followersCount} <Text style={[styles.statLabel, { color: theme.subText }]}>Followers</Text>
                    </Text>
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
        
        renderItem={({ item }) => {
            const isLiked = item.likes?.includes(currentUser?.uid);
            const isReposted = item.reposts?.includes(currentUser?.uid);
            
            let timeAgo = "now";
            if (item.createdAt?.seconds) {
                timeAgo = new Date(item.createdAt.seconds * 1000).toLocaleDateString(); 
            }

            return (
                <TouchableOpacity 
                    style={styles.tweetContainer}
                    onPress={() => goToDetails(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
                    </View>

                    <View style={styles.contentContainer}>
                        {activeTab === 'Reposts' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                <Ionicons name="repeat" size={12} color={theme.subText} />
                                <Text style={{ fontSize: 12, color: theme.subText, marginLeft: 5 }}>Reposted</Text>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={styles.tweetHeader}>
                                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                                    {item.displayName || item.username}
                                </Text>
                                <Text style={[styles.handle, { color: theme.subText }]} numberOfLines={1}>
                                    @{item.username} · {timeAgo}
                                </Text>
                            </View>
                            
                            {isOwnProfile && item.userId === currentUser?.uid ? (
                                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                    <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => openPostMenu(item)}>
                                    <Ionicons name="ellipsis-horizontal" size={16} color={theme.subText} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={[styles.tweetText, { color: theme.text }]}>{item.text}</Text>

                        <View style={styles.actionsRow}>
                            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(item.id, item.likes || [])}>
                                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#FF6B6B" : theme.subText} />
                                <Text style={[styles.actionCount, { color: isLiked ? "#FF6B6B" : theme.subText }]}>{item.likes ? item.likes.length : 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => goToDetails(item.id)}>
                                <Ionicons name="chatbubble-outline" size={18} color={theme.subText} />
                                <Text style={[styles.actionCount, { color: theme.subText }]}>{item.commentCount || 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => toggleRepost(item.id, item.reposts || [])}>
                                <Ionicons name="repeat-outline" size={18} color={isReposted ? "#00BA7C" : theme.subText} />
                                <Text style={[styles.actionCount, { color: isReposted ? "#00BA7C" : theme.subText }]}>{item.reposts ? item.reposts.length : 0}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item.text)}>
                                <Ionicons name="share-outline" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }}
        
        ListEmptyComponent={
            <View style={{ marginTop: 50, alignItems: 'center' }}>
                <Text style={{ color: theme.subText }}>
                    {activeTab === 'Posts' ? "No posts yet." : "No reposts yet."}
                </Text>
            </View>
        }
      />

      {/* ✅ 1. MENU MODAL */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => { setMenuVisible(false); setReportModalVisible(true); }}
                    >
                        <Ionicons name="flag-outline" size={20} color="red" />
                        <Text style={[styles.menuText, { color: 'red' }]}>
                            {reportTarget?.type === 'user' ? 'Report Profile' : 'Report Post'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                         <Ionicons name="close" size={20} color={theme.text} />
                         <Text style={[styles.menuText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ✅ 2. REPORT REASON MODAL */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.reportContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.reportTitle, { color: theme.text }]}>Report {reportTarget?.type === 'user' ? 'User' : 'Post'}</Text>
                <Text style={{ color: theme.subText, marginBottom: 15, textAlign: 'center' }}>
                    Why are you reporting this?
                </Text>

                {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity 
                        key={reason} 
                        style={[styles.reasonBtn, { borderColor: theme.border }]}
                        onPress={() => submitReport(reason)}
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
  tweetContainer: { flexDirection: 'row', padding: 15 },
  avatarContainer: { marginRight: 12 },
  postAvatar: { width: 50, height: 50, borderRadius: 25 },
  contentContainer: { flex: 1 },
  tweetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flex: 1 },
  name: { fontWeight: 'bold', fontSize: 15, marginRight: 5, flexShrink: 1 },
  handle: { fontSize: 14, flexShrink: 1 },
  tweetText: { fontSize: 15, lineHeight: 22, marginTop: 2, marginBottom: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 30 },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionCount: { fontSize: 12, marginLeft: 5 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: 250, borderRadius: 12, padding: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { fontSize: 16, marginLeft: 12, fontWeight: '500' },

  reportContainer: { width: '90%', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 10 },
  reportTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  reasonBtn: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      width: '100%', padding: 15, borderBottomWidth: 0.5 
  }
});