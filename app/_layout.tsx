import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext'; // ✅ Import Auth
import { ThemeProvider } from '../context/ThemeContext';

// This component handles the redirection logic
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // 🔒 THE GATEKEEPER LOGIC
    if (!user) {
      // If user is NOT logged in, send them to Login screen
      router.replace('/(auth)/login');
    } else {
      // If user IS logged in, send them to Home
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  if (loading) {
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