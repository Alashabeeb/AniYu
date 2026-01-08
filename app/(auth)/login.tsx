import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
    StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { auth } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if(!email || !password) return Alert.alert("Error", "Please fill in all fields");
    
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The RootLayout in app/_layout.tsx detects the login and redirects automatically
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
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
        <Text style={[styles.title, { color: theme.text }]}>Welcome Back! 👋</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>Sign in to continue to AniYu</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            placeholder="Enter your email"
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
            placeholder="Enter your password"
            placeholderTextColor={theme.subText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.tint }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.subText, textAlign: 'center' }}>
            Don't have an account? <Text style={{ color: theme.tint, fontWeight: 'bold' }}>Sign Up</Text>
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