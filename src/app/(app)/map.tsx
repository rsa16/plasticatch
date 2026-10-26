import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { MapCanvas } from '@/components/map/map-canvas';
import { PinSheet } from '@/components/map/pin-sheet';
import { PlayerChip, StreakChip } from '@/components/player-chip';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge, Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Sheet } from '@/components/ui/sheet';
import {
  EPA_RISK_ATTRIBUTION,
  MAPBOX_TOKEN_ENV,
  MATERIAL_COLORS,
  MATERIAL_GROUPS,
  MATERIAL_LABELS,
  SOURCE_META,
} from '@/constants/map';
import { useSessionStore } from '@/features/auth';
import {
  DEFAULT_LAYERS,
  isSparsePinView,
  stateScope,
  toggleSecondaryLayer,
  useMapPins,
  useOlmPins,
  useRiskAreas,
  type LayerState,
  type MapPin,
  type SecondaryLayer,
  type Viewport,
} from '@/features/map';
import { usePlayerLocation } from '@/features/map/location';
import { hasMapboxToken } from '@/features/map/token';
import { makeStyles, useTheme } from '@/theme';

export default function MapScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const barHeight = useBottomBarHeight();
  const profile = useSessionStore((state) => state.profile);
  const tokenPresent = hasMapboxToken();
  const { position } = usePlayerLocation();

  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [myState, setMyState] = useState(true);
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selected, setSelected] = useState<{ pin: MapPin; source: string } | null>(null);
  const [mapError, setMapError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);

  const scope = stateScope(myState, profile?.homeState);
  const query = useMapPins(viewport, scope);
  const olmQuery = useOlmPins(viewport, scope, layers);
  const riskQuery = useRiskAreas(viewport, scope, layers);

  // Keep the last successful viewport on screen while a new one loads or after it fails.
  const [cache, setCache] = useState<{ page: typeof query.data; pins: MapPin[] }>({
    page: undefined,
    pins: [],
  });
  if (query.data && cache.page !== query.data) {
    setCache({ page: query.data, pins: query.data.pins });
  }

  const pins = query.data?.pins ?? cache.pins;
  const olmPins = layers.olm ? (olmQuery.data?.pins ?? []) : [];
  const riskCells = layers.epa ? (riskQuery.data ?? []) : [];
  const selectedPin = selected?.pin ?? null;
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
    setSelected(null);
    setMyState((enabled) => !enabled);
  }

  function toggleLayer(layer: SecondaryLayer) {
    const next = toggleSecondaryLayer(layers, layer);

    // Turning a layer off must also dismiss a sheet that belongs to it.
    if (!next[layer]) {
      const source = layer === 'olm' ? 'openlittermap' : 'epa';
      if (selected?.source === source) setSelected(null);
    }

    setLayers(next);
  }

  function selectPin(pinId: number, source: string) {
    const candidates = source === 'openlittermap' ? olmPins : pins;
    const pin = candidates.find((candidate) => candidate.id === pinId);
    if (pin) setSelected({ pin, source });
  }

  return (
    <Screen
      contentPointerEvents="box-none"
      background={
        <View style={styles.map}>
          {tokenPresent ? (
            <MapCanvas
              key={mapAttempt}
              pins={pins}
              olmPins={olmPins}
              riskCells={riskCells}
              playerPosition={position}
              avatar={profile?.avatar ?? null}
              pinsLoading={busy}
              onViewportChange={setViewport}
              onPinPress={selectPin}
              onError={() => setMapError(true)}
            />
          ) : (
            <MapSetupState />
          )}
        </View>
      }
    >
      <View style={styles.topRow} pointerEvents="box-none">
        <PlayerChip />
        <View style={styles.topRight}>
          <View style={styles.streakPill}>
            <StreakChip streak={profile?.currentStreak ?? 0} />
          </View>
        </View>
      </View>

      {loading && <MapSkeleton />}

      {failed && (
        <View style={styles.statusWrap}>
          <Card style={styles.status}>
            <Text variant="body">
              {mapError ? "The map couldn't load." : "Couldn't load pins."}
            </Text>
            <Button label="Retry" variant="secondary" onPress={retry} />
          </Card>
        </View>
      )}

      {sparse && (
        <View style={[styles.sparse, { bottom: barHeight + 88 }]} pointerEvents="none">
          <Text variant="caption" tone="muted" style={styles.sparseText}>
            No confirmed litter nearby. You may still take pictures.
          </Text>
        </View>
      )}

      <View style={[styles.controls, { bottom: barHeight + 16 }]} pointerEvents="box-none">
        <Chip
          label="My State"
          selected={myState}
          onPress={toggleMyState}
          disabled={busy}
          accessibilityRole="switch"
          accessibilityLabel="My State"
          accessibilityHint="Limits litter pins to your home state"
        />
        <Chip
          label="Layers"
          selected={layersOpen}
          onPress={() => setLayersOpen((open) => !open)}
          disabled={busy}
          icon={
            <SymbolView
              name={{ ios: 'square.3.layers.3d', android: 'layers', web: 'layers' }}
              size={16}
              tintColor={theme.color.inkMuted}
            />
          }
          accessibilityLabel="Map layers"
          accessibilityHint="Opens the map layer controls"
        />
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Data sources and about"
          onPress={() => router.push('/settings/about')}
          style={({ pressed }) => [styles.dataSources, pressed && styles.pressed]}
        >
          <Text variant="caption" tone="muted">
            Data sources
          </Text>
        </Pressable>
      </View>

      {layersOpen && (
        <Sheet
          onClose={() => setLayersOpen(false)}
          bottom={barHeight + 8}
          accessibilityLabel="Close layer controls"
        >
          <Text variant="heading" accessibilityRole="header">
            Map layers
          </Text>
          <ScrollView style={styles.layersScroll} contentContainerStyle={styles.layersList}>
            <LayerRow
              title="Debris Tracker"
              badge="ON"
              attribution={SOURCE_META.debris_tracker.attribution}
            />
            <LayerToggle
              title="OpenLitterMap"
              enabled={layers.olm}
              disabled={busy}
              attribution={SOURCE_META.openlittermap.attribution}
              note={
                layers.olm && olmQuery.isError
                  ? "Couldn't load OpenLitterMap pins."
                  : layers.olm && olmPins.length === 0
                    ? 'No OpenLitterMap pins in this view.'
                    : undefined
              }
              onToggle={() => toggleLayer('olm')}
            />
            <LayerToggle
              title="EPA risk"
              enabled={layers.epa}
              disabled={busy}
              attribution={EPA_RISK_ATTRIBUTION}
              onToggle={() => toggleLayer('epa')}
            />
            <View style={styles.legend}>
              {MATERIAL_GROUPS.map((group) => (
                <View key={group} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: MATERIAL_COLORS[group] }]} />
                  <Text variant="caption" tone="muted">
                    {MATERIAL_LABELS[group]}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </Sheet>
      )}

      {selectedPin && (
        <PinSheet pin={selectedPin} bottom={barHeight + 8} onClose={() => setSelected(null)} />
      )}
    </Screen>
  );
}

