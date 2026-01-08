import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert, ScrollView, StyleSheet, Switch, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext'; // ✅ Use the Theme Hook

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme(); // Get theme colors
  
  const [loading, setLoading] = useState(false);
  
  // User Profile State
  const [formData, setFormData] = useState({
    username: '@OtakuKing', // Fixed
    displayName: 'Otaku King',
    email: 'king@otaku.com',
    phone: '+1 234 567 890',
    password: '',
  });

  // Load saved profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const saved = await AsyncStorage.getItem('user_profile');
    if (saved) {
      setFormData(JSON.parse(saved));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    // Simulate API delay
    setTimeout(async () => {
        await AsyncStorage.setItem('user_profile', JSON.stringify(formData));
        setLoading(false);
        Alert.alert("Success", "Profile updated successfully!");
    }, 1000);
  };

  // Helper to update state
  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Dynamic Styles based on Theme
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
          headerTitle: 'Settings', 
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerBackTitle: '' 
      }} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* 1. APPEARANCE */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>APPEARANCE</Text>
            <View style={styles.row}>
                <View style={styles.rowLabel}>
                    <Ionicons name={isDark ? "moon" : "sunny"} size={22} color={theme.text} />
                    <Text style={styles.rowText}>Dark Mode</Text>
                </View>
                <Switch 
                    value={isDark} 
                    onValueChange={toggleTheme} // ✅ Toggles global theme
                    trackColor={{ false: "#ccc", true: "#FF6B6B" }}
                    thumbColor={isDark ? "#fff" : "#f4f3f4"}
                />
            </View>
        </View>

        {/* 2. PROFILE SETTINGS */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>PROFILE SETTINGS</Text>
            
            {/* Username (Fixed) */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Username (Unique)</Text>
                <View style={[styles.inputContainer, styles.disabledInput]}>
                    <Text style={[styles.inputText, { color: 'gray' }]}>{formData.username}</Text>
                    <Ionicons name="lock-closed" size={16} color="gray" />
                </View>
            </View>

            {/* Display Name */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.displayName}
                    onChangeText={(t) => updateField('displayName', t)}
                    placeholderTextColor="gray"
                />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.email}
                    onChangeText={(t) => updateField('email', t)}
                    keyboardType="email-address"
                    placeholderTextColor="gray"
                />
            </View>

             {/* Phone */}
             <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.phone}
                    onChangeText={(t) => updateField('phone', t)}
                    keyboardType="phone-pad"
                    placeholderTextColor="gray"
                />
            </View>
        </View>

        {/* 3. SECURITY */}
        <View style={styles.section}>
            <Text style={styles.sectionHeader}>SECURITY</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput 
                    style={styles.input} 
                    value={formData.password}
                    onChangeText={(t) => updateField('password', t)}
                    secureTextEntry
                    placeholder="Enter new password to change"
                    placeholderTextColor="gray"
                />
            </View>
        </View>

        {/* 4. ACTIONS */}
        <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={() => router.replace('/')} // Mock Logout
        >
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// Function to generate styles based on current theme
const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scrollContent: { padding: 20 },
  
  section: { marginBottom: 25, backgroundColor: theme.card, borderRadius: 12, padding: 15 },
  sectionHeader: { color: theme.subText, fontSize: 12, fontWeight: 'bold', marginBottom: 15 },
  
  row: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
  },
  rowLabel: { flexDirection: 'row', alignItems: 'center' },
  rowText: { color: theme.text, fontSize: 16, marginLeft: 15 },

  // Input Styles
  inputGroup: { marginBottom: 15 },
  label: { color: theme.subText, fontSize: 14, marginBottom: 8 },
  inputContainer: { 
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: theme.input, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: theme.border 
  },
  input: { 
      backgroundColor: theme.input, color: theme.text, borderRadius: 8, padding: 12, 
      borderWidth: 1, borderColor: theme.border, fontSize: 16 
  },
  disabledInput: { backgroundColor: theme.border, opacity: 0.7 },
  inputText: { fontSize: 16 },

  // Buttons
  saveButton: { 
      backgroundColor: theme.tint, padding: 16, borderRadius: 12, 
      alignItems: 'center', marginBottom: 15 
  },
  saveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  logoutBtn: { 
      padding: 15, borderRadius: 12, alignItems: 'center', 
      borderWidth: 1, borderColor: '#FF6B6B', backgroundColor: 'transparent'
  },
  logoutText: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 16 },
});