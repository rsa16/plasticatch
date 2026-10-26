import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import type { MapPin } from '@/features/map/pin';
import type { PlayerPosition } from '@/features/map/location';
import type { RiskCell } from '@/features/map/risk';
import type { Viewport } from '@/features/map/viewport';
import { useTheme } from '@/theme';

export type MapCanvasProps = {
  pins: readonly MapPin[];
  /** OpenLitterMap pins, drawn only while its own toggle is on. */
  olmPins: readonly MapPin[];
  /** EPA modeled cells, drawn as a non-interactive fill layer. */
  riskCells: readonly RiskCell[];
  playerPosition: PlayerPosition | null;
  avatar: Record<string, string> | null;
  /** Fired on first load and whenever the camera settles on a new visible box. */
  onViewportChange: (viewport: Viewport) => void;
  onPinPress: (pinId: number, source: string) => void;
  onReady?: () => void;
  onError?: () => void;
  /** True while the first Debris Tracker pin query is in flight. */
  pinsLoading?: boolean;
};

/**
 * Web/bundler fallback for the real map.
 *
 * `@rnmapbox/maps` is a native module and cannot run in the web export, so this file must never
 * import it. Metro picks `map-canvas.native.tsx` on iOS/Android and this fallback everywhere
 * else; the pin query and controls still work.
 */
export function MapCanvas({ pins, olmPins, riskCells }: MapCanvasProps) {
  const theme = useTheme();
  const counts = [
    `${pins.length} Debris Tracker pins`,
    olmPins.length > 0 ? `${olmPins.length} OpenLitterMap pins` : null,
    riskCells.length > 0 ? `${riskCells.length} EPA risk cells` : null,
  ].filter(Boolean);

  return (
    <View style={[styles.container, { backgroundColor: theme.color.surfaceSunken }]}>
      <Image
        source={require('@/assets/images/map-placeholder.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel="Map preview. The interactive Mapbox map is available in the mobile app."
      />
      <View
        style={[
          styles.notice,
          { backgroundColor: theme.color.surface, borderColor: theme.color.line },
        ]}
      >
        <Text variant="caption" tone="muted">
          Interactive maps are available in the PlastiCatch mobile app.
          {counts.length > 0 ? ` ${counts.join(' · ')} in this viewport.` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  notice: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