function MapSetupState() {
  const styles = useStyles();

  return (
    <View style={styles.setup}>
      <Card style={styles.setupCard}>
        <Text variant="heading" accessibilityRole="header">
          Map setup needed
        </Text>
        <Text variant="body" tone="muted">
          Add {MAPBOX_TOKEN_ENV} to a local .env file (see .env.example), then rebuild the
          development client. The rest of PlastiCatch keeps working without it.
        </Text>
      </Card>
    </View>
  );
}

function MapSkeleton() {
  const styles = useStyles();

  return (
    <View style={styles.skeletonWrap} pointerEvents="none">
      <Card
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
      </Card>
    </View>
  );
}

function LayerRow({
  title,
  badge,
  attribution,
}: {
  title: string;
  badge: string;
  attribution: string;
}) {
  const styles = useStyles();

  return (
    <View
      style={styles.layerRow}
      accessible
      accessibilityLabel={`${title}. ${badge}. ${attribution}`}
    >
      <View style={styles.layerText}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" tone="muted">
          {attribution}
        </Text>
      </View>
      <Badge label={badge} tone="accent" />
    </View>
  );
}

function LayerToggle({
  title,
  enabled,
  disabled,
  attribution,
  note,
  onToggle,
}: {
  title: string;
  enabled: boolean;
  disabled: boolean;
  attribution: string;
  note?: string;
  onToggle: () => void;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`${title} layer`}
      accessibilityState={{ checked: enabled, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={({ pressed }) => [styles.layerRow, (pressed || disabled) && styles.dimmed]}
    >
      <View style={styles.layerText}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" tone="muted">
          {attribution}
        </Text>
        {note && (
          <Text variant="caption" tone="accent">
            {note}
          </Text>
        )}
      </View>
      <Badge label={enabled ? 'ON' : 'OFF'} tone={enabled ? 'accent' : 'neutral'} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  map: {
    flex: 1,
  },
  topRow: {
    position: 'absolute',
    top: t.space.sm,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
  },
  streakPill: {
    paddingHorizontal: t.space.md,
    paddingVertical: 6,
    borderRadius: t.radius.pill,
    borderColor: t.color.line,
    backgroundColor: t.color.surface,
  },
  statusWrap: {
    position: 'absolute',
    top: 64,
    left: 20,
    right: 20,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.space.md,
  },
  sparse: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    borderRadius: t.radius.md,
    borderColor: t.color.line,
    backgroundColor: t.color.surface,
  },
  sparseText: {
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
  },
  dataSources: {
    marginLeft: 'auto',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: t.space.sm,
    borderRadius: t.radius.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  dimmed: {
    opacity: 0.6,
  },
  layersScroll: {
    flexGrow: 0,
  },
  layersList: {
    gap: t.space.sm,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.xs,
  },
  layerText: {
    flex: 1,
    gap: 2,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.space.md,
    marginTop: t.space.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  setup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: t.color.surfaceSunken,
  },
  setupCard: {
    gap: t.space.sm,
  },
  skeletonWrap: {
    position: 'absolute',
    top: 64,
    left: 20,
    right: 20,
  },
  skeleton: {
    gap: t.space.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
  },
  skeletonDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: t.color.surfaceSunken,
  },
  skeletonBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: t.color.surfaceSunken,
  },
  skeletonBarShort: {
    flex: 0.6,
  },
}));
