import 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useAppTheme } from '@/src/theme/ThemeProvider';
import WelcomeIntroOverlay from '@/components/WelcomeIntroOverlay';
import { AuthProvider, useAuth } from '@/src/auth/AuthProvider';

function AppNavigator() {
  const { ready, colors } = useAppTheme();
  const { authReady, session, fullName } = useAuth();
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);

  useEffect(() => {
    if (ready && authReady && session) {
      const timer = setTimeout(() => {
        setShowWelcomeIntro(true);
      }, 120);

      return () => clearTimeout(timer);
    } else {
      setShowWelcomeIntro(false);
    }
  }, [ready, authReady, session]);

  if (!ready || !authReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const nameForWelcome =
    fullName?.trim() ||
    (session?.user?.user_metadata?.full_name as string | undefined) ||
    'Willkommen';

  return (
    <>
      <StatusBar style="light" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>

      {session ? (
        <WelcomeIntroOverlay
          visible={showWelcomeIntro}
          name={nameForWelcome}
          onFinish={() => setShowWelcomeIntro(false)}
        />
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}