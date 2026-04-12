import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { budgetColor, THEME } from '../utils/colors';

type Props = {
  /** Moves remaining */
  remaining: number;
  /** Total budget */
  total: number;
  /** Optional label (default: "Moves") */
  label?: string;
};

/**
 * Animated budget / move counter.
 * Color smoothly transitions green → yellow → red as budget depletes.
 * Spec: continuous color shift, no bounce per tick.
 */
export default function MoveCounter({
  remaining,
  total,
  label = 'Moves',
}: Props) {
  const ratio = total > 0 ? remaining / total : 0;
  const color = budgetColor(ratio);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.count, { color }]}>{remaining}</Text>
        <Text style={styles.separator}>/</Text>
        <Text style={styles.total}>{total}</Text>
      </View>
      {/* Budget bar */}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${Math.max(0, Math.min(100, ratio * 100))}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  count: {
    fontSize: 28,
    fontWeight: '900',
  },
  separator: {
    color: THEME.textMuted,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  total: {
    color: THEME.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  track: {
    width: 80,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
