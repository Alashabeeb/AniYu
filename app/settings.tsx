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

// ✅ 1. TRANSLATION DICTIONARY
const TRANSLATIONS: any = {
    'English': {
        membership: "MEMBERSHIP", subscription: "Subscription", email: "Email", changePass: "Change Password",
        appExp: "APP EXPERIENCE", streamCell: "Stream on Cellular", darkMode: "Dark Mode", quality: "Video Quality",
        langHeader: "LANGUAGE", appLang: "App Language", audioLang: "Audio Language", subtitles: "Subtitles",
        data: "DATA & STORAGE", notifs: "Pop-up Notifications", downloads: "Manage Downloads", clearHist: "Clear Watch History",
        privacy: "PRIVACY & SAFETY", restriction: "Content Restriction", blocked: "Blocked Users", delete: "Delete My Account",
        manage: "Manage", free: "Free Plan", premium: "Premium", premiumPlus: "Premium+"
    },
    'Spanish': {
        membership: "MEMBRESÍA", subscription: "Suscripción", email: "Correo", changePass: "Cambiar Contraseña",
        appExp: "EXPERIENCIA APP", streamCell: "Datos Móviles", darkMode: "Modo Oscuro", quality: "Calidad de Video",
        langHeader: "IDIOMA", appLang: "Idioma de App", audioLang: "Audio", subtitles: "Subtítulos",
        data: "DATOS Y ALMACENAMIENTO", notifs: "Notificaciones", downloads: "Descargas", clearHist: "Borrar Historial",
        privacy: "PRIVACIDAD", restriction: "Restricción", blocked: "Bloqueados", delete: "Eliminar Cuenta",
        manage: "Gestionar", free: "Plan Gratuito", premium: "Premium", premiumPlus: "Premium+"
    },
    'French': {
        membership: "ABONNEMENT", subscription: "Forfait", email: "E-mail", changePass: "Changer Mot de Passe",
        appExp: "EXPÉRIENCE APP", streamCell: "Streaming Cellulaire", darkMode: "Mode Sombre", quality: "Qualité Vidéo",
        langHeader: "LANGUE", appLang: "Langue de l'App", audioLang: "Langue Audio", subtitles: "Sous-titres",
        data: "DONNÉES & STOCKAGE", notifs: "Notifications", downloads: "Téléchargements", clearHist: "Effacer Historique",
        privacy: "CONFIDENTIALITÉ", restriction: "Restriction", blocked: "Bloqués", delete: "Supprimer Compte",
        manage: "Gérer", free: "Gratuit", premium: "Premium", premiumPlus: "Premium+"
    }
};

const LANGUAGES = [
    "English", "Spanish", "French", "German", "Chinese", "Japanese", 
    "Korean", "Portuguese", "Russian", "Arabic", "Italian"
];

