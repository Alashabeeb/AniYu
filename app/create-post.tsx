import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
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
  
  // ✅ UPDATED: State to hold multiple tags (Array)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // ✅ UPDATED: Toggle Tag Selection Logic (Max 3)
  const toggleTag = (tag: string) => {
      if (selectedTags.includes(tag)) {
          // Remove tag if already selected
          setSelectedTags(selectedTags.filter(t => t !== tag));
      } else {
          // Add tag if limit not reached
          if (selectedTags.length < 3) {
              setSelectedTags([...selectedTags, tag]);
          } else {
              Alert.alert("Limit Reached", "You can only select up to 3 topics.");
          }
      }
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
        tags: selectedTags, // ✅ Saves the array of tags
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
      
      {/* Header */}
      <Stack.Screen 
        options={{
            title: '', 
            headerStyle: { backgroundColor: theme.background },
            headerShadowVisible: false,
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

                {/* Media Preview */}
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
                            <Ionicons name="close" size={16} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
             </View>
         </View>

         {/* Compact Toolbar */}
         <View style={styles.inlineToolbar}>
            <TouchableOpacity onPress={pickMedia} style={styles.toolIcon}>
                <Ionicons name="image-outline" size={20} color={theme.tint} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="camera-outline" size={20} color={theme.tint} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolIcon}>
                <Ionicons name="list-outline" size={20} color={theme.tint} />
            </TouchableOpacity>
         </View>

         {/* Topic Tag Selector */}
         <View style={{ marginTop: 5, paddingHorizontal: 15 }}>
            <Text style={{ color: theme.subText, fontSize: 11, marginBottom: 8, fontWeight: 'bold' }}>
                ADD TOPICS ({selectedTags.length}/3)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {GENRES.map(genre => {
                    // ✅ CHECK IF SELECTED
                    const isSelected = selectedTags.includes(genre);
                    return (
                        <TouchableOpacity 
                            key={genre}
                            onPress={() => toggleTag(genre)}
                            style={{
                                paddingHorizontal: 12, 
                                paddingVertical: 6, 
                                borderRadius: 15, 
                                backgroundColor: isSelected ? theme.tint : theme.card,
                                borderWidth: 1, 
                                borderColor: isSelected ? theme.tint : theme.border
                            }}
                        >
                            <Text style={{ 
                                color: isSelected ? 'white' : theme.text, 
                                fontSize: 11,
                                fontWeight: '600'
                            }}>{genre}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
         </View>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 10 },
  inputRow: { flexDirection: 'row', paddingHorizontal: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  
  input: { 
      fontSize: 18, 
      textAlignVertical: 'top', 
      minHeight: 60, 
      paddingTop: 10, 
      paddingBottom: 10,
      width: '100%' 
  },

  previewWrapper: { position: 'relative', marginTop: 10, marginRight: 10, marginBottom: 10 },
  mediaPreview: { width: '100%', height: 200, borderRadius: 12 },
  removeBtn: { 
      position: 'absolute', top: 6, right: 6, 
      backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 
  },

  inlineToolbar: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    marginTop: 0,
    alignItems: 'center'
  },
  toolIcon: { 
    marginRight: 20 
  }
});