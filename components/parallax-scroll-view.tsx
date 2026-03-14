import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = ScrollViewProps & {
  headerImage: React.ReactNode;
  headerBackgroundColor: {
    dark: string;
    light: string;
  };
};

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  style,
  ...rest
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const bg = headerBackgroundColor[colorScheme as 'light' | 'dark'];

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={[styles.header, { backgroundColor: bg }]}>{headerImage}</View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} {...rest}>
        {children}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
});