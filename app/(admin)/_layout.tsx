import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts, FontSizes } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ActivityIndicator, View, Pressable, Text } from 'react-native';

export default function AdminLayout() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      router.replace('/(customer)');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.faint,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.rule,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.mono,
          fontSize: FontSizes.xs,
          textTransform: 'uppercase',
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ORDERS',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu-editor"
        options={{
          title: 'MENU',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="pencil" color={color} />,
        }}
      />
      <Tabs.Screen
        name="order/[id]"
        options={{
          href: null, // Hidden from tab bar
        }}
      />
    </Tabs>
  );
}
