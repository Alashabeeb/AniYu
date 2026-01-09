import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db, storage } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function CreatePostScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const user = auth.currentUser;
  
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<any>(null);
  const [avatar, setAvatar] = useState(user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime');

  useEffect(() => {
     // Fetch latest avatar just in case
     if(user) {
         getDoc(doc(db, "users", user.uid)).then(doc => {
             if(doc.exists()) setAvatar(doc.data().avatar);
         });
     }
  }, []);

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All, 
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setMedia(result.assets[0]);
  };

  const uploadMediaToStorage = async (uri: string, type: 'image' | 'video') => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `posts/${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handlePost = async () => {
    if (!text.trim() && !media) return;
    setLoading(true);
    try {
      if (!user) throw new Error("Not logged in");

      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      
      const realUsername = userData.username || "anonymous";
      const realDisplayName = userData.displayName || user.displayName || "Anonymous";
      const realAvatar = userData.avatar || user.photoURL;

      let mediaUrl = null;
      let mediaType = null;
      if (media) {
          mediaType = media.type;
          mediaUrl = await uploadMediaToStorage(media.uri, mediaType);
      }

      await addDoc(collection(db, 'posts'), {
        text: text,
        mediaUrl: mediaUrl,   
        mediaType: mediaType,
        userId: user.uid,
        displayName: realDisplayName, 
        username: realUsername,       
        userAvatar: realAvatar,
        createdAt: serverTimestamp(),
        likes: [],
        reposts: [],
        commentCount: 0,
        parentId: null
      });

      router.back(); 
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* ✅ HEADER: Cancel & Post Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.text, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.postBtn, { backgroundColor: (text.trim() || media) ? theme.tint : theme.card }]} 
          onPress={handlePost}
          disabled={(!text.trim() && !media) || loading}
        >
          {loading ? <ActivityIndicator color="white" size="small" /> : (
             <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
         {/* ✅ AVATAR (Left Side) */}
         <Image source={{ uri: avatar }} style={styles.avatar} />

         <View style={{ flex: 1 }}>
            {/* ✅ TEXT INPUT */}
            <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="What's happening?"
                placeholderTextColor={theme.subText}
                multiline
                autoFocus
                value={text}
                onChangeText={setText}
            />

            {/* ✅ MEDIA PREVIEW (Twitter Style: Rounded Corners, Remove Btn) */}
            {media && (
                <View style={styles.previewWrapper}>
                    {media.type === 'video' ? (
                        <Video
                            source={{ uri: media.uri }}
                            style={styles.mediaPreview}
                            useNativeControls
                            resizeMode={ResizeMode.COVER}
                        />
                    ) : (
                        <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                    )}
                    {/* Remove Button */}
                    <TouchableOpacity style={styles.removeBtn} onPress={() => setMedia(null)}>
                        <Ionicons name="close" size={18} color="white" />
                    </TouchableOpacity>
                </View>
            )}
         </View>
      </View>

      {/* ✅ TOOLBAR (Sticks to Keyboard) */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.toolbar, { borderTopColor: theme.border }]}>
            <TouchableOpacity onPress={pickMedia} style={styles.toolIcon}>
                <Ionicons name="image-outline" size={24} color={theme.tint} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="camera-outline" size={24} color={theme.tint} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="list-outline" size={24} color={theme.tint} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="location-outline" size={24} color={theme.tint} />
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      paddingHorizontal: 20, 
      paddingVertical: 10,
  },
  postBtn: { 
      paddingHorizontal: 20, 
      paddingVertical: 8, 
      borderRadius: 20, 
      minWidth: 70, 
      alignItems: 'center' 
  },

  // Content Layout
  contentContainer: { flexDirection: 'row', flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  
  // Input
  input: { 
      fontSize: 18, 
      textAlignVertical: 'top', 
      minHeight: 50, 
      paddingTop: 10, // Align text with avatar
      paddingBottom: 20 
  },

  // Media Preview
  previewWrapper: { position: 'relative', marginTop: 10, marginRight: 10 },
  mediaPreview: { width: '100%', height: 250, borderRadius: 16 },
  removeBtn: { 
      position: 'absolute', top: 8, right: 8, 
      backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 15, padding: 6 
  },

  // Toolbar above keyboard
  toolbar: { 
      flexDirection: 'row', 
      paddingVertical: 12, 
      paddingHorizontal: 20, 
      borderTopWidth: 0.5, 
      alignItems: 'center' 
  },
  toolIcon: { marginRight: 25 }
});