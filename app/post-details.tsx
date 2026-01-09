import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc,
    arrayRemove, arrayUnion,
    collection, doc,
    increment,
    onSnapshot, orderBy,
    query, serverTimestamp, updateDoc,
    where
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList, KeyboardAvoidingView, Platform, Share, StyleSheet,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function PostDetailsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { postId } = useLocalSearchParams(); 
  const user = auth.currentUser;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!postId) return;

    // 1. Fetch MAIN Post
    const postUnsub = onSnapshot(doc(db, 'posts', postId as string), (doc) => {
      if (doc.exists()) setPost({ id: doc.id, ...doc.data() });
    });

    // 2. Fetch REPLIES (Query 'posts' where parentId == current postId)
    const q = query(
        collection(db, 'posts'), 
        where('parentId', '==', postId), 
        orderBy('createdAt', 'desc')
    );
    const commentsUnsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { postUnsub(); commentsUnsub(); };
  }, [postId]);

  const toggleAction = async (id: string, field: 'likes' | 'reposts', currentArray: string[]) => {
      if (!user) return;
      const ref = doc(db, 'posts', id);
      const isActive = currentArray?.includes(user.uid);
      await updateDoc(ref, { [field]: isActive ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const handleShare = async (text: string) => {
      try { await Share.share({ message: text }); } catch (e) {}
  };

  const goToDetails = (id: string) => {
      router.push({ pathname: '/post-details', params: { postId: id } });
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !user) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'posts'), {
        text: newComment,
        userId: user.uid,
        username: user.displayName || "Anonymous",
        userAvatar: user.photoURL, 
        createdAt: serverTimestamp(),
        parentId: postId, 
        likes: [],
        reposts: [],
        commentCount: 0
      });

      await updateDoc(doc(db, 'posts', postId as string), {
        commentCount: increment(1)
      });

      setNewComment('');
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (!post) return <View style={[styles.container, { backgroundColor: theme.background }]} />;

  // Helper to calculate time (e.g. "2s", "5m")
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp?.seconds) return "now";
    const seconds = Math.floor((new Date().getTime() / 1000) - timestamp.seconds);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds/3600)}h`;
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const renderComment = ({ item }: { item: any }) => {
      const isLiked = item.likes?.includes(user?.uid);
      const isReposted = item.reposts?.includes(user?.uid);
      
      // ✅ Use smart time format
      const timeAgo = formatTimeAgo(item.createdAt);

      return (
        <TouchableOpacity 
            style={[styles.commentItem, { borderBottomColor: theme.border }]}
            onPress={() => goToDetails(item.id)} 
            activeOpacity={0.7}
        >
            <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
            <View style={{ flex: 1 }}>
                <View style={styles.row}>
                    <Text style={[styles.commentName, { color: theme.text }]}>{item.username}</Text>
                    <Text style={[styles.commentTime, { color: theme.subText }]}>· {timeAgo}</Text>
                </View>
                <Text style={{ color: theme.text, marginTop: 2, marginBottom: 8 }}>{item.text}</Text>

                <View style={styles.commentActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => toggleAction(item.id, 'likes', item.likes || [])}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={16} color={isLiked ? "#FF6B6B" : theme.subText} />
                        <Text style={[styles.actionText, { color: theme.subText }]}>{item.likes?.length || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => goToDetails(item.id)}>
                        <Ionicons name="chatbubble-outline" size={16} color={theme.subText} />
                        <Text style={[styles.actionText, { color: theme.subText }]}>{item.commentCount || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => toggleAction(item.id, 'reposts', item.reposts || [])}>
                        <Ionicons name="repeat-outline" size={16} color={isReposted ? "#00BA7C" : theme.subText} />
                         <Text style={[styles.actionText, { color: theme.subText }]}>{item.reposts?.length || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item.text)}>
                        <Ionicons name="share-outline" size={16} color={theme.subText} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Post</Text>
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
           <View style={[styles.mainPost, { borderBottomColor: theme.border }]}>
              <View style={styles.row}>
                 <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
                 <View style={{ marginLeft: 10 }}>
                    <Text style={[styles.name, { color: theme.text }]}>{post.displayName || post.username}</Text>
                    <Text style={[styles.handle, { color: theme.subText }]}>@{post.username}</Text>
                 </View>
              </View>
              <Text style={[styles.postText, { color: theme.text }]}>{post.text}</Text>
              
              {/* Main Post Date */}
              <Text style={{ color: theme.subText, marginTop: 10, fontSize: 12 }}>
                 {post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
              </Text>
              
              <View style={[styles.statsRow, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
                  <Text style={{ color: theme.subText }}><Text style={{ fontWeight: 'bold', color: theme.text }}>{post.likes?.length || 0}</Text> Likes</Text>
                  <Text style={{ color: theme.subText, marginLeft: 15 }}><Text style={{ fontWeight: 'bold', color: theme.text }}>{post.reposts?.length || 0}</Text> Reposts</Text>
                  <Text style={{ color: theme.subText, marginLeft: 15 }}><Text style={{ fontWeight: 'bold', color: theme.text }}>{post.commentCount || 0}</Text> Comments</Text>
              </View>

              <View style={styles.mainActions}>
                   <TouchableOpacity onPress={() => toggleAction(postId as string, 'likes', post.likes || [])}><Ionicons name={post.likes?.includes(user?.uid)?"heart":"heart-outline"} size={22} color={theme.text} /></TouchableOpacity>
                   <TouchableOpacity><Ionicons name="chatbubble-outline" size={22} color={theme.text} /></TouchableOpacity>
                   <TouchableOpacity onPress={() => toggleAction(postId as string, 'reposts', post.reposts || [])}><Ionicons name="repeat-outline" size={22} color={theme.text} /></TouchableOpacity>
                   <TouchableOpacity onPress={() => handleShare(post.text)}><Ionicons name="share-outline" size={22} color={theme.text} /></TouchableOpacity>
              </View>
           </View>
        )}
        renderItem={renderComment}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.card }]}
                placeholder="Post your reply"
                placeholderTextColor={theme.subText}
                value={newComment}
                onChangeText={setNewComment}
            />
            <TouchableOpacity onPress={handleSendComment} disabled={!newComment.trim() || sending}>
                {sending ? <ActivityIndicator color={theme.tint} /> : <Ionicons name="send" size={24} color={theme.tint} />}
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20 },
  mainPost: { padding: 15, borderBottomWidth: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  name: { fontWeight: 'bold', fontSize: 16 },
  handle: { fontSize: 14 },
  postText: { fontSize: 18, marginTop: 10, lineHeight: 26 },
  statsRow: { flexDirection: 'row', marginTop: 15, paddingVertical: 10, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
  mainActions: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10 },
  
  commentItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 0.5 },
  commentAvatar: { width: 35, height: 35, borderRadius: 17.5, marginRight: 10 },
  commentName: { fontWeight: 'bold', fontSize: 14 },
  commentTime: { fontSize: 12 },
  
  commentActions: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 40, marginTop: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 12, marginLeft: 5 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 0.5 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, fontSize: 16 },
});