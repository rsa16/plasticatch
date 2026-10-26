import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarButton } from '@/components/avatar-button';
import { useBottomBarHeight } from '@/components/bottom-menu';
import { MapCanvas } from '@/components/map/map-canvas';
import { PinSheet } from '@/components/map/pin-sheet';
import { MenuScreen } from '@/components/menu-screen';
import { useMenuTitleTop } from '@/components/screen-frame';
import { Text } from '@/components/text';
import {
  MATERIAL_COLORS,
  MATERIAL_GROUPS,
  MATERIAL_LABELS,
  MAPBOX_TOKEN_ENV,
} from '@/constants/map';
import { Brand, Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';
import {
  isSparsePinView,
  useMapPins,
  stateScope,
  type MapPin,
  type Viewport,
} from '@/features/map';
import { usePlayerLocation } from '@/features/map/location';
import { hasMapboxToken } from '@/features/map/token';

/** The map starts this far below the top of the title pill. */
const MAP_OFFSET = 20;
/** Centre the 44 pt avatar button on the 52 pt title pill. */
const AVATAR_OFFSET = 4;

export default function MapScreen() {
  const titleTop = useMenuTitleTop();
  const barHeight = useBottomBarHeight();
  const profile = useSessionStore((state) => state.profile);
  const tokenPresent = hasMapboxToken();
  const { position } = usePlayerLocation();

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [myState, setMyState] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);

  const scope = stateScope(myState, profile?.homeState);
  const query = useMapPins(viewport, scope);

  // Keep the last successful viewport on screen while a new one loads or after it fails.
  const [cache, setCache] = useState<{ page: typeof query.data; pins: MapPin[] }>({
    page: undefined,
    pins: [],
  });
  if (query.data && cache.page !== query.data) {
    setCache({ page: query.data, pins: query.data.pins });
  }

  const pins = query.data?.pins ?? cache.pins;
  const loading = Boolean(viewport) && query.isLoading;
  const failed = query.isError || mapError;
  const busy = loading || !tokenPresent;
  const sparse = Boolean(viewport) && !loading && !failed && isSparsePinView(pins);

  function retry() {
    if (mapError) {
      setMapError(false);
      setMapAttempt((attempt) => attempt + 1);
    } else {
      void query.refetch();
    }
  }

  function toggleMyState() {
    setSelectedPin(null);
    setMyState((enabled) => !enabled);
  }

  return (
    <MenuScreen
      title="MAP"
      contentPointerEvents="box-none"
      background={
        <>
          <View style={[styles.map, { top: titleTop + MAP_OFFSET, bottom: barHeight }]}>
            {tokenPresent ? (
              <MapCanvas
                key={mapAttempt}
                pins={pins}
                playerPosition={position}
                avatar={profile?.avatar ?? null}
                pinsLoading={busy}
                onViewportChange={setViewport}
                onPinPress={(pinId) => {
                  const pin = pins.find((candidate) => candidate.id === pinId);
                  if (pin) setSelectedPin(pin);
                }}
                onError={() => setMapError(true)}
              />
            ) : (
              <MapSetupState />
            )}
          </View>
          <View style={styles.topFade} pointerEvents="none" />
        </>
      }
    >
      <View style={styles.overlay} pointerEvents="box-none">
        {loading && <MapSkeleton />}

        {failed && (
          <StatusCard
            text={mapError ? "The map couldn't load." : "Couldn't load pins."}
            action="RETRY"
            onAction={retry}
          />
        )}

        {sparse && (
          <View style={[styles.sparse, { bottom: barHeight + 128 }]} pointerEvents="none">
            <Text variant="body" style={styles.sparseText}>
              No confirmed hotspots nearby — you can still log litter you find.
            </Text>
          </View>
        )}

        <View style={[styles.controls, { bottom: barHeight + 36 }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="My State"
            accessibilityHint="Limits litter pins to your home state"
            accessibilityState={{ checked: myState, disabled: busy }}
            disabled={busy}
            onPress={toggleMyState}
            style={({ pressed }) => [
              styles.chip,
              myState && styles.chipOn,
              (pressed || busy) && styles.dimmed,
            ]}
          >
            <Text variant="caption">{myState ? 'My State ✓' : 'My State'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Map layers"
            accessibilityState={{ expanded: layersOpen }}
            disabled={busy}
            onPress={() => setLayersOpen((open) => !open)}
            style={({ pressed }) => [styles.chip, (pressed || busy) && styles.dimmed]}
          >
            <Text variant="caption">Layers ▾</Text>
          </Pressable>

          {query.data?.truncated && (
            <Text variant="caption" style={styles.truncated}>
              Newest pins only
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Data sources and about"
          onPress={() => router.push('/settings/about')}
          style={({ pressed }) => [
            styles.dataSources,
            { bottom: barHeight + 8 },
            pressed && styles.dimmed,
          ]}
        >
          <Text variant="caption" style={styles.dataSourcesText}>
            Data sources
          </Text>
        </Pressable>

        {layersOpen && (
          <View style={[styles.layers, { bottom: barHeight + 92 }]}>
            <Text variant="sectionTitle" accessibilityRole="header">
              Layers
            </Text>
            <LayerRow title="Debris Tracker" detail="Active pins in this viewport" badge="ON" />
            <LayerRow
              title="OpenLitterMap"
              detail="Own toggle — layer arrives with ticket 33"
              badge="SOON"
            />
            <LayerRow
              title="EPA risk"
              detail="Modeled estimate — toggle-only, never clickable"
              badge="SOON"
            />
            <View style={styles.legend}>
              {MATERIAL_GROUPS.map((group) => (
                <View key={group} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: MATERIAL_COLORS[group] }]} />
                  <Text variant="caption">{MATERIAL_LABELS[group]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedPin && (
          <PinSheet pin={selectedPin} bottom={barHeight + 8} onClose={() => setSelectedPin(null)} />
        )}
      </View>
      <AvatarButton top={titleTop + AVATAR_OFFSET} side="left" />
    </MenuScreen>
  );
}

function MapSetupState() {
  return (
    <View style={styles.setup}>
      <Text variant="sectionTitle" accessibilityRole="header">
        Map setup needed
      </Text>
      <Text variant="body">
        Add {MAPBOX_TOKEN_ENV} to a local .env file (see .env.example), then rebuild the development
        client. The rest of PlastiCatch keeps working without it.
      </Text>
    </View>
  );
}

function MapSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading map pins"
    >
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonDot} />
        <View style={styles.skeletonBar} />
      </View>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonDot} />
        <View style={[styles.skeletonBar, styles.skeletonBarShort]} />
      </View>
    </View>
  );
}

function StatusCard({
  text,
  action,
  onAction,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.status}>
      <Text variant="body">{text}</Text>
      {action && onAction && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.retry, pressed && styles.dimmed]}
        >
          <Text variant="caption" style={styles.retryText}>
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function LayerRow({ title, detail, badge }: { title: string; detail: string; badge: string }) {
  return (
    <View style={styles.layerRow} accessible accessibilityLabel={`${title}. ${detail}. ${badge}`}>
      <View style={styles.layerText}>
        <Text variant="caption" style={styles.layerTitle}>
          {title}
        </Text>
        <Text variant="body">{detail}</Text>
      </View>
      <View style={[styles.badge, badge === 'ON' && styles.badgeOn]}>
        <Text variant="caption">{badge}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The map frame overhangs the screen: 25pt on the left, 34pt on the right.
  map: {
    position: 'absolute',
    left: -25,
    right: -34,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 178,
    experimental_backgroundImage:
      'linear-gradient(to bottom, #82b39e 0%, #f7f8f7 50%, rgba(247, 248, 247, 0) 100%)',
  },
  overlay: {
    flex: 1,
  },
  setup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
    backgroundColor: Brand.field,
  },
  status: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: 'rgba(247, 248, 247, 0.96)',
  },
  skeleton: {
    position: 'absolute',
    top: Spacing.three,
    left: Spacing.four,
    right: Spacing.four,
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 15,
    backgroundColor: 'rgba(247, 248, 247, 0.96)',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  skeletonDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Brand.field,
  },
  skeletonBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: Brand.field,
  },
  skeletonBarShort: {
    flex: 0.6,
  },
  retry: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 10,
    backgroundColor: Brand.accent,
  },
  retryText: {
    color: Brand.surface,
  },
  sparse: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: 'rgba(247, 248, 247, 0.96)',
  },
  sparseText: {
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Brand.accent,
    backgroundColor: 'rgba(247, 248, 247, 0.94)',
  },
  chipOn: {
    backgroundColor: Brand.accentMuted,
  },
  truncated: {
    marginLeft: 'auto',
    color: Brand.rowText,
  },
  dataSources: {
    position: 'absolute',
    left: Spacing.four + 2,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 10,
    backgroundColor: 'rgba(9, 20, 15, 0.55)',
  },
  dataSourcesText: {
    color: Brand.surface,
    textDecorationLine: 'underline',
  },
  layers: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: 24,
    backgroundColor: 'rgba(247, 248, 247, 0.98)',
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  layerText: {
    flex: 1,
    gap: Spacing.half,
  },
  layerTitle: {
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: 10,
    backgroundColor: Brand.field,
  },
  badgeOn: {
    backgroundColor: Brand.accentMuted,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dimmed: {
    opacity: 0.6,
  },
});
