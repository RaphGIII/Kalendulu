import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  title: string;
  children: React.ReactNode;
};

export function Collapsible({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const theme = (useColorScheme() ?? 'light') as 'light' | 'dark';

  return (
    <ThemedView style={styles.container}>
      <Pressable style={styles.trigger} onPress={() => setOpen((v) => !v)}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <IconSymbol
          name={open ? 'chevron.down' : 'chevron.right'}
          size={18}
          color={Colors[theme].icon}
        />
      </Pressable>

      {open ? <View style={styles.content}>{children}</View> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    paddingTop: 4,
  },
});