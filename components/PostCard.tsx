import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable, // ✅ Changed to Pressable for better touch handling
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
// ✅ IMPORT NOTIFICATION SERVICE
import { sendSocialNotification } from '../services/notificationService';

interface PostCardProps {
  post: any;
}

const REPORT_REASONS = [
  "Offensive content",
  "Abusive behavior",
  "Spam",
  "Misinformation",
  "Sexual content",
  "Other"
];

export default function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const currentUser = auth.currentUser;

  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const isLiked = post.likes?.includes(currentUser?.uid);
  const isReposted = post.reposts?.includes(currentUser?.uid);
  const isOwner = post.userId === currentUser?.uid;

  // ✅ Video Player Setup
  const videoSource = post.mediaType === 'video' && post.mediaUrl ? post.mediaUrl : null;
  const player = useVideoPlayer(videoSource, player => {
    if (videoSource) {
        player.loop = true;
    }
  });

  // Time logic
  let timeAgo = "now";
  if (post.createdAt?.seconds) {
    const seconds = Math.floor((new Date().getTime() / 1000) - post.createdAt.seconds);
    if (seconds < 60) timeAgo = `${seconds}s`;
    else if (seconds < 3600) timeAgo = `${Math.floor(seconds / 60)}m`;
    else if (seconds < 86400) timeAgo = `${Math.floor(seconds / 3600)}h`;
    else timeAgo = new Date(post.createdAt.seconds * 1000).toLocaleDateString();
  }

  // ✅ Navigation Wrapper
  const handleGoToDetails = () => {
    router.push({ pathname: '/post-details', params: { postId: post.id } });
  };

  const handleLike = async () => {
    if (!currentUser) return;
    
    // ✅ Send Notification if liking for the first time
    if (!isLiked) {
        sendSocialNotification(
            post.userId, 
            'like', 
            { uid: currentUser.uid, name: currentUser.displayName || 'User', avatar: currentUser.photoURL || '' },
            '',
            post.id
        );
    }

    const postRef = doc(db, 'posts', post.id);
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const handleRepost = async () => {
    if (!currentUser) return;

    if (!isReposted) {
        // ✅ Send Notification
        sendSocialNotification(
            post.userId, 
            'repost', 
            { uid: currentUser.uid, name: currentUser.displayName || 'User', avatar: currentUser.photoURL || '' },
            '',
            post.id
        );
    }

    const postRef = doc(db, 'posts', post.id);
    await updateDoc(postRef, {
      reposts: isReposted ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });
  };

  const handleDelete = async () => {
    setMenuVisible(false);
    Alert.alert("Delete Post", "Are you sure you want to delete this post?", [
        { text: "Cancel", style: "cancel" },
        { 
            text: "Delete", 
            style: "destructive", 
            onPress: async () => {
                try {
                    await deleteDoc(doc(db, "posts", post.id));
                } catch (error) {
                    Alert.alert("Error", "Could not delete post.");
                }
            } 
        }
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!currentUser) return;
    setReportLoading(true);
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post',
        targetId: post.id,
        targetContent: post.text || 'media',
        reportedBy: currentUser.uid,
        reason: reason,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      Alert.alert("Report Submitted", "Thank you. We will review this post.");
      setReportModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Could not submit report.");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    // ✅ WRAP EVERYTHING IN PRESSABLE TO MAKE CARD CLICKABLE
    <Pressable 
      onPress={handleGoToDetails} 
      style={[styles.container, { borderBottomColor: theme.border }]}
    >
      <View style={{ flexDirection: 'row' }}>
        
        {/* Avatar Link (Stops propagation so it goes to profile, not post details) */}
        <TouchableOpacity onPress={(e) => {
            e.stopPropagation(); // Prevent going to details
            router.push({ pathname: '/feed-profile', params: { userId: post.userId } });
        }}>
          <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {post.displayName}
              </Text>
              <Text style={[styles.handle, { color: theme.subText }]} numberOfLines={1}>
                @{post.username} · {timeAgo}
              </Text>
            </View>

            {/* Menu Button (Stops propagation) */}
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setMenuVisible(true); }} style={styles.dotsButton}>
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          {post.text ? <Text style={[styles.text, { color: theme.text }]}>{post.text}</Text> : null}

          {post.tags && post.tags.length > 0 && (
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {post.tags.map((tag: string, index: number) => (
                    <Text key={index} style={{ color: theme.tint, fontSize: 13, fontWeight: '600' }}>#{tag}</Text>
                ))}
             </View>
          )}

          {/* Media Rendering */}
          {post.mediaUrl && post.mediaType === 'image' && (
            <Image source={{ uri: post.mediaUrl }} style={styles.media} contentFit="cover" />
          )}
          
          {post.mediaUrl && post.mediaType === 'video' && (
            // Video view handles its own touches for playback
            <VideoView 
                player={player} 
                style={styles.media} 
                contentFit="cover"
                allowsFullscreen 
                allowsPictureInPicture
            />
          )}

          {/* Action Buttons (Stop propagation so they don't trigger navigation) */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleLike(); }}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "#FF6B6B" : theme.subText} />
              <Text style={[styles.count, { color: isLiked ? "#FF6B6B" : theme.subText }]}>{post.likes?.length || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleGoToDetails(); }}>
              <Ionicons name="chatbubble-outline" size={18} color={theme.subText} />
              <Text style={[styles.count, { color: theme.subText }]}>{post.commentCount || 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={(e) => { e.stopPropagation(); handleRepost(); }}>
              <Ionicons name="repeat-outline" size={18} color={isReposted ? "#00BA7C" : theme.subText} />
              <Text style={[styles.count, { color: isReposted ? "#00BA7C" : theme.subText }]}>{post.reposts?.length || 0}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionBtn} onPress={(e) => e.stopPropagation()}>
                <Ionicons name="share-social-outline" size={18} color={theme.subText} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🟢 MENU MODAL */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
                    {isOwner ? (
                        <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                            <Text style={[styles.menuText, { color: '#FF6B6B' }]}>Delete Post</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity 
                            style={styles.menuItem} 
                            onPress={() => { setMenuVisible(false); setReportModalVisible(true); }}
                        >
                            <Ionicons name="flag-outline" size={20} color="red" />
                            <Text style={[styles.menuText, { color: 'red' }]}>Report Post</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                         <Ionicons name="close" size={20} color={theme.text} />
                         <Text style={[styles.menuText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 🔴 REPORT REASON MODAL */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.reportContainer, { backgroundColor: theme.background }]}>
                <Text style={[styles.reportTitle, { color: theme.text }]}>Report Post</Text>
                <Text style={{ color: theme.subText, marginBottom: 15, textAlign: 'center' }}>
                    Why are you reporting this post?
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
                <TouchableOpacity style={{ marginTop: 10, padding: 10 }} onPress={() => setReportModalVisible(false)}>
                    <Text style={{ color: theme.tint, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                {reportLoading && <ActivityIndicator style={{ position: 'absolute' }} size="large" color={theme.tint} />}
            </View>
        </View>
      </Modal>

    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 15, borderBottomWidth: 0.5 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#eee' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontWeight: 'bold', fontSize: 15, marginRight: 6, flexShrink: 1 },
  handle: { fontSize: 14, flexShrink: 1 },
  dotsButton: { padding: 5, marginTop: -5 },
  text: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  media: { width: '100%', height: 250, borderRadius: 12, marginBottom: 10, backgroundColor: '#f0f0f0' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingRight: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 50 },
  count: { fontSize: 12, marginLeft: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: 250, borderRadius: 12, padding: 10, elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  menuText: { fontSize: 16, marginLeft: 12, fontWeight: '500' },
  reportContainer: { width: '90%', borderRadius: 16, padding: 20, alignItems: 'center', elevation: 10 },
  reportTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 15, borderBottomWidth: 0.5 }
});