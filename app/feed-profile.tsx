import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [activeTab, setActiveTab] = useState('Posts'); // 'Posts' or 'Reposts'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    try {
        // 1. Get User Details
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) setUserData(userSnap.data());

        // 2. Get ONLY My Posts
        const q = query(
            collection(db, 'posts'), 
            where('userId', '==', user.uid), 
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyPosts(posts);
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

  // ✅ FIXED TOGGLE LIKE FUNCTION
  const toggleLike = async (postId: string, currentLikes: string[]) => {
     if (!user) return;

     // Optimistic Update locally
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

     // Update Firebase
     const postRef = doc(db, 'posts', postId);
     const isLiked = currentLikes.includes(user.uid);
     await updateDoc(postRef, {
       likes: isLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
     });
  };

  if (loading) {
    return (
        <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={theme.tint} />
        </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header (Transparent Back Button) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{userData?.displayName || user?.displayName}</Text>
      </View>

      <FlatList
        data={activeTab === 'Posts' ? myPosts : []} 
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        ListHeaderComponent={() => (
            <View>
                {/* Banner & Avatar */}
                <View style={styles.banner} />
                <View style={styles.profileInfo}>
                    <Image 
                        source={{ uri: userData?.avatar || user?.photoURL }} 
                        style={[styles.avatar, { borderColor: theme.background }]} 
                    />
                    <TouchableOpacity style={[styles.editBtn, { borderColor: theme.border }]}>
                        <Text style={{ color: theme.text, fontWeight: 'bold' }}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Name & Handle */}
                <View style={styles.nameSection}>
                    <Text style={[styles.displayName, { color: theme.text }]}>{userData?.displayName || user?.displayName}</Text>
                    <Text style={[styles.username, { color: theme.subText }]}>@{userData?.username || "username"}</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <Text style={[styles.statNum, { color: theme.text }]}>142 <Text style={[styles.statLabel, { color: theme.subText }]}>Watched</Text></Text>
                    <Text style={[styles.statNum, { color: theme.text, marginLeft: 15 }]}>24 <Text style={[styles.statLabel, { color: theme.subText }]}>Following</Text></Text>
                    <Text style={[styles.statNum, { color: theme.text, marginLeft: 15 }]}>1.2k <Text style={[styles.statLabel, { color: theme.subText }]}>Followers</Text></Text>
                </View>

                {/* Tabs: Posts | Reposts */}
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
        
        // Render Twitter-Style Post
        renderItem={({ item }) => {
            const isLiked = item.likes?.includes(user?.uid);
            let timeAgo = "now";
            if (item.createdAt?.seconds) {
                timeAgo = new Date(item.createdAt.seconds * 1000).toLocaleDateString(); 
            }

            return (
                <View style={styles.tweetContainer}>
                    {/* Left: Avatar */}
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: item.userAvatar }} style={styles.postAvatar} />
                    </View>

                    {/* Right: Content */}
                    <View style={styles.contentContainer}>
                        
                        {/* Header: Name @handle · time */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={styles.tweetHeader}>
                                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                                    {item.displayName || item.username}
                                </Text>
                                <Text style={[styles.handle, { color: theme.subText }]} numberOfLines={1}>
                                    @{item.username} · {timeAgo}
                                </Text>
                            </View>
                            
                            {/* 🗑️ DELETE BUTTON (Top Right) */}
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
                            </TouchableOpacity>
                        </View>

                        {/* Tweet Text */}
                        <Text style={[styles.tweetText, { color: theme.text }]}>{item.text}</Text>

                        {/* Action Buttons */}
                        <View style={styles.actionsRow}>
                            {/* Like */}
                            <TouchableOpacity style={styles.actionButton} onPress={() => toggleLike(item.id, item.likes || [])}>
                                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#FF6B6B" : theme.subText} />
                                <Text style={[styles.actionCount, { color: isLiked ? "#FF6B6B" : theme.subText }]}>{item.likes ? item.likes.length : 0}</Text>
                            </TouchableOpacity>

                            {/* Reply */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="chatbubble-outline" size={18} color={theme.subText} />
                                <Text style={[styles.actionCount, { color: theme.subText }]}>0</Text>
                            </TouchableOpacity>

                            {/* Repost */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="repeat-outline" size={18} color={theme.subText} />
                                <Text style={[styles.actionCount, { color: theme.subText }]}>0</Text>
                            </TouchableOpacity>

                            {/* Share */}
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="share-outline" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 5 },
  
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

  // Tweet Card Styles
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