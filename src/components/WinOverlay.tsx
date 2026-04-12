import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import CelebrationBurst from './CelebrationBurst';
import { THEME } from '../utils/colors';

type Props = {
  /** When true, the overlay fades in and CelebrationBurst fires */
  show: boolean;
  /** Main headline, e.g. "You won!" */
  title?: string;
  /** Score or summary line */
  score?: string;
  /** Optional detail line below score */
  detail?: string;
  /** Accent color for the score text */
  accentColor?: string;
  /** Extra content below the score card (buttons, etc.) */
  children?: React.ReactNode;
};

/**
 * Win celebration overlay.
 * Spec: board settles, then one clean burst + score reveal, 500ms, blocks input.
 */
export default function WinOverlay({
  show,
  title = 'You won!',
  score,
  detail,
  accentColor = '#4ade80',
  children,
}: Props) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!show) {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.8);
      cardOpacity.setValue(0);
      return;
    }

    // Delay card reveal slightly so burst fires first
    Animated.sequence([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [show, backdropOpacity, cardScale, cardOpacity]);

  if (!show) return null;

  return (
    <Animated.View
      style={[styles.backdrop, { opacity: backdropOpacity }]}
      pointerEvents="box-only"
    >
      <CelebrationBurst show={show} />
      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardOpacity,
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        {score ? (
          <Text style={[styles.score, { color: accentColor }]}>{score}</Text>
        ) : null}
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  card: {
    backgroundColor: THEME.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    minWidth: 240,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.textPrimary,
  },
  score: {
    fontSize: 36,
    fontWeight: '900',
  },
  detail: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
