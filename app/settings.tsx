import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { deleteUser, sendPasswordResetEmail, updateEmail } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth } from '../config/firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { clearHistory } from '../services/historyService';
import { getNotificationPreference, setNotificationPreference } from '../services/notificationService';

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Chinese", "Japanese", 
    "Korean", "Portuguese", "Russian", "Arabic", "Italian", "Hindi", 
    "Indonesian", "Vietnamese", "Turkish", "Thai"
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const user = auth.currentUser;
  
  // Preferences State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [cellularEnabled, setCellularEnabled] = useState(true); // ✅ Default ON
  
  // Selection State
  const [videoQuality, setVideoQuality] = useState('480p');
  const [appLanguage, setAppLanguage] = useState('English');
  const [audioLanguage, setAudioLanguage] = useState('Japanese (Original)');
  const [subtitleLanguage, setSubtitleLanguage] = useState('English');
  const [contentRating, setContentRating] = useState('16+');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
      loadSettings();
  }, []);

  const loadSettings = async () => {
      const enabled = await getNotificationPreference();
      setNotificationsEnabled(enabled);
  };

  const toggleNotifications = async (value: boolean) => {
      setNotificationsEnabled(value);
      await setNotificationPreference(value);
  };

  // --- ACTIONS ---

  const handleUpdateEmail = async () => {
      if (!newEmail.trim() || !user) return;
      setLoading(true);
      try {
          await updateEmail(user, newEmail.trim());
          Alert.alert("Success", "Email updated successfully.");
          setModalVisible(false);
          setNewEmail('');
      } catch (e: any) {
          Alert.alert("Error", "Please log out and log in again to update your email. (Security Requirement)");
      } finally {
          setLoading(false);
      }
  };

  const handleChangePassword = async () => {
      if (!user?.email) return;
      Alert.alert("Change Password", `Send a password reset email to ${user.email}?`, [
          { text: "Cancel", style: "cancel" },
          { 
              text: "Send Email", 
              onPress: async () => {
                  try {
                      await sendPasswordResetEmail(auth, user.email!);
                      Alert.alert("Email Sent", "Check your inbox to reset your password.");
                  } catch (e: any) {
                      Alert.alert("Error", e.message);
                  }
              }
          }
      ]);
  };

  const handleDeleteAccount = () => {
      Alert.alert("Delete Account", "This action is irreversible. Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { 
              text: "Delete Forever", 
              style: "destructive", 
              onPress: async () => {
                  try {
                      setLoading(true);
                      await deleteUser(user!);
                      router.replace('/login');
                  } catch (e: any) {
                      Alert.alert("Error", "Please log out and log in again to delete your account.");
                  } finally {
                      setLoading(false);
                  }
              }
          }
      ]);
  };

  const openModal = (type: string) => {
      setModalType(type);
      setModalVisible(true);
      if(type === 'email') setNewEmail(user?.email || '');
  };

  const handleSelection = (value: string) => {
      if (modalType === 'quality') setVideoQuality(value);
      if (modalType === 'language') setAppLanguage(value);
      if (modalType === 'audio') setAudioLanguage(value);
      if (modalType === 'subtitle') setSubtitleLanguage(value);
      if (modalType === 'rating') setContentRating(value);
      setModalVisible(false);
  };

  // --- RENDER HELPERS ---

  const renderSectionHeader = (title: string) => (
      <Text style={[styles.sectionTitle, { color: theme.tint }]}>{title}</Text>
  );

  const renderRow = (icon: any, label: string, value?: string | React.ReactNode, onPress?: () => void, isDestructive = false) => (
      <TouchableOpacity 
          style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]} 
          onPress={onPress}
          disabled={!onPress}
      >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={icon} size={22} color={isDestructive ? "#FF6B6B" : theme.text} style={{ marginRight: 15 }} />
              <Text style={[styles.rowLabel, { color: isDestructive ? "#FF6B6B" : theme.text }]}>{label}</Text>
          </View>
          {typeof value === 'string' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.subText, marginRight: 5, maxWidth: 150 }} numberOfLines={1}>{value}</Text>
                  {onPress && <Ionicons name="chevron-forward" size={18} color={theme.subText} />}
              </View>
          ) : (
              value
          )}
      </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        
        {/* 1. MEMBERSHIP */}
        {renderSectionHeader("MEMBERSHIP")}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("card-outline", "Subscription", "Free Plan")}
            {/* ✅ Clickable Email */}
            {renderRow("mail-outline", "Email", user?.email || "No Email", () => openModal('email'))}
            {renderRow("key-outline", "Change Password", "", handleChangePassword)}
        </View>

        {/* 2. APP EXPERIENCE */}
        {renderSectionHeader("APP EXPERIENCE")}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {/* Cellular Toggle */}
            <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cellular-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Stream on Cellular</Text>
                </View>
                <Switch 
                    value={cellularEnabled} 
                    onValueChange={setCellularEnabled} 
                    trackColor={{ false: '#767577', true: theme.tint }}
                    thumbColor={'white'}
                />
            </View>

            {/* Dark Mode */}
            <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="moon-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
                </View>
                <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: theme.tint }} thumbColor={'white'} />
            </View>

            {renderRow("videocam-outline", "Video Quality", videoQuality, () => openModal('quality'))}
        </View>

        {/* 3. LANGUAGE */}
        {renderSectionHeader("LANGUAGE")}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("language-outline", "App Language", appLanguage, () => openModal('language'))}
            {/* ✅ Audio & Subtitles Clickable */}
            {renderRow("mic-outline", "Audio Language", audioLanguage, () => openModal('audio'))}
            {renderRow("chatbox-ellipses-outline", "Subtitles", subtitleLanguage, () => openModal('subtitle'))}
        </View>

        {/* 4. DATA & STORAGE */}
        {renderSectionHeader("DATA & STORAGE")}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("notifications-outline", "Pop-up Notifications", <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#767577', true: theme.tint }} thumbColor={'white'} />)}
            {renderRow("download-outline", "Manage Downloads", "", () => router.push('/downloads'))}
            {renderRow("time-outline", "Clear Watch History", "", async () => { await clearHistory(); Alert.alert("Success", "History Cleared"); }, true)}
        </View>

        {/* 5. PRIVACY & SAFETY (Moved to Bottom) */}
        {renderSectionHeader("PRIVACY & SAFETY")}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("shield-checkmark-outline", "Content Restriction", contentRating, () => openModal('rating'))}
            {renderRow("person-remove-outline", "Blocked Users", "Manage", () => Alert.alert("Coming Soon"))}
            {renderRow("trash-outline", "Delete My Account", "", handleDeleteAccount, true)}
        </View>

        {/* Footer Info */}
        <View style={{ marginTop: 30, alignItems: 'center' }}>
            <Text style={{ color: theme.subText }}>AniYu v1.0.2 (Beta)</Text>
        </View>

      </ScrollView>

      {/* SELECTION MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    
                    {/* EMAIL EDIT MODE */}
                    {modalType === 'email' ? (
                        <>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Change Email</Text>
                            <TextInput 
                                style={[styles.input, { color: theme.text, borderColor: theme.border }]} 
                                value={newEmail}
                                onChangeText={setNewEmail}
                                placeholder="Enter new email"
                                placeholderTextColor={theme.subText}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.tint }]} onPress={handleUpdateEmail}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Update Email</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>
                                Select Option
                            </Text>
                            
                            <ScrollView style={{ maxHeight: 300 }}>
                                {/* Video Quality */}
                                {modalType === 'quality' && ['1080p', '720p', '480p', '360p', 'Auto'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {videoQuality === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {/* App Language (Expanded) */}
                                {modalType === 'language' && LANGUAGES.map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {appLanguage === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {/* Audio Language */}
                                {modalType === 'audio' && ['Japanese (Original)', 'English (Dub)'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {audioLanguage === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {/* Subtitle Language */}
                                {modalType === 'subtitle' && ['English', 'None'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {subtitleLanguage === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {/* Content Rating */}
                                {modalType === 'rating' && ['All Ages', '13+', '16+', '18+'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {contentRating === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </View>
              </TouchableWithoutFeedback>
          </TouchableOpacity>
      </Modal>

      {loading && (
        <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={theme.tint} />
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 25, marginBottom: 8, marginLeft: 5, letterSpacing: 1 },
  section: { borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },
  
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  saveBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },

  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }
});