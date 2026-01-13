import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { arrayRemove, arrayUnion, collection, doc, getDoc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  // ✅ State Management
  const [posts, setPosts] = useState<any[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  
  // ✅ Tab State: 'All' or 'Trending'
  const [activeTab, setActiveTab] = useState('All'); 
  const [userInterests, setUserInterests] = useState<string[]>([]); // To store e.g., ['Action', 'Revenge']

  // ✅ Search & Refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  // 1. Fetch User Interests (For the Algorithm)
  useEffect(() => {
    const fetchUserInterests = async () => {
      if (!currentUser) return;
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Assuming you store interests or genres in the user doc
          // If you don't have this yet, it defaults to empty array
          setUserInterests(data.interests || data.favoriteGenres || []);
        }
      } catch (error) {
        console.log("Error fetching user interests:", error);
      }
    };
    fetchUserInterests();
  }, []);

  // 2. Fetch All Posts (Realtime)
  useEffect(() => {
    const q = query(
        collection(db, 'posts'), 
        where('parentId', '==', null), 
        orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });
    return unsubscribe; 
  }, []);

  // 3. MAIN ALGORITHM: Filter & Sort based on Tabs and Search
  useEffect(() => {
    let result = [...posts];

    // --- STEP A: SEARCH OVERRIDE ---
    if (searchText.trim() !== '') {
        const lowerText = searchText.toLowerCase();
        result = result.filter(p => 
            p.text?.toLowerCase().includes(lowerText) || 
            p.username?.toLowerCase().includes(lowerText) ||
            p.displayName?.toLowerCase().includes(lowerText)
        );
    } 
    else {
        // --- STEP B: TABS LOGIC ---
        
        if (activeTab === 'Trending') {
            // ALGORITHM: TRENDING
            // Twitter style: Sort by engagement (Likes + Reposts + Comments)
            result.sort((a, b) => {
                const scoreA = (a.likes?.length || 0) + (a.reposts?.length || 0) + (a.commentCount || 0);
                const scoreB = (b.likes?.length || 0) + (b.reposts?.length || 0) + (b.commentCount || 0);
                return scoreB - scoreA; // Highest score first
            });
        } 
        else if (activeTab === 'All') {
            // ALGORITHM: PERSONALIZED / INTEREST BASED
            if (userInterests.length > 0) {
                // If user has interests, push matching posts to the top
                result.sort((a, b) => {
                    // Check if post text contains any of the user's interests
                    // (You can also check a 'tags' field if you add one to your posts)
                    const aMatches = userInterests.some(interest => 
                        a.text?.toLowerCase().includes(interest.toLowerCase()) || 
                        a.tags?.includes(interest)
                    );
                    const bMatches = userInterests.some(interest => 
                        b.text?.toLowerCase().includes(interest.toLowerCase()) || 
                        b.tags?.includes(interest)
                    );

                    // If A matches and B doesn't, A comes first (-1)
                    if (aMatches && !bMatches) return -1;
                    if (!aMatches && bMatches) return 1;
                    return 0; // Keep chronological if both match or neither match
                });
            }
            // If no interests, it remains default Chronological (as fetched)
        }
    }

    setFilteredPosts(result);
  }, [posts, searchText, activeTab, userInterests]);

  // ✅ Pull-to-Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
        setRefreshing(false);
    }, 1000);
  }, []);

  // ... (Keep your existing toggleLike, toggleRepost, handleShare, goToDetails functions exactly as they were) ...
  const toggleLike = async (postId: string, currentLikes: string[]) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const isLiked = currentLikes?.includes(currentUser.uid);
    await updateDoc(postRef, { likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
  };

  const toggleRepost = async (postId: string, currentReposts: string[]) => {
    if (!currentUser) return;
    const postRef = doc(db, 'posts', postId);
    const isReposted = currentReposts?.includes(currentUser.uid);
    await updateDoc(postRef, { reposts: isReposted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
  };

  const handleShare = async (text: string) => {
    try { await Share.share({ message: `Check out this post on AniYu: "${text}"` }); } catch (error) { console.log(error); }
  };

  const goToDetails = (postId: string) => { router.push({ pathname: '/post-details', params: { postId } }); };
  const goToProfile = (userId: string) => { router.push({ pathname: '/feed-profile', params: { userId } }); };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* ✅ HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.push('/feed-profile')}>
            <Image 
                source={{ uri: currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
                style={styles.headerAvatar} 
            />
        </TouchableOpacity>
        
        {/* TABS IN HEADER CENTER */}
        <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setActiveTab('All')} style={styles.tabButton}>
                <Text style={[
                    styles.tabText, 
                    { color: activeTab === 'All' ? theme.text : theme.subText, fontWeight: activeTab === 'All' ? 'bold' : 'normal' }
                ]}>All</Text>
                {activeTab === 'All' && <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setActiveTab('Trending')} style={styles.tabButton}>
                <Text style={[
                    styles.tabText, 
                    { color: activeTab === 'Trending' ? theme.text : theme.subText, fontWeight: activeTab === 'Trending' ? 'bold' : 'normal' }
                ]}>Trending</Text>
                {activeTab === 'Trending' && <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />}
            </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => {
            setShowSearch(!showSearch);
            if(showSearch) setSearchText('');
        }}>
            <Ionicons name={showSearch ? "close" : "search"} size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* ✅ SEARCH BAR */}
      {showSearch && (
          <View style={[styles.searchContainer, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
              <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
                  <Ionicons name="search" size={20} color={theme.subText} />
                  <TextInput 
                      style={[styles.searchInput, { color: theme.text }]}
                      placeholder="Search posts or users..."
                      placeholderTextColor={theme.subText}
                      value={searchText}
                      onChangeText={setSearchText}
                      autoFocus
                  />
              </View>
          </View>
      )}

      {/* ✅ LIST */}
      <FlatList
        data={filteredPosts}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        
        ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: theme.subText }}>
                    {searchText ? "No results found." : "No posts yet."}
                </Text>
            </View>
        }

        renderItem={({ item }) => {
            const isLiked = item.likes?.includes(currentUser?.uid);
            const isReposted = item.reposts?.includes(currentUser?.uid);
            
            // Time logic
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
                <TouchableOpacity activeOpacity={0.7} style={styles.tweetContainer} onPress={() => goToDetails(item.id)}>
                    <TouchableOpacity onPress={() => goToProfile(item.userId)}>
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: item.userAvatar }} style={styles.avatar} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.contentContainer}>
                        <View style={styles.tweetHeader}>
                            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{displayName}</Text>
                            <Text style={[styles.handle, { color: theme.subText }]} numberOfLines={1}>@{handle} · {timeAgo}</Text>
                        </View>

                        {item.text ? <Text style={[styles.tweetText, { color: theme.text }]}>{item.text}</Text> : null}

                        {item.mediaUrl && item.mediaType === 'image' && (
                            <Image source={{ uri: item.mediaUrl }} style={styles.postImage} contentFit="cover" />
                        )}
                        
                        {item.mediaUrl && item.mediaType === 'video' && (
                            <Video source={{ uri: item.mediaUrl }} style={styles.postVideo} useNativeControls resizeMode={ResizeMode.COVER} isLooping />
                        )}

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
  
  // ✅ New Tab Styles
  tabContainer: { flexDirection: 'row', gap: 20 },
  tabButton: { alignItems: 'center', paddingVertical: 5 },
  tabText: { fontSize: 16 },
  activeIndicator: { height: 3, width: '100%', borderRadius: 2, marginTop: 4 },

  searchContainer: { padding: 10, borderBottomWidth: 0.5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 40, borderRadius: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  separator: { height: 0.5, width: '100%' },
  tweetContainer: { flexDirection: 'row', padding: 12 },
  avatarContainer: { marginRight: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  contentContainer: { flex: 1 },
  tweetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  name: { fontWeight: 'bold', fontSize: 15, marginRight: 5, flexShrink: 1 },
  handle: { fontSize: 14, flexShrink: 1 },
  tweetText: { fontSize: 15, lineHeight: 20, marginTop: 2, marginBottom: 10 },
  postImage: { width: '100%', height: 250, borderRadius: 15, marginTop: 10, marginBottom: 10 },
  postVideo: { width: '100%', height: 250, borderRadius: 15, marginTop: 10, marginBottom: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 40, marginTop: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionCount: { fontSize: 12, marginLeft: 5 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.65 }
});