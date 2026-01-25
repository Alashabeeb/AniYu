import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AdEventType, AppOpenAd } from 'react-native-google-mobile-ads'; // ✅ Import AdMob
import { AdConfig } from '../config/adConfig'; // ✅ Import Config

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

// ✅ Use Central Config
const appOpenAd = AppOpenAd.createForAdRequest(AdConfig.appOpen, {
  requestNonPersonalizedAdsOnly: true,
});

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // ✅ Ad Loaded State
  const [isAdClosed, setIsAdClosed] = useState(false);

  // ✅ 1. Load & Show App Open Ad
  useEffect(() => {
    // Show ad when loaded
    const unsubscribeLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
      appOpenAd.show();
    });

    // When ad is closed, allow app to proceed
    const unsubscribeClosed = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsAdClosed(true);
    });

    // If ad fails to load, just proceed
    const unsubscribeError = appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log("App Open Ad Failed:", error);
      setIsAdClosed(true);
    });

    appOpenAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  // 🔒 THE GATEKEEPER LOGIC
  useEffect(() => {
    // Wait for BOTH: Auth Check + Ad to Close (or fail)
    if (loading || !isAdClosed) return;

    if (!user) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(tabs)');
    }
  }, [user, loading, isAdClosed]); // Dependency on isAdClosed

  // Show loading screen while Auth is checking OR Ad is showing
  if (loading || !isAdClosed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="anime/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="manga/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chapter-read" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}