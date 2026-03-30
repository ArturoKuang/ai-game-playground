import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const EMOJIS = ['\u2b50', '\u2728', '\ud83c\udf1f', '\ud83c\udf89', '\ud83d\udcab', '\u2764\ufe0f'];
const NUM_PARTICLES = 16;

type Props = { show: boolean };

export default function CelebrationBurst({ show }: Props) {
  const particles = useRef(
    Array.from({ length: NUM_PARTICLES }, (_, i) => {
      const angle = (i / NUM_PARTICLES) * Math.PI * 2 + Math.random() * 0.4;
      return {
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        angle,
        distance: 70 + Math.random() * 70,
        emoji: EMOJIS[i % EMOJIS.length],
        delay: Math.random() * 200,
      };
    })
  ).current;

  useEffect(() => {
    if (!show) return;

    particles.forEach((p) => {
      p.translateX.setValue(0);
      p.translateY.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);

      Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.translateX, {
            toValue: Math.cos(p.angle) * p.distance,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(p.translateY, {
            toValue: Math.sin(p.angle) * p.distance,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(p.opacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.delay(300),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.spring(p.scale, {
              toValue: 1.3,
              friction: 4,
              tension: 120,
              useNativeDriver: true,
            }),
            Animated.timing(p.scale, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    });
  }, [show, particles]);

  if (!show) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.particle,
            {
              opacity: p.opacity,
              transform: [
                { translateX: p.translateX },
                { translateY: p.translateY },
                { scale: p.scale },
              ],
            },
          ]}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
    fontSize: 24,
  },
});
