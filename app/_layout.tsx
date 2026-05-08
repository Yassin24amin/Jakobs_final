import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Oswald_700Bold } from '@expo-google-fonts/oswald';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { AuthProvider } from '@/contexts/auth-context';
import { CartProvider } from '@/contexts/cart-context';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL environment variable is required');
}
const convex = new ConvexReactClient(convexUrl);

export const unstable_settings = {
  anchor: '(customer)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Oswald_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <CartProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.background },
              }}
            >
              <Stack.Screen name="(customer)" />
              <Stack.Screen
                name="(admin)"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="(pos)"
                options={{ headerShown: false, animation: 'none' }}
              />
              <Stack.Screen
                name="login"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="order-confirmation/[id]"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
            <StatusBar style="light" />
          </CartProvider>
        </AuthProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}
