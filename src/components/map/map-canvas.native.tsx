import Mapbox, {
  Camera,
  CircleLayer,
  FillLayer,
  MapView,
  PointAnnotation,
  ShapeSource,
  StyleURL,
  type CircleLayerStyle,
  type FillLayerStyle,
  type MapState,
} from '@rnmapbox/maps';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AvatarHead } from '@/components/avatar-head';
import {
  EPA_RISK_COLORS,
  EPA_RISK_OPACITY,
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MATERIAL_COLORS,
  MATERIAL_GROUPS,
  OLM_PIN_COLOR,
} from '@/constants/map';
import { pinFeatureCollection } from '@/features/map/pin';
import { riskFeatureCollection } from '@/features/map/risk';
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

const RISK_COLOR_EXPRESSION = [
  'interpolate',
  ['linear'],
  ['get', 'density'],
  1.5,
  EPA_RISK_COLORS.low,
  3.5,
  EPA_RISK_COLORS.mid,
  6.2,
  EPA_RISK_COLORS.high,
] as FillLayerStyle['fillColor'];

/**
 * The real Mapbox surface (iOS/Android).
 *
 * Kept in a `.native.tsx` file so the web export never bundles `@rnmapbox/maps`. Three layers are
 * deliberately separate: EPA modeled cells sit at the bottom and are never interactive,
 * OpenLitterMap pins sit above them under their own toggle, and Debris Tracker pins stay on top.
 */
export function MapCanvas({
  pins,
  olmPins,
  riskCells,
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

  function handlePinPress(featureSource: 'debris_tracker' | 'openlittermap') {
    return (event: { features: { properties?: Record<string, unknown> | null }[] }) => {
      const id = Number(event.features[0]?.properties?.pin_id);
      if (Number.isFinite(id)) onPinPress(id, featureSource);
    };
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

        {/* EPA modeled grid: a low-opacity density fill with no press handler anywhere. */}
        {riskCells.length > 0 && (
          <ShapeSource id="epa-risk" shape={riskFeatureCollection(riskCells)}>
            <FillLayer
              id="epa-risk-fill"
              style={{
                fillColor: RISK_COLOR_EXPRESSION,
                fillOpacity: EPA_RISK_OPACITY,
                fillOutlineColor: 'rgba(47, 125, 99, 0.18)',
              }}
            />
          </ShapeSource>
        )}

        {/* ODbL-isolated OpenLitterMap pins: own source, own hue, own press target. */}
        {olmPins.length > 0 && (
          <ShapeSource
            id="olm-pins"
            shape={pinFeatureCollection(olmPins)}
            onPress={handlePinPress('openlittermap')}
          >
            <CircleLayer
              id="olm-pins-circles"
              style={{
                circleColor: OLM_PIN_COLOR,
                circleRadius: 5,
                circleStrokeColor: '#ffffff',
                circleStrokeWidth: 1.25,
                circleOpacity: 0.9,
              }}
            />
          </ShapeSource>
        )}

        {pins.length > 0 && (
          <ShapeSource
            id="litter-pins"
            shape={pinFeatureCollection(pins)}
            onPress={handlePinPress('debris_tracker')}
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
