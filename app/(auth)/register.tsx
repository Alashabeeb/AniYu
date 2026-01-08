import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
    StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if(!email || !password || !username) return Alert.alert("Error", "Please fill in all fields");
    
    setLoading(true);
    try {
      // 1. Create User in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Auth Profile (so auth.currentUser.displayName works)
      await updateProfile(user, { displayName: username });

      // 3. Save extra User Data to Firestore Database
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username: username,
        email: email,
        createdAt: new Date(),
        role: 'user', 
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
      });

    } catch (error: any) {
      Alert.alert("Registration Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Create Account 🚀</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>Join the AniYu community</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Username</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            placeholder="OtakuKing"
            placeholderTextColor={theme.subText}
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            placeholder="you@example.com"
            placeholderTextColor={theme.subText}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            placeholder="Min 6 characters"
            placeholderTextColor={theme.subText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.tint }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.subText, textAlign: 'center' }}>
            Already have an account? <Text style={{ color: theme.tint, fontWeight: 'bold' }}>Log In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { padding: 25 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { marginBottom: 8, fontWeight: '600' },
  input: { padding: 15, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  button: { padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});