import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Accept 'theme' as a prop
export default function PostCard({ post, theme }: any) {
  const [liked, setLiked] = useState(false);

  // Fallback theme if not passed (prevents crash)
  const colors = theme || { card: '#1E1E1E', text: 'white', subText: 'gray', border: '#333' };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: post.avatar }} style={styles.avatar} />
        <View style={{ marginLeft: 10 }}>
            <Text style={[styles.user, { color: colors.text }]}>@{post.user}</Text>
            <Text style={{ color: colors.subText, fontSize: 12 }}>{post.time}</Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>
      
      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} contentFit="cover" />
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setLiked(!liked)}>
             <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? "#FF6B6B" : colors.subText} />
             <Text style={{ color: colors.subText, marginLeft: 5 }}>{post.likes + (liked ? 1 : 0)}</Text>
        </TouchableOpacity>
        <View style={styles.actionBtn}>
             <Ionicons name="chatbubble-outline" size={20} color={colors.subText} />
             <Text style={{ color: colors.subText, marginLeft: 5 }}>{post.comments}</Text>
        </View>
        <Ionicons name="share-social-outline" size={20} color={colors.subText} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 15, marginBottom: 15, borderRadius: 12, borderWidth: 1, marginHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  user: { fontWeight: 'bold', fontSize: 15 },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  postImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' }
});