import AsyncStorage from '@react-native-async-storage/async-storage';
// ❌ Comment out the import that causes the crash in Expo Go
// import * as Notifications from 'expo-notifications'; 

const NOTIFICATIONS_KEY = 'user_notifications';
const PREFERENCE_KEY = 'notifications_enabled';

/* // ⚠️ UNCOMMENT THIS SECTION WHEN YOU USE A "DEVELOPMENT BUILD"
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
*/

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  date: number;
  read: boolean;
  type: 'anime' | 'manga' | 'system';
}

// 1. Get Notification History
export const getNotifications = async (): Promise<AppNotification[]> => {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    return [];
  }
};

// 2. Add a New "Drop"
export const addNewDropNotification = async (title: string, body: string, type: 'anime' | 'manga' = 'anime') => {
  try {
    // A. Add to In-App List (Storage works fine in Expo Go)
    const current = await getNotifications();
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title,
      body,
      date: Date.now(),
      read: false,
      type
    };
    const updated = [newNotif, ...current].slice(0, 50); // Keep last 50
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));

    // B. Trigger Pop-Up (Modified for Expo Go Compatibility)
    const isEnabled = await getNotificationPreference();
    if (isEnabled) {
      // ⚠️ REAL NOTIFICATION CODE (Uncomment for Dev Build)
      /*
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: 'default',
        },
        trigger: null,
      });
      */

      // ✅ FALLBACK FOR EXPO GO: Use a simple Alert or Console Log
      console.log(`[Notification Popup] ${title}: ${body}`);
      
      // Optional: Show an in-app alert to simulate the popup
      // Alert.alert(title, body); 
    }

    return updated;
  } catch (error) {
    console.error("Error adding notification:", error);
    return [];
  }
};

// 3. Mark all as read
export const markAllAsRead = async () => {
    const current = await getNotifications();
    const updated = current.map(n => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};

// 4. Settings: Get Preference
export const getNotificationPreference = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(PREFERENCE_KEY);
    return val !== null ? JSON.parse(val) : true; // Default to true
  } catch {
    return true;
  }
};

// 5. Settings: Save Preference
export const setNotificationPreference = async (enabled: boolean) => {
  await AsyncStorage.setItem(PREFERENCE_KEY, JSON.stringify(enabled));
};