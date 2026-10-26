import Mapbox, {
  Camera,
  CircleLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
  StyleURL,
  type CircleLayerStyle,
  type MapState,
} from '@rnmapbox/maps';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarHead } from '@/components/avatar-head';
import {
  MATERIAL_COLORS,
  MATERIAL_GROUPS,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
} from '@/constants/map';
import { pinFeatureCollection } from '@/features/map/pin';
import { MAPBOX_TOKEN } from '@/features/map/token';
import { viewportFromVisibleBounds } from '@/features/map/viewport';

import type { MapCanvasProps } from './map-canvas';

// The token is public and inlined at build time. The screen only mounts this module when it is
// present, but setting it here keeps the native SDK configured for every map instance.
if (MAPBOX_TOKEN) Mapbox.setAccessToken(MAPBOX_TOKEN);

const PIN_COLOR_EXPRESSION = [
  'match',
  ['get', 'material_group'],
  ...MATERIAL_GROUPS.flatMap((group) => [group, MATERIAL_COLORS[group]]),
  MATERIAL_COLORS.other,
] as CircleLayerStyle['circleColor'];

/**
 * The real Mapbox surface (iOS/Android).
 *
 * Kept in a `.native.tsx` file so the web export never bundles `@rnmapbox/maps`. It renders the
 * DT pins as one GeoJSON source with a material-keyed circle layer, and the player's avatar head
 * as a single point annotation.
 */
export function MapCanvas({
  pins,
  playerPosition,
  avatar,
  onViewportChange,
  onPinPress,
  onReady,
  onError,
  pinsLoading = false,
}: MapCanvasProps) {
  const mapRef = useRef<Mapbox.MapView>(null);

  async function reportViewport() {
    const bounds = await mapRef.current?.getVisibleBounds();
    const viewport = viewportFromVisibleBounds(bounds);
    if (viewport) onViewportChange(viewport);
  }

  function handleReady() {
    onReady?.();
    void reportViewport();
  }

  function handleMapIdle(_state: MapState) {
    void reportViewport();
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        styleURL={StyleURL.Outdoors}
        logoEnabled
        attributionEnabled
        compassEnabled={false}
        scaleBarEnabled={false}
        scrollEnabled={!pinsLoading}
        zoomEnabled={!pinsLoading}
        rotateEnabled={false}
        pitchEnabled={false}
        onDidFinishLoadingMap={handleReady}
        onMapIdle={handleMapIdle}
        onMapLoadingError={() => onError?.()}
      >
        <Camera
          defaultSettings={{
            centerCoordinate: [MAP_DEFAULT_CENTER[0], MAP_DEFAULT_CENTER[1]],
            zoomLevel: MAP_DEFAULT_ZOOM,
          }}
        />

        {pins.length > 0 && (
          <ShapeSource
            id="litter-pins"
            shape={pinFeatureCollection(pins)}
            onPress={(event) => {
              const id = Number(event.features[0]?.properties?.pin_id);
              if (Number.isFinite(id)) onPinPress(id);
            }}
          >
            <CircleLayer
              id="litter-pins-circles"
              style={{
                circleColor: PIN_COLOR_EXPRESSION,
                circleRadius: 6,
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 1.5,
                circleOpacity: 0.92,
              }}
            />
          </ShapeSource>
        )}

        {playerPosition && (
          <PointAnnotation
            id="player-location"
            coordinate={[playerPosition.longitude, playerPosition.latitude]}
          >
            <View style={styles.marker}>
              <AvatarHead avatar={avatar} size={32} />
            </View>
          </PointAnnotation>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  marker: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#378765',
  },
});
