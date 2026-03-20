import React from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAppTheme } from '@/src/theme/ThemeProvider';
import { ThemeColors } from '@/src/theme/themes';

const editableColorKeys: (keyof ThemeColors)[] = [
  'background',
  'backgroundSecondary',
  'card',
  'cardSecondary',
  'text',
  'textMuted',
  'border',
  'primary',
  'primaryText',
  'success',
  'warning',
  'danger',
  'tabBar',
  'tabIconDefault',
  'tabIconSelected',
];

function ColorInput({
  label,
  value,
  onChange,
  textColor,
  borderColor,
  bg,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textColor: string;
  borderColor: string;
  bg: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: textColor, fontWeight: '800', marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize="characters"
        placeholder="#FFFFFF"
        placeholderTextColor={textColor + '88'}
        style={{
          backgroundColor: bg,
          borderWidth: 1,
          borderColor,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: textColor,
          fontWeight: '700',
        }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const {
    colors,
    presets,
    theme,
    mode,
    selectedThemeId,
    fontPreset,
    customTheme,
    setSelectedThemeId,
    setFontPreset,
    setMode,
    updateCustomThemeColor,
    updateCustomThemeName,
    resetCustomTheme,
    fontFamily,
  } = useAppTheme();

  const styles = makeStyles(colors, fontFamily);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>Einstellungen</Text>
          <Text style={styles.subtitle}>
            Hier kann der Benutzer später auch Login, Konto, Cloud-Sync und Profil verwalten.
          </Text>
          <Text style={styles.previewLabel}>
            Aktives Design: {theme.name} · Schrift: {fontPreset}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme-Modus</Text>

          <View style={styles.rowWrap}>
            <Pressable
              onPress={() => setMode('preset')}
              style={[styles.pill, mode === 'preset' && styles.pillActive]}
            >
              <Text style={[styles.pillText, mode === 'preset' && styles.pillTextActive]}>
                Vorgefertigt
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('custom')}
              style={[styles.pill, mode === 'custom' && styles.pillActive]}
            >
              <Text style={[styles.pillText, mode === 'custom' && styles.pillTextActive]}>
                Eigenes Design
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>5 fertige Themes</Text>

          {presets.map((preset) => {
            const isActive = mode === 'preset' && selectedThemeId === preset.id;

            return (
              <Pressable
                key={preset.id}
                onPress={() => setSelectedThemeId(preset.id)}
                style={[styles.themeCard, isActive && styles.themeCardActive]}
              >
                <View style={styles.themeTop}>
                  <Text style={styles.themeName}>{preset.name}</Text>
                  <Text style={styles.themeState}>{isActive ? 'Aktiv' : 'Auswählen'}</Text>
                </View>

                <View style={styles.paletteRow}>
                  {[
                    preset.colors.background,
                    preset.colors.card,
                    preset.colors.primary,
                    preset.colors.text,
                  ].map((item, index) => (
                    <View key={`${preset.id}-${index}`} style={[styles.swatch, { backgroundColor: item }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schriftart</Text>

          <View style={styles.rowWrap}>
            {[
  { id: 'system', label: 'System' },
  { id: 'inter', label: 'Inter' },
  { id: 'serif', label: 'Playfair' },
  { id: 'mono', label: 'Mono' },
].map((item) => {
              const active = fontPreset === item.id;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setFontPreset(item.id as any)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Eigenes Theme gestalten</Text>

          <TextInput
            value={customTheme.name}
            onChangeText={updateCustomThemeName}
            placeholder="Name für dein Design"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <View style={styles.customActions}>
            <Pressable onPress={() => setMode('custom')} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Custom Theme aktivieren</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                Alert.alert(
                  'Custom Theme zurücksetzen',
                  'Möchtest du dein eigenes Design wirklich zurücksetzen?',
                  [
                    { text: 'Abbrechen', style: 'cancel' },
                    {
                      text: 'Zurücksetzen',
                      style: 'destructive',
                      onPress: () => resetCustomTheme(),
                    },
                  ]
                );
              }}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Zurücksetzen</Text>
            </Pressable>
          </View>

          {editableColorKeys.map((key) => (
            <ColorInput
              key={key}
              label={key}
              value={customTheme.colors[key]}
              onChange={(value) => updateCustomThemeColor(key, value)}
              textColor={colors.text}
              borderColor={colors.border}
              bg={colors.cardSecondary}
            />
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Später hier ergänzen</Text>
          <Text style={styles.infoText}>• Login / Account</Text>
          <Text style={styles.infoText}>• Profilbild</Text>
          <Text style={styles.infoText}>• Sync / Backup</Text>
          <Text style={styles.infoText}>• Benachrichtigungen</Text>
          <Text style={styles.infoText}>• Premium / Abo</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useAppTheme>['colors'], fontFamily: ReturnType<typeof useAppTheme>['fontFamily']) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 18,
      paddingBottom: 120,
      gap: 16,
    },
    heroCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    subtitle: {
      color: colors.textMuted,
      marginTop: 8,
      lineHeight: 21,
      fontFamily: fontFamily.regular,
    },
    previewLabel: {
      color: colors.primary,
      marginTop: 12,
      fontWeight: '800',
      fontFamily: fontFamily.bold,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '900',
      marginBottom: 12,
      fontFamily: fontFamily.bold,
    },
    rowWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardSecondary,
    },
    pillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pillText: {
      color: colors.text,
      fontWeight: '800',
      fontFamily: fontFamily.bold,
    },
    pillTextActive: {
      color: colors.primaryText,
    },
    themeCard: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    themeCardActive: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    themeTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    themeName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    themeState: {
      color: colors.textMuted,
      fontWeight: '700',
      fontFamily: fontFamily.regular,
    },
    paletteRow: {
      flexDirection: 'row',
      gap: 10,
    },
    swatch: {
      width: 34,
      height: 34,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    input: {
      backgroundColor: colors.cardSecondary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      marginBottom: 12,
      fontFamily: fontFamily.regular,
    },
    customActions: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    primaryBtn: {
      flex: 1,
      borderRadius: 14,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: colors.primaryText,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    secondaryBtn: {
      flex: 1,
      borderRadius: 14,
      backgroundColor: colors.cardSecondary,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryBtnText: {
      color: colors.text,
      fontWeight: '900',
      fontFamily: fontFamily.bold,
    },
    infoText: {
      color: colors.textMuted,
      marginBottom: 8,
      fontFamily: fontFamily.regular,
    },
  });
}