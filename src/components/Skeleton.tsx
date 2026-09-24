import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReduceMotion } from '@/lib/use-reduce-motion';
import { colors, radius } from '@/lib/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading placeholder block. It pulses with the core `Animated` API (no extra library) and
 * stays static when the OS asks to reduce motion. Purely decorative: wrap groups of blocks in
 * `SkeletonGroup` so assistive tech announces a single loading region instead.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View style={[styles.block, { width, height, borderRadius, opacity }, style]} />;
}

interface SkeletonGroupProps {
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Exposes a set of skeleton blocks as one labelled busy region for screen readers. */
export function SkeletonGroup({ label, children, style }: SkeletonGroupProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={style}
    >
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.neutralSoft,
  },
});
