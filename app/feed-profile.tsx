import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function FeedProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const user = auth.currentUser;
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Posts'); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) setUserData(userSnap.data());

        const q = query(
            collection(db, 'posts'), 
            where('userId', '==', user.uid), 
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setMyPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = (postId: string) => {
    Alert.alert("Delete Post", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
                await deleteDoc(doc(db, "posts", postId));
                setMyPosts(prev => prev.filter(p => p.id !== postId));
            } 
        }
    ]);
  };

  const toggleLike = async (postId: string, currentLikes: string[]) => {
     if (!user) return;
     
     setMyPosts(currentPosts => 
        currentPosts.map(p => {
            if (p.id === postId) {
                const isLiked = p.likes?.includes(user.uid);
                const newLikes = isLiked 
                    ? p.likes.filter((uid: string) => uid !== user.uid)
                    : [...(p.likes || []), user.uid];
                return { ...p, likes: newLikes };
            }
            return p;
        })
     );

     const postRef = doc(db, 'posts', postId);
     const isLiked = currentLikes?.includes(user.uid);
     await updateDoc(postRef, {
       likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
     });
  };

  const toggleRepost = async (postId: string, currentReposts: string[]) => {
    if (!user) return;
    const postRef = doc(db, 'posts', postId);
    const isReposted = currentReposts?.includes(user.uid);

    // Optimistic UI Update
    setMyPosts(currentPosts => 
        currentPosts.map(p => {
            if (p.id === postId) {
                const newReposts = isReposted 
                    ? p.reposts.filter((uid: string) => uid !== user.uid)
                    : [...(p.reposts || []), user.uid];
                return { ...p, reposts: newReposts };
            }
            return p;
        })
     );

    await updateDoc(postRef, {
      reposts: isReposted ? arrayRemove(user.uid) : arrayUnion(user.uid)
    });
  };

  const handleShare = async (text: string) => {
    try {
        await Share.share({ message: `Check out this post: "${text}"` });
    } catch (error) {
        console.log(error);
    }
  };

  const goToDetails = (postId: string) => {
      router.push({ pathname: '/post-details', params: { postId } });
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
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: 'white' }]}>{userData?.displayName || user?.displayName}</Text>
      </View>

      <FlatList
        data={activeTab === 'Posts' ? myPosts : []} 
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        ListHeaderComponent={() => (
            <View>
                <View style={styles.banner} />
                <View style={styles.profileInfo}>
                    <Image 
                        source={{ uri: userData?.avatar || user?.photoURL }} 
                        style={[styles.avatar, { borderColor: theme.background }]} 
                    />
                    <TouchableOpacity 
                        style={[styles.editBtn, { borderColor: theme.border }]}
                        onPress={() => router.push('/edit-profile')}
                    >
                        <Text style={{ color: theme.text, fontWeight: 'bold' }}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.nameSection}>
                    <Text style={[styles.displayName, { color: theme.text }]}>{userData?.displayName || user?.displayName}</Text>
                    <Text style={[styles.username, { color: theme.subText }]}>@{userData?.username || "username"}</Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <Text style={[styles.statNum, { color: theme.text }]}>
                        {followingCount} <Text style={[styles.statLabel, { color: theme.subText }]}>Following</Text>
                    </Text>
                    <Text style={[styles.statNum, { color: theme.text, marginLeft: 20 }]}>
                        {followersCount} <Text style={[styles.statLabel, { color: theme.subText }]}>Followers</Text>
                    </Text>
                </View>

                {/* Tabs */}
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
            const isLiked = item.likes?.includes(user?.uid);
            const isReposted = item.reposts?.includes(user?.uid);
            
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
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={styles.tweetHeader}>
                                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                                    {item.displayName || item.username}
                                </Text>
                                <Text style={[styles.handle, { color: theme.subText }]} numberOfLines={1}>
                                    @{item.username} · {timeAgo}
                                </Text>
                            </View>
                            
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.tweetText, { color: theme.text }]}>{item.text}</Text>

                        <View style={styles.actionsRow}>
                            {/* LIKE */}
                            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(item.id, item.likes || [])}>
                                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#FF6B6B" : theme.subText} />
                                <Text style={[styles.actionCount, { color: isLiked ? "#FF6B6B" : theme.subText }]}>{item.likes ? item.likes.length : 0}</Text>
                            </TouchableOpacity>

                            {/* COMMENT (✅ NOW SHOWS COUNT) */}
                            <TouchableOpacity style={styles.actionButton} onPress={() => goToDetails(item.id)}>
                                <Ionicons name="chatbubble-outline" size={18} color={theme.subText} />
                                <Text style={[styles.actionCount, { color: theme.subText }]}>{item.commentCount || 0}</Text>
                            </TouchableOpacity>

                            {/* REPOST */}
                            <TouchableOpacity style={styles.actionButton} onPress={() => toggleRepost(item.id, item.reposts || [])}>
                                <Ionicons name="repeat-outline" size={18} color={isReposted ? "#00BA7C" : theme.subText} />
                                <Text style={[styles.actionCount, { color: isReposted ? "#00BA7C" : theme.subText }]}>{item.reposts ? item.reposts.length : 0}</Text>
                            </TouchableOpacity>

                            {/* SHARE */}
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
                    {activeTab === 'Posts' ? "You haven't posted yet." : "No reposts yet."}
                </Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, position: 'absolute', top: 30, left: 0, zIndex: 10 },
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
});