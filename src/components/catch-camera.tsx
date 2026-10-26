import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
  type TargetCameraPosition,
} from 'react-native-vision-camera';

import { Text } from '@/components/text';
import { useCaptureLocation } from '@/features/capture/use-capture-location';
import { createCatchStep, createVisionCameraAdapter } from '@/features/catch';
import type { CatchCapture } from '@/features/catch/lifecycle';
import { MAX_GPS_ACCURACY_M } from '@/features/verification/constants';
import type { CaptureMetadata } from '@/features/verification/types';
import { HudTheme, makeStyles, useTheme } from '@/theme';

/** Height of the instruction bar below the status-bar inset. */
const TOP_BAR_BELOW_INSET = 96;
/** Height of the controls panel above the home-indicator inset. */
const CONTROLS_ABOVE_INSET = 188;

/** Zoom presets, as VisionCamera's zoom factor (1 = neutral). */
const ZOOM_PRESETS = [
  { label: '1x', zoom: 1 },
  { label: '2x', zoom: 2 },
] as const;

type CatchCameraProps = {
  /** The step's instruction, without a "STEP n" prefix. */
  instruction: string;
  /** XP earned so far in this catch. */
  xp: number;
  /** Shown in the popup when a photo fails verification without a reason. */
  failureMessage: string;
  /** Runs the privacy pipeline and returns the capture to keep. */
  prepare: (uri: string, fix: CaptureMetadata) => Promise<CatchCapture>;
  /** Called with the blurred capture once the pipeline has finished. */
  onCaptured: (capture: CatchCapture) => void;
  /** Leaves the Catch flow. */
  onClose: () => void;
  /** The Find capture, when this is the Dispose step. Enables the distance/elapsed hint. */
  find?: CatchCapture;
};

/**
 * The mutable bridge between React and the framework-free step. Keeping it in a stable object
 * lets the step be created once while the latest permission, capture and callbacks stay current.
 */
class CameraGateway {
  private permission: ReturnType<typeof useCameraPermission> | null;
  private preparePhoto: ((photo: string, fix: CaptureMetadata) => Promise<CatchCapture>) | null;
  private onCaptured: ((capture: CatchCapture) => void) | null;
  private capturePhoto: (() => Promise<string>) | null;
  private fix: CaptureMetadata | null = null;
  private prepared: CatchCapture | null = null;

  constructor(
    permission: ReturnType<typeof useCameraPermission>,
    preparePhoto: (photo: string, fix: CaptureMetadata) => Promise<CatchCapture>,
    onCaptured: (capture: CatchCapture) => void,
    capturePhoto: () => Promise<string>,
  ) {
    this.permission = permission;
    this.preparePhoto = preparePhoto;
    this.onCaptured = onCaptured;
    this.capturePhoto = capturePhoto;
  }

  update(
    permission: ReturnType<typeof useCameraPermission>,
    preparePhoto: (photo: string, fix: CaptureMetadata) => Promise<CatchCapture>,
    onCaptured: (capture: CatchCapture) => void,
    capturePhoto: () => Promise<string>,
  ) {
    this.permission = permission;
    this.preparePhoto = preparePhoto;
    this.onCaptured = onCaptured;
    this.capturePhoto = capturePhoto;
  }

  setFix = (fix: CaptureMetadata | null) => {
    this.fix = fix;
  };

  getPermission = () => {
    if (!this.permission) return null;
    return {
      granted: this.permission.hasPermission,
      canAskAgain: this.permission.canRequestPermission,
    };
  };

  requestPermission = async () => {
    await this.permission?.requestPermission();
  };

  takePhoto = async () => {
    if (!this.capturePhoto) throw new Error('Camera is not ready');
    return this.capturePhoto();
  };

  verify = async (photo: string) => {
    if (!this.preparePhoto || !this.fix) throw new Error('No live location fix');
    this.prepared = await this.preparePhoto(photo, this.fix);
    return true as const;
  };

  onVerified = () => {
    if (this.prepared) this.onCaptured?.(this.prepared);
  };

  cancel = () => {
    // VisionCamera has no "abort capture" call; unmounting the preview releases it. The step
    // drops the in-flight result, so a late photo can never verify, complete, or navigate.
  };
}

function distanceMeters(a: CaptureMetadata, b: CaptureMetadata): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const lat1 = a.lat * rad;
  const lat2 = b.lat * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A full-screen camera for one catch step: instruction, XP, controls and the failure popup. */
export function CatchCamera(props: CatchCameraProps) {
  return (
    <HudTheme>
      <StatusBar style="light" />
      <CatchCameraBody {...props} />
    </HudTheme>
  );
}

