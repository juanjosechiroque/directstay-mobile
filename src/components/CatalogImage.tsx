import { Image } from 'expo-image';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { CatalogImage as CatalogImageModel } from '@/features/property/types';
import { colors, radius } from '@/lib/theme';

interface CatalogImageProps {
  image: CatalogImageModel | null | undefined;
  height: number;
  borderRadius?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const PALETTE: readonly (readonly [string, string])[] = [
  ['#2F5D50', '#8FB39C'],
  ['#B4713D', '#E8C69C'],
  ['#3C5A7A', '#A6BED6'],
  ['#5B4636', '#C9AC8C'],
  ['#26453C', '#7C9A86'],
  ['#6E5540', '#D8BE9E'],
];

const STOPS = [0, 0.18, 0.36, 0.54, 0.72, 1];

/** Deterministic, dependency-free gradient derived from the asset id. */
function gradientFor(id: string): readonly [string, string] {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

/**
 * Catalog media renderer.
 *
 * Renders the real public asset when one exists and falls back to a deterministic local
 * placeholder when the URL is missing or fails to load. Placeholder seed paths therefore
 * never show a broken image, and no unverified asset is presented as licensed.
 */
export function CatalogImage({
  image,
  height,
  borderRadius = radius.lg,
  children,
  style,
}: CatalogImageProps) {
  const [failed, setFailed] = useState(false);
  const stops = useMemo(() => gradientFor(image?.id ?? ''), [image?.id]);
  const showRemote = Boolean(image?.url) && !failed;

  return (
    <View style={[styles.container, { height, borderRadius, backgroundColor: stops[0] }, style]}>
      {showRemote ? (
        <Image
          source={{ uri: image?.url ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          accessibilityLabel={image?.altText ?? undefined}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={StyleSheet.absoluteFill}>
          {STOPS.map((opacity) => (
            <View key={opacity} style={[styles.strip, { backgroundColor: stops[1], opacity }]} />
          ))}
          <View style={styles.glow} />
        </View>
      )}
      {children ? <View style={styles.overlay}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  strip: {
    flex: 1,
  },
  glow: {
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
