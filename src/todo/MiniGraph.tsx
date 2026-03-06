import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function MiniGraph() {
  const w = 220;
  const h = 80;

  const path = useMemo(() => {
    // eine ruhige “hand-drawn” Kurve, ähnlich Referenz
    return [
      `M 10 ${h * 0.62}`,
      `C 45 ${h * 0.38}, 70 ${h * 0.80}, 95 ${h * 0.58}`,
      `C 120 ${h * 0.36}, 145 ${h * 0.75}, 170 ${h * 0.52}`,
      `C 190 ${h * 0.40}, 205 ${h * 0.56}, 210 ${h * 0.44}`,
    ].join(' ');
  }, [h]);

  return (
    <View style={styles.wrap}>
      {/* Glow */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={path} stroke="rgba(255,79,216,0.35)" strokeWidth={10} fill="none" />
      </Svg>

      {/* Line */}
      <Svg width={w} height={h}>
        <Path d={path} stroke="#FF4FD8" strokeWidth={3.5} fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 14,
    borderRadius: 18,
    overflow: 'hidden',
  },
});