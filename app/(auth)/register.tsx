import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';

import { useAuth } from '@/src/auth/AuthProvider';
import { useAppTheme } from '@/src/theme/ThemeProvider';

export default function RegisterScreen() {
  const { colors } = useAppTheme();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Fehlende Angaben', 'Bitte Name, E-Mail und Passwort eingeben.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Passwort zu kurz', 'Das Passwort sollte mindestens 6 Zeichen haben.');
      return;
    }

    try {
      setLoading(true);
      await signUp({ fullName, email, password });
    } catch (error: any) {
      Alert.alert('Registrierung fehlgeschlagen', error?.message ?? 'Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text }]}>Konto erstellen</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Erstelle dein Profil, damit Kalendulu dich persönlich begrüßen und deine Daten speichern kann.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.text }]}>Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Dein Name"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>E-Mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.text }]}>Passwort</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mindestens 6 Zeichen"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.backgroundSecondary,
                },
              ]}
            />

            <Pressable
              onPress={onRegister}
              disabled={loading}
              style={[
                styles.button,
                {
                  backgroundColor: colors.primary,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryText} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.primaryText }]}>Registrieren</Text>
              )}
            </Pressable>

            <Link href="/login" asChild>
              <Pressable style={styles.linkWrap}>
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  Bereits ein Konto? Anmelden
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    marginTop: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  linkWrap: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
  },
});