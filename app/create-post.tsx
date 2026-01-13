import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router'; // ✅ Added Stack
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db, storage } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

const GENRES = ["Action", "Adventure", "Romance", "Fantasy", "Drama", "Comedy", "Sci-Fi", "Slice of Life", "Sports", "Mystery"];

export default function CreatePostScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const user = auth.currentUser;
  
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<any>(null);
  const [avatar, setAvatar] = useState(user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anime');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
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
        tags: selectedTag ? [selectedTag] : [], 
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
      
      {/* ✅ NATIVE HEADER CONFIGURATION */}
      <Stack.Screen 
        options={{
            title: 'Create Post',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={{ color: theme.text, fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity 
                  onPress={handlePost} 
                  disabled={(!text.trim() && !media) || loading}
                  style={{ 
                    backgroundColor: (!text.trim() && !media) ? theme.card : theme.tint,
                    paddingHorizontal: 15,
                    paddingVertical: 6,
                    borderRadius: 20
                  }}
                >
                  {loading ? <ActivityIndicator color="white" size="small" /> : (
                     <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Post</Text>
                  )}
                </TouchableOpacity>
            )
        }}
      />

      {/* 2. Scrollable Content Area */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
         <View style={styles.inputRow}>
             <Image source={{ uri: avatar }} style={styles.avatar} />
             
             <View style={{ flex: 1 }}>
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="What's happening?"
                    placeholderTextColor={theme.subText}
                    multiline
                    autoFocus
                    value={text}
                    onChangeText={setText}
                />

                {/* Media Preview inside the scroll area */}
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
                        <TouchableOpacity style={styles.removeBtn} onPress={() => setMedia(null)}>
                            <Ionicons name="close" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
             </View>
         </View>

         {/* Genre/Tag Selector UI */}
         <View style={{ marginTop: 20, paddingHorizontal: 15 }}>
            <Text style={{ color: theme.subText, fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
                ADD A TOPIC TAG (Optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {GENRES.map(genre => (
                    <TouchableOpacity 
                        key={genre}
                        onPress={() => setSelectedTag(genre === selectedTag ? '' : genre)}
                        style={{
                            paddingHorizontal: 14, 
                            paddingVertical: 8, 
                            borderRadius: 20, 
                            backgroundColor: selectedTag === genre ? theme.tint : theme.card,
                            borderWidth: 1, 
                            borderColor: selectedTag === genre ? theme.tint : theme.border
                        }}
                    >
                        <Text style={{ 
                            color: selectedTag === genre ? 'white' : theme.text, 
                            fontSize: 12,
                            fontWeight: '600'
                        }}>{genre}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
         </View>

      </ScrollView>

      {/* 3. Toolbar Fixed at Bottom */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} 
      >
        <View style={[styles.toolbar, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <TouchableOpacity onPress={pickMedia} style={styles.toolIcon}>
                <Ionicons name="image-outline" size={24} color={theme.tint} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="camera-outline" size={24} color={theme.tint} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="list-outline" size={24} color={theme.tint} />
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Custom header styles REMOVED
  
  // Content Layout
  scrollContent: { paddingVertical: 10 },
  inputRow: { flexDirection: 'row', paddingHorizontal: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  
  // Input
  input: { 
      fontSize: 18, 
      textAlignVertical: 'top', 
      minHeight: 50, 
      paddingTop: 10, 
      paddingBottom: 20,
      width: '100%' 
  },

  // Media Preview
  previewWrapper: { position: 'relative', marginTop: 10, marginRight: 10, marginBottom: 20 },
  mediaPreview: { width: '100%', height: 250, borderRadius: 16 },
  removeBtn: { 
      position: 'absolute', top: 8, right: 8, 
      backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 15, padding: 6 
  },

  // Toolbar
  toolbar: { 
      flexDirection: 'row', 
      paddingVertical: 12, 
      paddingHorizontal: 20, 
      borderTopWidth: 0.5, 
      alignItems: 'center' 
  },
  toolIcon: { marginRight: 25 }
});