/**
 * Shared animation hooks for Algorithm Arcade.
 * Timings from leetcode/specs/game-feel.md animation budget.
 */

import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

/* ── Spring Scale (tap feedback) ── */
// Spec: 1 → 1.12 → 1, 150ms, non-blocking

export function useSpringScale() {
  const scale = useRef(new Animated.Value(1)).current;

  const fire = useCallback(() => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.12,
        duration: 75,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 75,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  return { scale, fire };
}

/* ── Shake (wrong move) ── */
// Spec: ±3px, 2 cycles, 200ms, non-blocking

export function useShake() {
  const translateX = useRef(new Animated.Value(0)).current;

  const fire = useCallback(() => {
    translateX.setValue(0);
    Animated.sequence([
      Animated.timing(translateX, {
        toValue: 3,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: -3,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 3,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX]);

  return { translateX, fire };
}

/* ── Fade dim (algorithm effect — tiles fade to 30%) ── */
// Spec: 300ms, non-blocking

export function useFadeDim() {
  const opacity = useRef(new Animated.Value(1)).current;

  const dim = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const restore = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const reset = useCallback(() => {
    opacity.setValue(1);
  }, [opacity]);

  return { opacity, dim, restore, reset };
}

/* ── Slide (move result — tiles slide to new position) ── */
// Spec: 250ms, non-blocking

export function useSlide() {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const slideTo = useCallback(
    (x: number, y: number, onDone?: () => void) => {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: x,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: y,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(onDone ? () => onDone() : undefined);
    },
    [translateX, translateY],
  );

  const reset = useCallback(() => {
    translateX.setValue(0);
    translateY.setValue(0);
  }, [translateX, translateY]);

  return { translateX, translateY, slideTo, reset };
}

/* ── Pulse (signature animation accent) ── */
// Spec: 200-400ms, non-blocking, uses accent color via opacity

export function usePulse() {
  const opacity = useRef(new Animated.Value(0)).current;

  const fire = useCallback(() => {
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity]);

  return { opacity, fire };
}

/* ── Crossfade (difficulty transition) ── */
// Spec: 400ms, briefly blocks input

export function useCrossfade() {
  const opacity = useRef(new Animated.Value(1)).current;

  const transition = useCallback(
    (onChange: () => void) => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onChange();
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    },
    [opacity],
  );

  return { opacity, transition };
}
