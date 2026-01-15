import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // ✅ Added for local refresh
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
// ✅ IMPORT Notif Service
import { getUnreadLocalCount } from '../../services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  const [posts, setPosts] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const [searchTab, setSearchTab] = useState<'Posts' | 'People'>('Posts');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [activeTab, setActiveTab] = useState('All'); 
  const flatListRef = useRef<FlatList>(null); 

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // ✅ RED DOT STATE
  const [hasUnread, setHasUnread] = useState(false);

  // ✅ LISTEN FOR UNREAD NOTIFICATIONS (Social + Local)
  useEffect(() => {
      if (!currentUser) return;
      
      // 1. Social (Firestore) - Realtime Listener
      const q = query(
          collection(db, 'users', currentUser.uid, 'notifications'),
          where('read', '==', false)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
          checkUnreadStatus(snapshot.docs.length);
      });

      return unsubscribe;
  }, []);

  // 2. Local (AsyncStorage) - Check on Focus
  useFocusEffect(
      useCallback(() => {
          checkUnreadStatus();
      }, [])
  );

  const checkUnreadStatus = async (socialCount?: number) => {
      const localCount = await getUnreadLocalCount();
      // If socialCount is undefined (called from focus), we assume social state hasn't changed drastically or rely on the snapshot to update shortly.
      // Ideally, we store social count in a ref or state to combine accurately, but strictly:
      // If EITHER is > 0, show dot.
      
      // Since socialCount comes from the listener, we need to merge it.
      // Simplified: We set true if we detect unread in the current context check.
      
      if (socialCount !== undefined) {
           setHasUnread(socialCount > 0 || localCount > 0);
      } else {
           // We don't have fresh social count here, so just check local + assume social listener handles its part
           if (localCount > 0) setHasUnread(true);
      }
  };

  useEffect(() => {
    const fetchUserInterests = async () => {
      if (!currentUser) return;
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserInterests(data.interests || data.favoriteGenres || []);
        }
      } catch (error) {
        console.log("Error fetching user interests:", error);
      }
    };
    fetchUserInterests();
  }, []);

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

  useEffect(() => {
      if (showSearch && searchTab === 'People' && searchText.trim().length > 1) {
          searchUsers(searchText);
      } else {
          setUserResults([]);
      }
  }, [searchText, searchTab, showSearch]);

  const searchUsers = async (text: string) => {
      setSearchingUsers(true);
      try {
          const usersRef = collection(db, 'users');
          const q = query(
              usersRef, 
              where('username', '>=', text.toLowerCase()), 
              where('username', '<=', text.toLowerCase() + '\uf8ff'),
              limit(20)
          );
          const snapshot = await getDocs(q);
          const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUserResults(results);
      } catch (error) {
          console.error("Search users error:", error);
      } finally {
          setSearchingUsers(false);
      }
  };

  const searchResultsPosts = useMemo(() => {
    if (!searchText.trim()) return [];
    const lowerText = searchText.toLowerCase();
    return posts.filter(p => 
        p.text?.toLowerCase().includes(lowerText) || 
        p.tags?.some((t: string) => t.toLowerCase().includes(lowerText))
    );
  }, [posts, searchText]);

  const trendingGroups = useMemo(() => {
    const groups: Record<string, { name: string, posts: any[], stats: { likes: number, comments: number, reposts: number } }> = {};

    posts.forEach(post => {
        const postTags = (post.tags && post.tags.length > 0) ? post.tags : ['General'];
        postTags.forEach((tag: string) => {
            const normalizedTag = tag.trim().toUpperCase();
            if (!groups[normalizedTag]) {
                groups[normalizedTag] = { 
                    name: normalizedTag, 
                    posts: [], 
                    stats: { likes: 0, comments: 0, reposts: 0 } 
                };
            }
            groups[normalizedTag].posts.push(post);
            groups[normalizedTag].stats.likes += (post.likes?.length || 0);
            groups[normalizedTag].stats.comments += (post.commentCount || 0);
            groups[normalizedTag].stats.reposts += (post.reposts?.length || 0);
        });
    });

    return Object.values(groups).sort((a, b) => {
        const scoreA = a.stats.likes + a.stats.comments + a.stats.reposts;
        const scoreB = b.stats.likes + b.stats.comments + b.stats.reposts;
        return scoreB - scoreA;
    });
  }, [posts]);

  const allPosts = useMemo(() => {
    if (userInterests.length > 0) {
        return [...posts].sort((a, b) => {
            const aMatches = userInterests.some(interest => a.text?.toLowerCase().includes(interest.toLowerCase()) || a.tags?.includes(interest));
            const bMatches = userInterests.some(interest => b.text?.toLowerCase().includes(interest.toLowerCase()) || b.tags?.includes(interest));
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0; 
        });
    }
    return posts; 
  }, [posts, userInterests]);


  const handleTabPress = (tab: string) => {
      setActiveTab(tab);
      if (tab === 'All') {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
          flatListRef.current?.scrollToOffset({ offset: SCREEN_WIDTH, animated: true });
      }
  };

  const handleMomentumScrollEnd = (event: any) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index === 0) setActiveTab('All');
      else setActiveTab('Trending');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
        setRefreshing(false);
    }, 1000);
  }, []);

  const renderUserItem = ({ item }: any) => (
      <TouchableOpacity 
          style={[styles.userCard, { backgroundColor: theme.card }]}
          onPress={() => router.push({ pathname: '/feed-profile', params: { userId: item.id } })}
      >
          <Image 
              source={{ uri: item.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime' }} 
              style={styles.userAvatar} 
          />
          <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
              <Text style={[styles.userHandle, { color: theme.subText }]}>@{item.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.subText} />
      </TouchableOpacity>
  );

  const renderFeedList = (data: any[], emptyMessage: string) => (
    <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100, width: SCREEN_WIDTH }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
        ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center', width: SCREEN_WIDTH }}>
                <Text style={{ color: theme.subText }}>{emptyMessage}</Text>
            </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
    />
  );

  const renderTrendingTab = () => {
      if (selectedGenre) {
          const genreGroup = trendingGroups.find(g => g.name === selectedGenre);
          const genrePosts = genreGroup ? genreGroup.posts : [];
          return (
              <View style={{ flex: 1, width: SCREEN_WIDTH }}>
                  <View style={[styles.genreHeader, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
                      <TouchableOpacity onPress={() => setSelectedGenre(null)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="arrow-back" size={24} color={theme.text} />
                          <Text style={[styles.genreTitle, { color: theme.text }]}>{selectedGenre}</Text>
                      </TouchableOpacity>
                  </View>
                  {renderFeedList(genrePosts, "No posts in this genre.")}
              </View>
          );
      }
      return (
          <FlatList 
              data={trendingGroups}
              keyExtractor={item => item.name}
              contentContainerStyle={{ padding: 15, width: SCREEN_WIDTH, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
              ListEmptyComponent={
                  <View style={{ padding: 40, alignItems: 'center', width: SCREEN_WIDTH }}>
                      <Text style={{ color: theme.subText }}>No trending topics yet.</Text>
                  </View>
              }
              renderItem={({ item }) => (
                  <TouchableOpacity 
                      style={[styles.groupCard, { backgroundColor: theme.card }]}
                      onPress={() => setSelectedGenre(item.name)}
                  >
                      <View style={styles.groupInfo}>
                          <Text style={[styles.groupName, { color: theme.text }]}>#{item.name}</Text>
                          <Text style={[styles.groupCount, { color: theme.subText }]}>{item.posts.length} Posts</Text>
                      </View>
                      <View style={styles.groupStats}>
                          <View style={styles.statPill}>
                              <Ionicons name="heart" size={12} color="#FF6B6B" />
                              <Text style={[styles.statText, { color: theme.text }]}>{item.stats.likes}</Text>
                          </View>
                          <View style={styles.statPill}>
                              <Ionicons name="chatbubble" size={12} color="#4ECDC4" />
                              <Text style={[styles.statText, { color: theme.text }]}>{item.stats.comments}</Text>
                          </View>
                          <View style={styles.statPill}>
                              <Ionicons name="repeat" size={12} color="#45B7D1" />
                              <Text style={[styles.statText, { color: theme.text }]}>{item.stats.reposts}</Text>
                          </View>
                      </View>
                  </TouchableOpacity>
              )}
          />
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        {!showSearch ? (
            <>
                <TouchableOpacity onPress={() => router.push('/feed-profile')}>
                    <Image 
                        source={{ uri: currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
                        style={styles.headerAvatar} 
                    />
                </TouchableOpacity>
                
                <View style={styles.tabContainer}>
                    <TouchableOpacity onPress={() => handleTabPress('All')} style={styles.tabButton}>
                        <Text style={[styles.tabText, { color: activeTab === 'All' ? theme.text : theme.subText, fontWeight: activeTab === 'All' ? 'bold' : 'normal' }]}>All</Text>
                        {activeTab === 'All' && <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleTabPress('Trending')} style={styles.tabButton}>
                        <Text style={[styles.tabText, { color: activeTab === 'Trending' ? theme.text : theme.subText, fontWeight: activeTab === 'Trending' ? 'bold' : 'normal' }]}>Trending</Text>
                        {activeTab === 'Trending' && <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />}
                    </TouchableOpacity>
                </View>
            </>
        ) : (
            <View style={[styles.searchBar, { backgroundColor: theme.card, flex: 1, marginRight: 10 }]}>
                <Ionicons name="search" size={20} color={theme.subText} />
                <TextInput 
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={searchTab === 'People' ? "Search people..." : "Search posts..."}
                    placeholderTextColor={theme.subText}
                    value={searchText}
                    onChangeText={setSearchText}
                    autoFocus
                />
            </View>
        )}
        
        <TouchableOpacity onPress={() => {
            setShowSearch(!showSearch);
            if(showSearch) { setSearchText(''); setSearchTab('Posts'); }
        }}>
            <Ionicons name={showSearch ? "close" : "search"} size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {showSearch && (
          <View style={[styles.searchTabs, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setSearchTab('Posts')} style={[styles.searchTabBtn, searchTab === 'Posts' && { borderBottomColor: theme.tint, borderBottomWidth: 2 }]}>
                  <Text style={{ color: searchTab === 'Posts' ? theme.text : theme.subText, fontWeight: 'bold' }}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSearchTab('People')} style={[styles.searchTabBtn, searchTab === 'People' && { borderBottomColor: theme.tint, borderBottomWidth: 2 }]}>
                  <Text style={{ color: searchTab === 'People' ? theme.text : theme.subText, fontWeight: 'bold' }}>People</Text>
              </TouchableOpacity>
          </View>
      )}

      {showSearch ? (
          <View style={{ flex: 1 }}>
              {searchTab === 'Posts' ? (
                  renderFeedList(searchResultsPosts, searchText ? "No posts found." : "Type to search posts.")
              ) : (
                  searchingUsers ? (
                      <ActivityIndicator style={{ marginTop: 20 }} color={theme.tint} />
                  ) : (
                      <FlatList 
                          data={userResults}
                          keyExtractor={item => item.id}
                          renderItem={renderUserItem}
                          contentContainerStyle={{ padding: 15 }}
                          ListEmptyComponent={
                              <Text style={{ textAlign: 'center', color: theme.subText, marginTop: 20 }}>
                                  {searchText ? "No users found." : "Type to search people."}
                              </Text>
                          }
                      />
                  )
              )}
          </View>
      ) : (
          <FlatList
            ref={flatListRef}
            data={[1, 2]} 
            keyExtractor={item => item.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            initialNumToRender={1}
            renderItem={({ index }) => {
                if (index === 0) return renderFeedList(allPosts, "No posts yet.");
                if (index === 1) return renderTrendingTab(); 
                return null;
            }}
          />
      )}

      {!showSearch && (
        <>
            {/* ✅ NOTIFICATION FAB WITH RED DOT */}
            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: theme.card, bottom: 90 }]} 
                onPress={() => router.push('/notifications')}
            >
                <Ionicons name="notifications-outline" size={28} color={theme.text} />
                {/* 🔴 RED DOT */}
                {hasUnread && (
                    <View style={styles.redDot} />
                )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.fab, { backgroundColor: theme.tint }]}
                onPress={() => router.push('/create-post')}
            >
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 0.5, alignItems: 'center', height: 60 },
  headerAvatar: { width: 30, height: 30, borderRadius: 15 },
  
  tabContainer: { flexDirection: 'row', gap: 20 },
  tabButton: { alignItems: 'center', paddingVertical: 5 },
  tabText: { fontSize: 16 },
  activeIndicator: { height: 3, width: '100%', borderRadius: 2, marginTop: 4 },

  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 40, borderRadius: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  searchTabs: { flexDirection: 'row', borderBottomWidth: 0.5 },
  searchTabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },

  userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 10 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userHandle: { fontSize: 14 },
  
  groupCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 10 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  groupCount: { fontSize: 12 },
  groupStats: { flexDirection: 'row', gap: 8 },
  statPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statText: { fontSize: 12, fontWeight: '600' },
  
  genreHeader: { padding: 15, borderBottomWidth: 0.5, flexDirection: 'row', alignItems: 'center' },
  genreTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.65 },
  
  // ✅ RED DOT STYLE
  redDot: { position: 'absolute', top: 12, right: 14, width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', borderWidth: 1, borderColor: 'white' }
});