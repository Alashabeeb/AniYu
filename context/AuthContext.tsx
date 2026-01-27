import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // ✅ CHECK BAN STATUS ON EVERY LOAD
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            
            if (userData.isBanned) {
                const banExpiresAt = userData.banExpiresAt?.toDate();
                const now = new Date();

                if (banExpiresAt && now < banExpiresAt) {
                    // ⛔ BAN IS STILL ACTIVE
                    const timeLeft = Math.ceil((banExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)); // Hours left
                    
                    Alert.alert(
                        "Account Banned", 
                        `You are temporarily banned.\n\nExpires in: ~${timeLeft} hours\n(${banExpiresAt.toLocaleString()})`,
                        [{ text: "OK", onPress: () => signOut(auth) }]
                    );
                    
                    await signOut(auth);
                    setUser(null);
                    setLoading(false);
                    return;
                } else {
                    // ✅ BAN HAS EXPIRED - AUTO UNBAN
                    await updateDoc(userRef, { 
                        isBanned: false, 
                        banExpiresAt: null 
                    });
                    console.log("Ban expired. User unbanned automatically.");
                }
            }
        }
      }
      
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);