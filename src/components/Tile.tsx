import React, { useCallback } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSpringScale, useShake } from '../utils/animations';
import { THEME } from '../utils/colors';

type TileProps = {
  color: string;
  label?: string;
  size?: number;
  onPress?: () => void;
  borderColor?: string;
  /** When true, plays a shake animation (wrong move feedback) */
  shaking?: boolean;
  /** When true, tile dims to 30% opacity (algorithm elimination effect) */
  dimmed?: boolean;
  /** Override opacity for custom animation control */
  animatedOpacity?: Animated.Value;
  /** Override scale for custom animation control */
  animatedScale?: Animated.Value;
};

export default function Tile({
  color,
  label,
  size = 56,
  onPress,
  borderColor = THEME.border,
  shaking,
  dimmed,
  animatedOpacity,
  animatedScale,
}: TileProps) {
  const spring = useSpringScale();
  const shake = useShake();

  // Fire shake when shaking prop transitions to true
  const lastShaking = React.useRef(false);
  React.useEffect(() => {
    if (shaking && !lastShaking.current) {
      shake.fire();
    }
    lastShaking.current = !!shaking;
  }, [shaking, shake]);

  const handlePress = useCallback(() => {
    if (!onPress) return;
    spring.fire();
    onPress();
  }, [onPress, spring]);

  const scale = animatedScale ?? spring.scale;
  const opacity = animatedOpacity ?? (dimmed ? 0.3 : 1);

  const content = (
    <Animated.View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderColor,
          opacity,
          transform: [
            { scale },
            { translateX: shake.translateX },
          ],
        },
      ]}
    >
      {label ? (
        <Text style={[styles.label, { fontSize: size * 0.4 }]}>{label}</Text>
      ) : null}
    </Animated.View>
  );

  if (onPress) {
    return <Pressable onPress={handlePress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 3,
    // Subtle depth — dark theme shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
});
