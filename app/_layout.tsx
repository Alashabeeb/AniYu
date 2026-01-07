import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack>
        {/* ✅ THIS is the line that hides the header coming from the root */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Your other screens */}
        <Stack.Screen name="anime/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}