const SUBSCRIPTION_OPTS = [
    { id: 'Free Plan', name: 'Free Plan', price: '$0.00', features: 'Ads • 480p' },
    { id: 'Premium', name: 'Premium', price: '$4.99/mo', features: 'No Ads • 1080p • Background Play' },
    { id: 'Premium+', name: 'Premium+', price: '$9.99/mo', features: 'No Ads • 4K • Offline • Early Access' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, isDark } = useTheme();
  const user = auth.currentUser;
  
  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [cellularEnabled, setCellularEnabled] = useState(true);
  
  // Selections
  const [subscription, setSubscription] = useState('Free Plan');
  const [videoQuality, setVideoQuality] = useState('480p');
  const [appLanguage, setAppLanguage] = useState('English');
  const [audioLanguage, setAudioLanguage] = useState('Japanese (Original)');
  const [subtitleLanguage, setSubtitleLanguage] = useState('English');
  const [contentRating, setContentRating] = useState('16+');

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
      const enabled = await getNotificationPreference();
      setNotificationsEnabled(enabled);
  };

  const toggleNotifications = async (value: boolean) => {
      setNotificationsEnabled(value);
      await setNotificationPreference(value);
  };

  // ✅ HELPER: Get Translation
  const t = (key: string) => {
      const dict = TRANSLATIONS[appLanguage] || TRANSLATIONS['English'];
      return dict[key] || TRANSLATIONS['English'][key] || key;
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
          Alert.alert("Error", "Please log out and log in again to update your email.");
      } finally {
          setLoading(false);
      }
  };

  const handleChangePassword = async () => {
      if (!user?.email) return;
      Alert.alert(t('changePass'), `Send reset email to ${user.email}?`, [
          { text: "Cancel", style: "cancel" },
          { 
              text: "Send", 
              onPress: async () => {
                  try {
                      await sendPasswordResetEmail(auth, user.email!);
                      Alert.alert("Sent", "Check your inbox.");
                  } catch (e: any) { Alert.alert("Error", e.message); }
              }
          }
      ]);
  };

  const handleDeleteAccount = () => {
      Alert.alert(t('delete'), "Irreversible action. Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { 
              text: "Delete", 
              style: "destructive", 
              onPress: async () => {
                  try {
                      setLoading(true);
                      await deleteUser(user!);
                      router.replace('/login');
                  } catch (e: any) { Alert.alert("Error", "Re-login required."); } 
                  finally { setLoading(false); }
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
      if (modalType === 'language') setAppLanguage(value); // ✅ This triggers re-render with new language
      if (modalType === 'audio') setAudioLanguage(value);
      if (modalType === 'subtitle') setSubtitleLanguage(value);
      if (modalType === 'rating') setContentRating(value);
      if (modalType === 'subscription') setSubscription(value);
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings') || 'Settings'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
        
        {/* 1. MEMBERSHIP */}
        {renderSectionHeader(t('membership'))}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {/* ✅ Subscription is now clickable */}
            {renderRow("card-outline", t('subscription'), subscription, () => openModal('subscription'))}
            {renderRow("mail-outline", t('email'), user?.email || "No Email", () => openModal('email'))}
            {renderRow("key-outline", t('changePass'), "", handleChangePassword)}
        </View>

        {/* 2. APP EXPERIENCE */}
        {renderSectionHeader(t('appExp'))}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cellular-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>{t('streamCell')}</Text>
                </View>
                <Switch 
                    value={cellularEnabled} 
                    onValueChange={setCellularEnabled} 
                    trackColor={{ false: '#767577', true: theme.tint }}
                    thumbColor={'white'}
                />
            </View>

            <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="moon-outline" size={22} color={theme.text} style={{ marginRight: 15 }} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>{t('darkMode')}</Text>
                </View>
                <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: '#767577', true: theme.tint }} thumbColor={'white'} />
            </View>

            {renderRow("videocam-outline", t('quality'), videoQuality, () => openModal('quality'))}
        </View>

        {/* 3. LANGUAGE */}
        {renderSectionHeader(t('langHeader'))}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("language-outline", t('appLang'), appLanguage, () => openModal('language'))}
            {renderRow("mic-outline", t('audioLang'), audioLanguage, () => openModal('audio'))}
            {renderRow("chatbox-ellipses-outline", t('subtitles'), subtitleLanguage, () => openModal('subtitle'))}
        </View>

        {/* 4. DATA & STORAGE */}
        {renderSectionHeader(t('data'))}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("notifications-outline", t('notifs'), <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ false: '#767577', true: theme.tint }} thumbColor={'white'} />)}
            {renderRow("download-outline", t('downloads'), "", () => router.push('/downloads'))}
            {renderRow("time-outline", t('clearHist'), "", async () => { await clearHistory(); Alert.alert("Success", "History Cleared"); }, true)}
        </View>

        {/* 5. PRIVACY & SAFETY */}
        {renderSectionHeader(t('privacy'))}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
            {renderRow("shield-checkmark-outline", t('restriction'), contentRating, () => openModal('rating'))}
            {/* ✅ UPDATED: Link to Blocked Users Screen */}
            {renderRow("person-remove-outline", t('blocked'), t('manage'), () => router.push('/blocked-users'))}
            {renderRow("trash-outline", t('delete'), "", handleDeleteAccount, true)}
        </View>

        <View style={{ marginTop: 30, alignItems: 'center' }}>
            <Text style={{ color: theme.subText }}>AniYu v1.0.3 (Beta)</Text>
        </View>

      </ScrollView>

      {/* SELECTION MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    
                    {modalType === 'email' ? (
                        <>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('email')}</Text>
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
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Update</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Select</Text>
                            
                            <ScrollView style={{ maxHeight: 300 }}>
                                
                                {/* ✅ SUBSCRIPTION PLANS */}
                                {modalType === 'subscription' && SUBSCRIPTION_OPTS.map(opt => (
                                    <TouchableOpacity key={opt.id} style={styles.modalOption} onPress={() => handleSelection(opt.id)}>
                                        <View>
                                            <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{opt.name}</Text>
                                            <Text style={{ color: theme.subText, fontSize: 12 }}>{opt.price} • {opt.features}</Text>
                                        </View>
                                        {subscription === opt.id && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {modalType === 'quality' && ['1080p', '720p', '480p', '360p', 'Auto'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {videoQuality === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {modalType === 'language' && LANGUAGES.map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {appLanguage === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {modalType === 'audio' && ['Japanese (Original)', 'English (Dub)', 'Spanish (Dub)', 'French (Dub)'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {audioLanguage === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

                                {modalType === 'subtitle' && ['English', 'Spanish', 'French', 'None'].map(opt => (
                                    <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => handleSelection(opt)}>
                                        <Text style={{ color: theme.text, fontSize: 16 }}>{opt}</Text>
                                        {subtitleLanguage === opt && <Ionicons name="checkmark" size={20} color={theme.tint} />}
                                    </TouchableOpacity>
                                ))}

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
  modalContent: { width: '85%', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },
  
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 15, fontSize: 16 },
  saveBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },

  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }
});