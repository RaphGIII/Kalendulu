import { StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { useAppTheme } from './ThemeProvider';

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: ReturnType<typeof createFactory<T>>
) {
  const { colors, fontFamily } = useAppTheme();

  return useMemo(() => factory(colors, fontFamily), [colors, fontFamily, factory]);
}

export function createFactory<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ReturnType<typeof useAppTheme>['colors'], fontFamily: ReturnType<typeof useAppTheme>['fontFamily']) => T
) {
  return factory;
}