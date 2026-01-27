import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { auth, db } from '../config/firebaseConfig'; // ⚠️ Check your path to firebaseConfig

export const useUserHeartbeat = () => {
  useEffect(() => {
    // 1. Function to update "lastActiveAt"
    const updateHeartbeat = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            lastActiveAt: serverTimestamp(), // ✅ Updates time to NOW
            isOnline: true
          });
          console.log("💓 Heartbeat sent");
        } catch (error) {
          console.log("Heartbeat error", error);
        }
      }
    };

    // 2. Run immediately on mount
    updateHeartbeat();

    // 3. Run every 5 minutes (300,000ms) while app is open
    const interval = setInterval(updateHeartbeat, 5 * 60 * 1000);

    // 4. Update when app comes to foreground (user switches back to app)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        updateHeartbeat();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
};