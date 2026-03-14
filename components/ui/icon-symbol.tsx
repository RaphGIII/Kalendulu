import React from 'react';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  name: string;
  size?: number;
  color: string;
  style?: any;
};

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'chevron.right': 'chevron-forward',
  'chevron.left': 'chevron-back',
  'chevron.down': 'chevron-down',
  'house.fill': 'home',
  'paperplane.fill': 'paper-plane',
};

export function IconSymbol({ name, size = 18, color, style }: Props) {
  const mapped = iconMap[name] ?? 'ellipse';
  return <Ionicons name={mapped} size={size} color={color} style={style} />;
}