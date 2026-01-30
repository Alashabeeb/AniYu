import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import CustomAlert from '../../components/CustomAlert';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ UPDATED: State now holds secondary button props
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: '',
    secondaryButtonText: undefined as string | undefined,
    onSecondaryPress: undefined as (() => void) | undefined
  });

  // ✅ UPDATED: Helper accepts optional secondary actions
  const showAlert = (
    type: 'success' | 'error' | 'warning' | 'info', 
    title: string, 
    message: string,
    secondaryText?: string,
    secondaryAction?: () => void
  ) => {
    setAlertConfig({ 
      visible: true, 
      type, 
      title, 
      message,
      secondaryButtonText: secondaryText,
      onSecondaryPress: secondaryAction
    });
  };

  const handleLogin = async () => {
    if(!email || !password) {
      return showAlert('warning', 'Missing Info', 'Please fill in both email and password fields.');
    }
    
    setLoading(true);
    try {
      // 1. Attempt to Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Check Role in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role || 'user'; 
        
        // ⛔ SECURITY: BLOCK EVERYONE EXCEPT 'user'
        if (userRole !== 'user') {
          await signOut(auth); 
          setLoading(false);
          return showAlert(
            'error', 
            'Access Denied', 
            'This mobile app is for Viewers only.\n\nAdmins and Producers must log in via the Web Dashboard.',
            'Help & Support', // Button Text
            () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push('/help-support'); // Navigate to Support
            }
          );
        }
      }

      // 3. If role is 'user', proceed (RootLayout handles redirect)

    } catch (error: any) {
      // ✅ UPDATED: Handle Bans specifically with a Support Button
      if (error.code === 'auth/user-disabled') {
        showAlert(
          'error', 
          'Account Suspended', 
          'Your account has been disabled due to a violation of our terms.', 
          'Contact Support', 
          () => {
             setAlertConfig(prev => ({ ...prev, visible: false }));
             router.push('/help-support');
          }
        );
      } else {
        // Standard Friendly Error for everything else
        const friendlyMessage = getFriendlyErrorMessage(error);
        showAlert('error', 'Login Failed', friendlyMessage);
      }
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
            keyboardType="email-address"
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

      {/* ✅ UPDATED: Passing secondary button props */}
      <CustomAlert 
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        secondaryButtonText={alertConfig.secondaryButtonText}
        onSecondaryPress={alertConfig.onSecondaryPress}
      />
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