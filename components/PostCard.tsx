import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image'; // Use standard Image if expo-image causes issues
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Define the shape of our data
interface PostProps {
  post: {
    user: string;
    avatar: string;
    time: string;
    content: string;
    likes: number;
    comments: number;
    isSpoiler: boolean;
  };
}

export default function PostCard({ post }: PostProps) {
  // State to track if the spoiler is revealed
  const [revealed, setRevealed] = useState(!post.isSpoiler);

  return (
    <View style={styles.card}>
      {/* Header: Avatar + Name */}
      <View style={styles.header}>
        <Image source={{ uri: post.avatar }} style={styles.avatar} />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.username}>@{post.user}</Text>
          <Text style={styles.time}>{post.time}</Text>
        </View>
        {post.isSpoiler && (
             <View style={styles.spoilerBadge}>
                 <Text style={styles.spoilerText}>SPOILER</Text>
             </View>
        )}
      </View>

      {/* Content Area - The Logic */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => post.isSpoiler && setRevealed(!revealed)}
        style={styles.contentContainer}
      >
        {revealed ? (
          <Text style={styles.contentText}>{post.content}</Text>
        ) : (
          <View style={styles.blurContainer}>
             <Ionicons name="eye-off-outline" size={24} color="#FF6B6B" />
             <Text style={styles.blurText}>Tap to reveal spoiler</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Action Bar (Like/Comment) */}
      <View style={styles.actionBar}>
        <View style={styles.actionItem}>
          <Ionicons name="heart-outline" size={20} color="#888" />
          <Text style={styles.actionText}>{post.likes}</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={20} color="#888" />
          <Text style={styles.actionText}>{post.comments}</Text>
        </View>
        <Ionicons name="share-social-outline" size={20} color="#888" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333' },
  username: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  time: { color: '#888', fontSize: 12 },
  spoilerBadge: { marginLeft: 'auto', backgroundColor: 'rgba(255, 107, 107, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  spoilerText: { color: '#FF6B6B', fontSize: 10, fontWeight: 'bold' },
  
  contentContainer: { minHeight: 60, justifyContent: 'center' },
  contentText: { color: '#ECEDEE', fontSize: 15, lineHeight: 22 },
  
  blurContainer: { 
    backgroundColor: '#2A2A2A', 
    padding: 20, 
    borderRadius: 8, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed'
  },
  blurText: { color: '#FF6B6B', marginTop: 5, fontWeight: '600' },

  actionBar: { flexDirection: 'row', marginTop: 15, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionText: { color: '#888', marginLeft: 6, fontSize: 13 },
});