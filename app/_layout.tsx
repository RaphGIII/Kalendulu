import 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { ThemeProvider, useAppTheme } from '@/src/theme/ThemeProvider';
import WelcomeIntroOverlay from '@/components/WelcomeIntroOverlay';

function AppNavigator() {
  const { ready, colors } = useAppTheme();
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);

  useEffect(() => {
    if (ready) {
      const timer = setTimeout(() => {
        setShowWelcomeIntro(true);
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [ready]);

  if (!ready) {
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

  const demoUserName = 'Raphael';

  return (
    <>
      <StatusBar style="light" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>

      <WelcomeIntroOverlay
        visible={showWelcomeIntro}
        name={demoUserName}
        onFinish={() => setShowWelcomeIntro(false)}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}