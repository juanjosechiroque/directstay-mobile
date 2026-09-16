import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { UnitImage } from '@/features/property/types';
import { colors, radius } from '@/lib/theme';

interface MockImageProps {
  image: UnitImage;
  height: number;
  borderRadius?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const STOPS = [0, 0.18, 0.36, 0.54, 0.72, 1];

/**
 * Local, dependency-free image placeholder. Renders a deterministic gradient from the
 * mock `UnitImage` stops so no screen ever depends on a remote image or a bundled photo.
 */
export function MockImage({
  image,
  height,
  borderRadius = radius.lg,
  children,
  style,
}: MockImageProps) {
  return (
    <View style={[styles.container, { height, borderRadius, backgroundColor: image.from }, style]}>
      <View style={[StyleSheet.absoluteFill, styles.gradient]}>
        {STOPS.map((opacity) => (
          <View key={opacity} style={[styles.strip, { backgroundColor: image.to, opacity }]} />
        ))}
      </View>
      <View style={styles.sun} />
      {children ? <View style={styles.overlay}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'column',
  },
  strip: {
    flex: 1,
  },
  sun: {
    position: 'absolute',
    top: '18%',
    right: '14%',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 244, 214, 0.35)',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: colors.overlaySoft,
  },
});
