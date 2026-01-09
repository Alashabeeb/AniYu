import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [posts, setPosts] = useState<any[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });
    return unsubscribe; 
  }, []);

  // 1. LIKE
  const toggleLike = async (postId: string, currentLikes: string[]) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const isLiked = currentLikes?.includes(currentUser.uid);
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  // 2. REPOST
  const toggleRepost = async (postId: string, currentReposts: string[]) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const isReposted = currentReposts?.includes(currentUser.uid);
    await updateDoc(postRef, {
      reposts: isReposted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  // 3. SHARE
  const handleShare = async (text: string) => {
    try {
        await Share.share({ message: `Check out this post on AniYu: "${text}"` });
    } catch (error) {
        console.log(error);
    }
  };

  // 4. GO TO DETAILS
  const goToDetails = (postId: string) => {
      router.push({ pathname: '/post-details', params: { postId } });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.push('/feed-profile')}>
            <Image 
                source={{ uri: currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
                style={styles.headerAvatar} 
            />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>Feed</Text>
        <Ionicons name="settings-outline" size={24} color={theme.text} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        renderItem={({ item }) => {
            const isLiked = item.likes?.includes(currentUser?.uid);
            const isReposted = item.reposts?.includes(currentUser?.uid);
            
            let timeAgo = "now";
            if (item.createdAt?.seconds) {
                const seconds = Math.floor((new Date().getTime() / 1000) - item.createdAt.seconds);
                if (seconds < 60) timeAgo = `${seconds}s`;
                else if (seconds < 3600) timeAgo = `${Math.floor(seconds/60)}m`;
                else if (seconds < 86400) timeAgo = `${Math.floor(seconds/3600)}h`;
                else timeAgo = new Date(item.createdAt.seconds * 1000).toLocaleDateString();
            }

            const displayName = item.displayName || item.username;
            const handle = item.username || "unknown";

            return (
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    style={styles.tweetContainer}
                    onPress={() => goToDetails(item.id)}
                >
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                    </View>

                    <View style={styles.contentContainer}>
                        <View style={styles.tweetHeader}>
                            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                                {displayName}
                            </Text>
                            <Text style={[styles.handle, { color: theme.subText }]} numberOfLines={1}>
                                @{handle} · {timeAgo}
                            </Text>
                        </View>

                        <Text style={[styles.tweetText, { color: theme.text }]}>
                            {item.text}
                        </Text>

                        <View style={styles.actionsRow}>
                            {/* LIKE */}
                            <TouchableOpacity 
                                style={styles.actionButton} 
                                onPress={() => toggleLike(item.id, item.likes || [])}
                            >
                                <Ionicons 
                                    name={isLiked ? "heart" : "heart-outline"} 
                                    size={18} 
                                    color={isLiked ? "#FF6B6B" : theme.subText} 
                                />
                                <Text style={[styles.actionCount, { color: isLiked ? "#FF6B6B" : theme.subText }]}>
                                    {item.likes ? item.likes.length : 0}
                                </Text>
                            </TouchableOpacity>

                            {/* COMMENT (Now shows count!) */}
                            <TouchableOpacity 
                                style={styles.actionButton}
                                onPress={() => goToDetails(item.id)}
                            >
                                <Ionicons name="chatbubble-outline" size={18} color={theme.subText} />
                                <Text style={[styles.actionCount, { color: theme.subText }]}>
                                    {item.commentCount || 0}
                                </Text>
                            </TouchableOpacity>

                            {/* REPOST */}
                            <TouchableOpacity 
                                style={styles.actionButton}
                                onPress={() => toggleRepost(item.id, item.reposts || [])}
                            >
                                <Ionicons 
                                    name="repeat-outline" 
                                    size={18} 
                                    color={isReposted ? "#00BA7C" : theme.subText} 
                                />
                                <Text style={[styles.actionCount, { color: isReposted ? "#00BA7C" : theme.subText }]}>
                                    {item.reposts ? item.reposts.length : 0}
                                </Text>
                            </TouchableOpacity>

                            {/* SHARE */}
                            <TouchableOpacity 
                                style={styles.actionButton}
                                onPress={() => handleShare(item.text)}
                            >
                                <Ionicons name="share-outline" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        }}
      />

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.tint }]}
        onPress={() => router.push('/create-post')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 0.5, alignItems: 'center' },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  separator: { height: 0.5, width: '100%' },
  tweetContainer: { flexDirection: 'row', padding: 12 },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  contentContainer: { flex: 1 },
  tweetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name: { fontWeight: 'bold', fontSize: 15, marginRight: 5, flexShrink: 1 },
  handle: { fontSize: 14, flexShrink: 1 },
  tweetText: { fontSize: 15, lineHeight: 20, marginTop: 2, marginBottom: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 40, marginTop: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionCount: { fontSize: 12, marginLeft: 5 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.65 }
});