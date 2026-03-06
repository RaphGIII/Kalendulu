import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MiniGraph from './MiniGraph';

type Props = {
  name: string;
  onClose: () => void;
};

const NAV_BG = '#081637'; // sehr dunkles navy wie im Bild
const TEXT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.70)';

export default function SideMenu({ name, onClose }: Props) {
  const Item = ({
    icon,
    label,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    label: string;
  }) => (
    <Pressable style={styles.item} android_ripple={{ color: 'rgba(255,255,255,0.06)' }}>
      <Ionicons name={icon} size={18} color={MUTED} />
      <Text style={styles.itemText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      {/* Close pill (oben rechts wie Referenz) */}
      <View style={styles.topRow}>
        <View style={{ width: 44 }} />
        <Pressable onPress={onClose} style={styles.closePill}>
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.82)" />
        </Pressable>
      </View>

      {/* Name block */}
      <View style={styles.nameBlock}>
        <Text style={styles.firstName}>{name}</Text>
        <Text style={styles.lastName}>Mitchell</Text>
      </View>

      {/* Menu items */}
      <View style={styles.menu}>
        <Item icon="bookmark-outline" label="Templates" />
        <Item icon="grid-outline" label="Categories" />
        <Item icon="analytics-outline" label="Analytics" />
        <Item icon="settings-outline" label="Settings" />
      </View>

      {/* Bottom */}
      <View style={styles.bottom}>
        <Text style={styles.good}>Good</Text>
        <Text style={styles.consistency}>Consistency</Text>
        <MiniGraph />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: NAV_BG,
    paddingHorizontal: 26,
    paddingTop: 54,
    paddingBottom: 24,
  },

  topRow: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // runde, leicht transparente pill wie im Bild
  closePill: {
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  nameBlock: {
    marginTop: 18,
  },
  firstName: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 34,
  },
  lastName: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 34,
    marginTop: 2,
  },

  menu: {
    marginTop: 22,
    gap: 10,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
  },

  itemText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  bottom: {
    marginTop: 'auto',
  },
  good: {
    color: MUTED,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  consistency: {
    color: TEXT,
    fontWeight: '900',
    fontSize: 18,
    marginTop: 6,
    letterSpacing: 0.2,
  },
});