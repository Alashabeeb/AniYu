import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 👇 Added getDoc and doc to fetch real profile
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function CreatePostScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      // 1. Fetch the REAL user profile from Firestore to get the correct Username
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let realUsername = "anonymous";
      let realDisplayName = user.displayName || "Anonymous";
      let realAvatar = user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Anime";

      if (userSnap.exists()) {
        const userData = userSnap.data();
        realUsername = userData.username || realUsername;
        realDisplayName = userData.displayName || realDisplayName;
        realAvatar = userData.avatar || realAvatar;
      }

      // 2. Save the post with SEPARATE display name and username
      await addDoc(collection(db, 'posts'), {
        text: text,
        userId: user.uid,
        displayName: realDisplayName, // e.g. "Monkey D. Luffy"
        username: realUsername,       // e.g. "KingPirate"
        userAvatar: realAvatar,
        createdAt: serverTimestamp(),
        likes: [] 
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
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.subText, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.postBtn, { backgroundColor: text.trim() ? theme.tint : theme.card }]} 
          onPress={handlePost}
          disabled={!text.trim() || loading}
        >
          {loading ? <ActivityIndicator color="white" /> : (
             <Text style={{ color: 'white', fontWeight: 'bold' }}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="What's happening?"
          placeholderTextColor={theme.subText}
          multiline
          autoFocus
          value={text}
          onChangeText={setText}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  postBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  input: { flex: 1, padding: 20, fontSize: 18, textAlignVertical: 'top' },
});