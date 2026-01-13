import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router'; // ✅ Added Stack
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

const GENRES = ["Action", "Adventure", "Romance", "Fantasy", "Drama", "Comedy", "Sci-Fi", "Slice of Life", "Sports", "Mystery"];

export default function EditProfileScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

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
        setAvatarSeed(data.avatar?.split('seed=')[1] || data.username);
        setInterests(data.interests || []);
      }
    } catch (error) {
      console.log("Error loading profile:", error);
    }
  };

  const randomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    setAvatarSeed(randomSeed);
  };

  const toggleInterest = (genre: string) => {
      if (interests.includes(genre)) {
          setInterests(interests.filter(i => i !== genre));
      } else {
          setInterests([...interests, genre]);
      }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const newAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`;

      await updateProfile(user, { 
          displayName: displayName, 
          photoURL: newAvatarUrl 
      });

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName,
        username: username,
        bio: bio,
        avatar: newAvatarUrl,
        interests: interests 
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
      
      {/* ✅ NATIVE HEADER CONFIGURATION */}
      <Stack.Screen 
        options={{
            title: 'Edit Profile',
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { fontWeight: 'bold' },
            headerRight: () => (
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color={theme.tint} /> : (
                        <Text style={{ color: theme.tint, fontWeight: 'bold', fontSize: 16 }}>Save</Text>
                    )}
                </TouchableOpacity>
            )
        }}
      />

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

            {/* Interests Section */}
            <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.subText }]}>My Interests (Select for Feed)</Text>
                <Text style={[styles.hint, { marginBottom: 10 }]}>These help us show you posts you like in the "All" tab.</Text>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {GENRES.map(genre => (
                        <TouchableOpacity 
                            key={genre}
                            onPress={() => toggleInterest(genre)}
                            style={{
                                paddingHorizontal: 14, 
                                paddingVertical: 8, 
                                borderRadius: 20,
                                backgroundColor: interests.includes(genre) ? theme.tint : theme.card,
                                borderWidth: 1, 
                                borderColor: interests.includes(genre) ? theme.tint : theme.border
                            }}
                        >
                            <Text style={{ 
                                color: interests.includes(genre) ? 'white' : theme.text, 
                                fontSize: 13,
                                fontWeight: '600'
                            }}>{genre}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Custom header styles REMOVED
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, marginBottom: 15 },
  changeAvatarBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  formGroup: { marginBottom: 20 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  input: { padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: 'gray', marginTop: 5 },
});