import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

export default function HabitGraph({
  points,
  accent = '#D4AF37',
}: {
  points: { label: string; value: number }[];
  accent?: string;
}) {
  const w = 320;
  const h = 120;
  const pad = 14;

  const { path, circles } = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => p.value));
    const stepX = (w - pad * 2) / Math.max(1, points.length - 1);

    const xy = points.map((p, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - p.value / max) * (h - pad * 2);
      return { x, y };
    });

    const d = xy
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    return { path: d, circles: xy };
  }, [points]);

  return (
    <View style={styles.wrap}>
      {/* Glow */}
      <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
        <Path d={path} stroke="rgba(212,175,55,0.35)" strokeWidth={10} fill="none" />
      </Svg>

      <Svg width={w} height={h}>
        <Path d={path} stroke={accent} strokeWidth={3.5} fill="none" />
        {circles.map((c, idx) => (
          <Circle key={idx} cx={c.x} cy={c.y} r={4} fill={accent} />
        ))}
      </Svg>

      <View style={styles.labels}>
        {points.map((p, i) => (
          <Text key={i} style={styles.label}>
            {p.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  labels: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  label: { color: 'rgba(255,255,255,0.65)', fontWeight: '900', fontSize: 12 },
});