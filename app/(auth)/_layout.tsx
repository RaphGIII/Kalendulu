import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/src/auth/AuthProvider';

export default function AuthLayout() {
  const { authReady, session } = useAuth();

  if (!authReady) {
    return null;
  }

  if (session) {
    return <Redirect href="/kalender" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}