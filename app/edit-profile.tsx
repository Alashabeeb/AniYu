import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert, KeyboardAvoidingView, Platform, ScrollView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');

  // 1. Load current data when screen opens
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setDisplayName(data.displayName || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        // Extract seed from URL or default to username
        setAvatarSeed(data.avatar?.split('seed=')[1] || data.username);
      }
    } catch (error) {
      console.log("Error loading profile:", error);
    }
  };

  // 2. Generate a new random avatar
  const randomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
  };

  // 3. Save Changes
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

      // A. Update Auth Profile (Display Name only)
      await updateProfile(user, { 
          displayName: displayName, 
          photoURL: newAvatarUrl 
      });

      // B. Update Database (All fields)
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        username: username,
        bio: bio,
        avatar: newAvatarUrl
      });

      Alert.alert("Success", "Profile updated!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.tint} /> : (
                <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 16 }}>Save</Text>
            )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
                <Image 
                    source={{ uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}` }} 
                    style={[styles.avatar, { borderColor: theme.border }]} 
                />
                <TouchableOpacity onPress={randomizeAvatar} style={[styles.changeAvatarBtn, { backgroundColor: theme.card }]}>
                    <Ionicons name="dice-outline" size={20} color={theme.tint} />
                    <Text style={{ color: theme.tint, marginLeft: 5, fontWeight: '600' }}>Randomize Avatar</Text>
                </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.subText }]}>Display Name</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="e.g. Monkey D. Luffy"
                    placeholderTextColor={theme.subText}
                />
                <Text style={styles.hint}>This name will appear above your username.</Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.subText }]}>Username</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="e.g. KingOfThePirates"
                    placeholderTextColor={theme.subText}
                    autoCapitalize="none"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.subText }]}>Bio</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor={theme.subText}
                    multiline
                    numberOfLines={4}
                />
            </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, marginBottom: 15 },
  changeAvatarBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  formGroup: { marginBottom: 20 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  input: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: 'gray', marginTop: 5 },
});