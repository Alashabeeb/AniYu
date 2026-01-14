import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard'; // ✅ Imported PostCard
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
  const [userInterests, setUserInterests] = useState<string[]>([]);

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
            // Sort by engagement (Likes + Reposts + Comments)
            result.sort((a, b) => {
                const scoreA = (a.likes?.length || 0) + (a.reposts?.length || 0) + (a.commentCount || 0);
                const scoreB = (b.likes?.length || 0) + (b.reposts?.length || 0) + (b.commentCount || 0);
                return scoreB - scoreA; 
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

      {/* ✅ LIST USING POSTCARD COMPONENT */}
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

        renderItem={({ item }) => (
            // ✅ Now using PostCard which includes Report/Delete/Like/Repost logic
            <PostCard post={item} />
        )}
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