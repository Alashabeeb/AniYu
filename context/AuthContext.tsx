import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'; // ✅ CHANGED: Imported onSnapshot
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
    let userUnsub: () => void; // ✅ Store listener to unsubscribe later

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Cleanup previous listener if user changes
      if (userUnsub) userUnsub();

      if (currentUser) {
        // ✅ REAL-TIME LISTENER: Instantly detects bans/role changes
        const userRef = doc(db, 'users', currentUser.uid);
        
        userUnsub = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                
                if (userData.isBanned) {
                    const banExpiresAt = userData.banExpiresAt?.toDate();
                    const now = new Date();

                    if (banExpiresAt && now < banExpiresAt) {
                        // ⛔ BAN IS ACTIVE - Force Logout
                        const timeLeft = Math.ceil((banExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)); 
                        
                        Alert.alert(
                            "Account Banned", 
                            `You are temporarily banned.\n\nExpires in: ~${timeLeft} hours`,
                            [{ text: "OK", onPress: () => signOut(auth) }]
                        );
                        
                        await signOut(auth);
                        setUser(null);
                    } else {
                        // ✅ BAN HAS EXPIRED - Auto Unban
                        await updateDoc(userRef, { 
                            isBanned: false, 
                            banExpiresAt: null 
                        });
                    }
                }
            }
        });
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
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