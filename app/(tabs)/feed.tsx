import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import PostCard from '../../components/PostCard'; // ✅ Imported PostCard
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FeedScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  // ✅ State Management
  const [posts, setPosts] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  
  // ✅ Search & Refresh State
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState('');

  // ✅ Tab & Swipe State
  const [activeTab, setActiveTab] = useState('All'); 
  const flatListRef = useRef<FlatList>(null); // Ref to scroll the horizontal list

  // 1. Fetch User Interests
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

  // 3. ✅ DERIVED DATA LISTS (Memoized for performance)
  // These calculate automatically whenever 'posts' or 'searchText' changes
  
  // A. Search Results
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const lowerText = searchText.toLowerCase();
    return posts.filter(p => 
        p.text?.toLowerCase().includes(lowerText) || 
        p.username?.toLowerCase().includes(lowerText) ||
        p.displayName?.toLowerCase().includes(lowerText)
    );
  }, [posts, searchText]);

  // B. "Trending" List (Sorted by Engagement)
  const trendingPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
        const scoreA = (a.likes?.length || 0) + (a.reposts?.length || 0) + (a.commentCount || 0);
        const scoreB = (b.likes?.length || 0) + (b.reposts?.length || 0) + (b.commentCount || 0);
        return scoreB - scoreA; 
    });
  }, [posts]);

  // C. "All" List (Personalized / Chronological)
  const allPosts = useMemo(() => {
    if (userInterests.length > 0) {
        return [...posts].sort((a, b) => {
            const aMatches = userInterests.some(interest => 
                a.text?.toLowerCase().includes(interest.toLowerCase()) || 
                a.tags?.includes(interest)
            );
            const bMatches = userInterests.some(interest => 
                b.text?.toLowerCase().includes(interest.toLowerCase()) || 
                b.tags?.includes(interest)
            );
            // Put matches first
            if (aMatches && !bMatches) return -1;
            if (!aMatches && bMatches) return 1;
            return 0; // Maintain date order otherwise
        });
    }
    return posts; // Default to chronological if no interests
  }, [posts, userInterests]);


  // ✅ Swipe & Tab Handlers
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

  // ✅ Reusable Feed List Component (Vertical)
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.push('/feed-profile')}>
            <Image 
                source={{ uri: currentUser?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' }} 
                style={styles.headerAvatar} 
            />
        </TouchableOpacity>
        
        {/* TABS (Clickable) */}
        {!showSearch && (
            <View style={styles.tabContainer}>
                <TouchableOpacity onPress={() => handleTabPress('All')} style={styles.tabButton}>
                    <Text style={[
                        styles.tabText, 
                        { color: activeTab === 'All' ? theme.text : theme.subText, fontWeight: activeTab === 'All' ? 'bold' : 'normal' }
                    ]}>All</Text>
                    {activeTab === 'All' && <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => handleTabPress('Trending')} style={styles.tabButton}>
                    <Text style={[
                        styles.tabText, 
                        { color: activeTab === 'Trending' ? theme.text : theme.subText, fontWeight: activeTab === 'Trending' ? 'bold' : 'normal' }
                    ]}>Trending</Text>
                    {activeTab === 'Trending' && <View style={[styles.activeIndicator, { backgroundColor: theme.tint }]} />}
                </TouchableOpacity>
            </View>
        )}
        
        <TouchableOpacity onPress={() => {
            setShowSearch(!showSearch);
            if(showSearch) setSearchText('');
        }}>
            <Ionicons name={showSearch ? "close" : "search"} size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* SEARCH BAR */}
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

      {/* ✅ MAIN CONTENT */}
      {showSearch && searchText.trim() !== '' ? (
          // 1. Search Mode: Single List
          renderFeedList(searchResults, "No results found.")
      ) : (
          // 2. Swipe Mode: Horizontal List containing Two Vertical Lists
          <FlatList
            ref={flatListRef}
            data={[1, 2]} // Dummy data to create 2 pages
            keyExtractor={item => item.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            initialNumToRender={1}
            renderItem={({ index }) => {
                if (index === 0) return renderFeedList(allPosts, "No posts yet.");
                if (index === 1) return renderFeedList(trendingPosts, "No trending posts yet.");
                return null;
            }}
          />
      )}

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
  
  // Tab Styles
  tabContainer: { flexDirection: 'row', gap: 20 },
  tabButton: { alignItems: 'center', paddingVertical: 5 },
  tabText: { fontSize: 16 },
  activeIndicator: { height: 3, width: '100%', borderRadius: 2, marginTop: 4 },

  searchContainer: { padding: 10, borderBottomWidth: 0.5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 40, borderRadius: 20 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16 },

  separator: { height: 0.5, width: '100%' },
  
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.65 }
});