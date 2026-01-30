import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView,
    Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/CustomAlert';
import { auth, db } from '../../config/firebaseConfig';
import { useTheme } from '../../context/ThemeContext';
import { getFriendlyErrorMessage } from '../../utils/errorHandler'; // ✅ Imported Friendly Error Handler

export default function SignUpScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    title: '',
    message: ''
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const handleSignUp = async () => {
    // 1. Basic Validation
    if (!email || !password || !username) {
        return showAlert('warning', 'Missing Fields', 'Please fill in all fields to continue.');
    }
    if (password.length < 6) {
        return showAlert('warning', 'Weak Password', 'Password must be at least 6 characters long.');
    }

    setLoading(true);

    try {
        // 2. Check Username Availability
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.toLowerCase()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            setLoading(false);
            return showAlert('error', 'Username Taken', 'This username is already in use. Please choose another.');
        }

        // 3. Create User in Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 4. Set Display Name
        await updateProfile(user, { displayName: username });

        // 5. Create Database Profile
        await setDoc(doc(db, "users", user.uid), {
            username: username.toLowerCase(),
            displayName: username,
            email: email,
            role: 'user', // 🔒 SECURITY: Always 'user'
            rank: 'GENIN', // 🔰 DEFAULT RANK
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + username,
            bio: "I'm new here!",
            followers: [],
            following: [],
            createdAt: new Date(),
            isVerified: false 
        });

        // ✅ Show Success Alert
        showAlert('success', 'Welcome!', 'Your account has been created successfully.');

    } catch (error: any) {
        // ✅ UPDATED: Convert raw Firebase errors to friendly text
        const friendlyMessage = getFriendlyErrorMessage(error);
        showAlert('error', 'Sign Up Failed', friendlyMessage);
    } finally {
        setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
            
            <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>Join the AniYu community!</Text>

            <View style={styles.form}>
                {/* Username Input */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="person-outline" size={20} color={theme.subText} style={styles.icon} />
                    <TextInput 
                        placeholder="Username" 
                        placeholderTextColor={theme.subText} 
                        style={[styles.input, { color: theme.text }]} 
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>

                {/* Email Input */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="mail-outline" size={20} color={theme.subText} style={styles.icon} />
                    <TextInput 
                        placeholder="Email" 
                        placeholderTextColor={theme.subText} 
                        style={[styles.input, { color: theme.text }]} 
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Password Input */}
                <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={theme.subText} style={styles.icon} />
                    <TextInput 
                        placeholder="Password" 
                        placeholderTextColor={theme.subText} 
                        style={[styles.input, { color: theme.text }]} 
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.button, { backgroundColor: theme.tint }]} 
                    onPress={handleSignUp}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign Up</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={{ color: theme.subText }}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={{ color: theme.tint, fontWeight: 'bold' }}>Log In</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>

        {/* Custom Alert Component */}
        <CustomAlert 
            visible={alertConfig.visible}
            type={alertConfig.type}
            title={alertConfig.title}
            message={alertConfig.message}
            onClose={() => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                // Redirect if success
                if (alertConfig.type === 'success') {
                    router.replace('/(tabs)/feed');
                }
            }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 25 },
  backBtn: { position: 'absolute', top: 20, left: 20, zIndex: 10 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, marginTop: 60 },
  subtitle: { fontSize: 16, marginBottom: 40 },
  form: { width: '100%' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 15, paddingHorizontal: 15, height: 55 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16 },
  button: { height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
});