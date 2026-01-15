import AsyncStorage from '@react-native-async-storage/async-storage';
// ❌ Comment out the import that causes the crash in Expo Go
// import * as Notifications from 'expo-notifications'; 
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

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
  date: any; 
  read: boolean;
  type: 'anime' | 'manga' | 'system' | 'like' | 'comment' | 'repost' | 'follow'; 
  targetId?: string; 
  actorId?: string; 
  actorName?: string;
  actorAvatar?: string;
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
    const current = await getNotifications();
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title,
      body,
      date: Date.now(),
      read: false,
      type
    };
    const updated = [newNotif, ...current].slice(0, 50); 
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));

    const isEnabled = await getNotificationPreference();
    if (isEnabled) {
      console.log(`[Notification Popup] ${title}: ${body}`);
    }

    return updated;
  } catch (error) {
    console.error("Error adding notification:", error);
    return [];
  }
};

// 3. Send Social Notification (To Firestore)
export const sendSocialNotification = async (
    targetUserId: string, 
    type: 'like' | 'comment' | 'repost' | 'follow', 
    actor: { uid: string, name: string, avatar: string }, 
    contentSnippet?: string,
    targetId?: string
) => {
    if (targetUserId === actor.uid) return; 

    try {
        let title = "New Interaction";
        let body = "Someone interacted with you.";

        switch(type) {
            case 'like': 
                title = "New Like";
                body = `${actor.name} liked your post.`;
                break;
            case 'comment':
                title = "New Comment";
                body = `${actor.name} commented: "${contentSnippet || '...'}"`;
                break;
            case 'repost':
                title = "New Repost";
                body = `${actor.name} reposted your post.`;
                break;
            case 'follow':
                title = "New Follower";
                body = `${actor.name} started following you.`;
                break;
        }

        await addDoc(collection(db, 'users', targetUserId, 'notifications'), {
            title,
            body,
            type,
            actorId: actor.uid,
            actorName: actor.name,
            actorAvatar: actor.avatar,
            targetId: targetId || null,
            read: false,
            createdAt: serverTimestamp()
        });

    } catch (error) {
        console.error("Error sending social notification:", error);
    }
};

// 4. Mark all as read
export const markAllAsRead = async () => {
    const current = await getNotifications();
    const updated = current.map(n => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};

// ✅ 5. NEW: Mark Single Local Notification as Read
export const markLocalNotificationAsRead = async (id: string) => {
    const current = await getNotifications();
    const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return updated;
};

// ✅ 6. NEW: Get Unread Local Count
export const getUnreadLocalCount = async () => {
    const current = await getNotifications();
    return current.filter(n => !n.read).length;
};

// 7. Settings: Get Preference
export const getNotificationPreference = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(PREFERENCE_KEY);
    return val !== null ? JSON.parse(val) : true; 
  } catch {
    return true;
  }
};

// 8. Settings: Save Preference
export const setNotificationPreference = async (enabled: boolean) => {
  await AsyncStorage.setItem(PREFERENCE_KEY, JSON.stringify(enabled));
};