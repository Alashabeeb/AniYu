import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'; // ✅ Changed getDoc to onSnapshot
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { auth, db } from '../config/firebaseConfig';

interface AuthProps {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthProps>({ user: null, loading: true });

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let userUnsub: () => void;

    const authUnsub = onAuthStateChanged(auth, async (currentUser) => {
      // Cleanup previous user listener if auth state changes
      if (userUnsub) userUnsub();

      if (currentUser) {
        // ✅ REAL-TIME LISTENER: Instantly detects bans
        const userRef = doc(db, 'users', currentUser.uid);
        
        userUnsub = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                if (userData.isBanned) {
                    const banExpiresAt = userData.banExpiresAt?.toDate();
                    const now = new Date();

                    if (banExpiresAt && now < banExpiresAt) {
                        // ⛔ BAN ACTIVE - Force Logout
                        const timeLeft = Math.ceil((banExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)); 
                        
                        Alert.alert(
                            "Account Banned", 
                            `You have been banned.\n\nExpires in: ~${timeLeft} hours`,
                            [{ text: "OK", onPress: () => signOut(auth) }]
                        );
                        await signOut(auth);
                        setUser(null);
                    } else {
                        // ✅ BAN EXPIRED - Auto Unban
                        await updateDoc(userRef, { isBanned: false, banExpiresAt: null });
                    }
                }
            }
        });
        
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);