function CatchCameraBody({
  instruction,
  xp,
  failureMessage,
  prepare,
  onCaptured,
  onClose,
  find,
}: CatchCameraProps) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const permission = useCameraPermission();
  const [facing, setFacing] = useState<TargetCameraPosition>('back');
  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput();
  const camera = useRef<CameraRef>(null);
  const [flash, setFlash] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);

  const location = useCaptureLocation();

  const capturePhoto = useCallback(async () => {
    const photo = await photoOutput.capturePhotoToFile({ flashMode: flash ? 'on' : 'off' }, {});
    return `file://${photo.filePath}`;
  }, [flash, photoOutput]);

  const [gateway] = useState(
    () => new CameraGateway(permission, prepare, onCaptured, capturePhoto),
  );

  useEffect(() => {
    gateway.update(permission, prepare, onCaptured, capturePhoto);
  }, [capturePhoto, gateway, onCaptured, permission, prepare]);

  useEffect(() => {
    gateway.setFix(location.fix);
  }, [gateway, location.fix]);

  const adapter = useMemo(
    () =>
      createVisionCameraAdapter({
        getPermission: gateway.getPermission,
        requestPermission: gateway.requestPermission,
        capturePhoto: () => gateway.takePhoto(),
        cancel: gateway.cancel,
      }),
    [gateway],
  );

  const [step] = useState(() =>
    createCatchStep({
      adapter,
      verify: gateway.verify,
      failureMessage,
      onCaptured: gateway.onVerified,
    }),
  );
  const state = useSyncExternalStore(step.subscribe, step.getState, step.getState);

  // Pick up the permission once the hook finishes reading it, or after the player visits Settings.
  useEffect(() => {
    step.refreshPermission();
  }, [step, permission.hasPermission, permission.canRequestPermission]);

  // Leaving the step abandons an in-flight capture: no verified callback, no completion path.
  useEffect(() => () => step.cancel(), [step]);

  // A back gesture from the next screen returns to this still-mounted step, so reopen the shutter
  // to retake the photo.
  useFocusEffect(
    useCallback(() => {
      step.retake();
    }, [step]),
  );

  const topBarHeight = insets.top + TOP_BAR_BELOW_INSET;
  const controlsHeight = insets.bottom + CONTROLS_ABOVE_INSET;
  const zoom = ZOOM_PRESETS[zoomIndex];
  const ready = state.status === 'ready' && location.ready;
  const capturing = state.status === 'capturing' || state.status === 'verifying';
  const stepNumber = find ? 2 : 1;

  const hint = useMemo(() => {
    if (!find || !location.fix) return null;
    const metres = Math.round(distanceMeters(find, location.fix));
    const seconds = Math.max(
      0,
      Math.round((Date.parse(location.fix.at) - Date.parse(find.at)) / 1000),
    );
    return `${metres} m · ${seconds}s`;
  }, [find, location.fix]);

  let preview: ReactNode;
  if (!permission.hasPermission) {
    preview = (
      <View
        style={[styles.permission, { paddingTop: topBarHeight, paddingBottom: controlsHeight }]}
      >
        <Text variant="heading" style={styles.centered}>
          PlastiCatch needs your camera to photograph the litter you catch.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (permission.canRequestPermission) {
              void step.requestPermission();
            } else {
              void Linking.openSettings();
            }
          }}
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
        >
          <Text variant="label" tone="onAccent">
            {permission.canRequestPermission ? 'Allow camera' : 'Open settings'}
          </Text>
        </Pressable>
      </View>
    );
  } else {
    preview = (
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device ?? facing}
        outputs={[photoOutput]}
        isActive
        zoom={zoom.zoom}
        torchMode={flash ? 'on' : 'off'}
        onStarted={step.cameraReady}
        onError={() => step.refreshPermission()}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {preview}

      <View style={styles.top} pointerEvents="box-none">
        <View
          style={[
            styles.instructionBar,
            { minHeight: topBarHeight, paddingTop: Math.max(insets.top - 22, theme.space.lg) },
          ]}
        >
          <Text variant="caption" tone="inverse" style={styles.stepChip}>
            Step {stepNumber} of 2
          </Text>
          <Text variant="heading" style={styles.instruction} accessibilityRole="header">
            {instruction}
          </Text>
        </View>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Text variant="label" tone="gold" accessibilityLabel={`${xp} XP earned`}>
              {xp} XP
            </Text>
          </View>
          <View style={styles.pill}>
            <Text variant="caption">
              {location.ready
                ? 'GPS ready'
                : location.state === 'unavailable'
                  ? 'No GPS'
                  : 'Locating…'}
            </Text>
          </View>
          {hint && (
            <View style={styles.pill}>
              <Text variant="caption">{hint}</Text>
            </View>
          )}
        </View>
        {!location.ready && location.state !== 'unavailable' && (
          <Text variant="caption" tone="muted" style={styles.gpsHint}>
            Waiting for a GPS fix within {MAX_GPS_ACCURACY_M} m.
          </Text>
        )}
      </View>

      <View style={styles.reticle} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />
      </View>

      {state.status === 'verifying' && (
        <View
          style={[styles.popupArea, { top: topBarHeight, bottom: controlsHeight }]}
          pointerEvents="none"
        >
          <View style={styles.popup} accessibilityLiveRegion="polite">
            <Text variant="label">Checking your photo…</Text>
          </View>
        </View>
      )}

      {state.failure && (
        <View
          style={[styles.popupArea, { top: topBarHeight, bottom: controlsHeight }]}
          pointerEvents="box-none"
        >
          <View style={styles.popupFrame}>
            <Pressable
              accessibilityRole="alert"
              accessibilityHint="Dismisses the message"
              onPress={step.dismissFailure}
              style={styles.popup}
            >
              <Text variant="label" style={styles.popupText}>
                {state.failure}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close message"
              onPress={step.dismissFailure}
              hitSlop={14}
              style={({ pressed }) => [styles.popupClose, pressed && styles.pressed]}
            >
              <SymbolView
                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                tintColor={theme.color.ink}
                size={18}
                weight="semibold"
              />
            </Pressable>
          </View>
        </View>
      )}

      <View
        style={[styles.controls, { height: controlsHeight, paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.row}>
          <CircleButton
            label={`Zoom ${zoom.label}`}
            onPress={() => setZoomIndex((i) => (i + 1) % ZOOM_PRESETS.length)}
          >
            <Text variant="label" tone="inverse">
              {zoom.label}
            </Text>
          </CircleButton>
          <CircleButton
            label={flash ? 'Flash on' : 'Flash off'}
            onPress={() => setFlash((f) => !f)}
          >
            <SymbolView
              name={
                flash
                  ? { ios: 'bolt.fill', android: 'flash_on', web: 'flash_on' }
                  : { ios: 'bolt.slash.fill', android: 'flash_off', web: 'flash_off' }
              }
              tintColor={theme.color.onBrand}
              size={22}
            />
          </CircleButton>
        </View>

        <View style={[styles.row, styles.shutterRow]}>
          <CircleButton
            label="Close"
            onPress={() => {
              step.cancel();
              onClose();
            }}
            style={styles.closeButton}
          >
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={theme.color.onBrand}
              size={22}
              weight="semibold"
            />
          </CircleButton>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            accessibilityState={{ disabled: !ready }}
            disabled={!ready}
            onPress={() => {
              void step.capture();
            }}
            style={({ pressed }) => [
              styles.shutter,
              (pressed || capturing) && styles.pressed,
              !ready && styles.disabled,
            ]}
          >
            <View style={styles.shutterRing}>
              <View style={styles.shutterCore} />
            </View>
          </Pressable>
          <CircleButton
            label="Switch camera"
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={styles.flipButton}
          >
            <SymbolView
              name={{
                ios: 'arrow.trianglehead.2.clockwise.rotate.90',
                android: 'cameraswitch',
                web: 'cameraswitch',
              }}
              tintColor={theme.color.onBrand}
              size={22}
            />
          </CircleButton>
        </View>
      </View>
    </View>
  );
}

function CircleButton({
  label,
  onPress,
  style,
  children,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.circle, style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    backgroundColor: '#050B07',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  instructionBar: {
    justifyContent: 'flex-end',
    gap: t.space.sm,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: t.space.lg,
    backgroundColor: t.color.scrim,
  },
  stepChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: t.space.sm,
    paddingVertical: 2,
    borderRadius: t.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    letterSpacing: 0.6,
  },
  instruction: {
    maxWidth: 320,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
    marginTop: t.space.sm,
    paddingHorizontal: 20,
  },
  pill: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: t.space.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.hudSurface,
  },
  gpsHint: {
    marginTop: t.space.xs,
    paddingHorizontal: 20,
  },
  reticle: {
    position: 'absolute',
    top: '34%',
    left: '18%',
    right: '18%',
    aspectRatio: 1,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 4,
  },
  popupArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupFrame: {
    width: 320,
    maxWidth: '88%',
  },
  popup: {
    width: '100%',
    minHeight: 120,
    justifyContent: 'center',
    paddingHorizontal: t.space.xl,
    paddingVertical: t.space.xl,
    borderRadius: t.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: t.color.hudSurface,
  },
  popupText: {
    maxWidth: 250,
  },
  popupClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: t.space.md,
    paddingHorizontal: 20,
    backgroundColor: t.color.scrim,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shutterRow: {
    marginTop: t.space.sm,
    alignItems: 'center',
  },
  closeButton: {
    marginTop: 18,
  },
  flipButton: {
    marginTop: 12,
  },
  circle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  shutter: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRing: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    borderWidth: 4,
    borderColor: t.color.onBrand,
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.onBrand,
  },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: t.space.xl,
    backgroundColor: t.color.bg,
  },
  centered: {
    textAlign: 'center',
  },
  permissionButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: t.space.xl,
    borderRadius: t.radius.md,
    backgroundColor: t.color.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));
