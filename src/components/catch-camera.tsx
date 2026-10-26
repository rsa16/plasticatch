import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
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
import { Brand, Spacing } from '@/constants/theme';
import type { CatchCapture } from '@/features/catch/lifecycle';
import { createCatchStep, createVisionCameraAdapter } from '@/features/catch';
import { useCaptureLocation } from '@/features/capture/use-capture-location';
import { MAX_GPS_ACCURACY_M } from '@/features/verification/constants';
import type { CaptureMetadata } from '@/features/verification/types';

/** Height of the instruction bar below the status-bar inset. */
const TOP_BAR_BELOW_INSET = 87;
/** Height of the controls panel above the home-indicator inset. */
const CONTROLS_ABOVE_INSET = 186;

/** Zoom presets, as VisionCamera's zoom factor (1 = neutral). */
const ZOOM_PRESETS = [
  { label: '1x', zoom: 1 },
  { label: '2x', zoom: 2 },
] as const;

type CatchCameraProps = {
  /** The step's instruction, shown in the bar across the top. */
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
export function CatchCamera({
  instruction,
  xp,
  failureMessage,
  prepare,
  onCaptured,
  onClose,
  find,
}: CatchCameraProps) {
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
        <Text variant="buttonLabel" style={styles.centered}>
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
          <Text variant="buttonLabel">
            {permission.canRequestPermission ? 'ALLOW CAMERA' : 'OPEN SETTINGS'}
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
            { minHeight: topBarHeight, paddingTop: Math.max(insets.top - 22, Spacing.three) },
          ]}
        >
          <Text variant="buttonLabel" style={styles.instruction} accessibilityRole="header">
            {instruction}
          </Text>
        </View>
        <View style={styles.pills}>
          <View style={styles.xpPill}>
            <Text variant="buttonLabel" accessibilityLabel={`${xp} XP earned`}>
              XP: {xp}
            </Text>
          </View>
          <View style={styles.gpsPill}>
            <Text variant="compactButtonLabel">
              {location.ready
                ? 'GPS ready'
                : location.state === 'unavailable'
                  ? 'No GPS'
                  : 'Locating…'}
            </Text>
          </View>
          {hint && (
            <View style={styles.gpsPill}>
              <Text variant="compactButtonLabel">{hint}</Text>
            </View>
          )}
        </View>
        {!location.ready && location.state !== 'unavailable' && (
          <Text variant="compactButtonLabel" style={styles.gpsHint}>
            Waiting for a GPS fix within {MAX_GPS_ACCURACY_M} m.
          </Text>
        )}
      </View>

      {state.status === 'verifying' && (
        <View
          style={[styles.popupArea, { top: topBarHeight, bottom: controlsHeight }]}
          pointerEvents="none"
        >
          <View style={styles.popup} accessibilityLiveRegion="polite">
            <Text variant="buttonLabel" style={styles.popupText}>
              Checking your photo…
            </Text>
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
              <Text variant="buttonLabel" style={styles.popupText}>
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
              <Image
                source={require('@/assets/images/catch-close.png')}
                style={styles.popupCloseIcon}
                tintColor={Brand.surface}
                contentFit="contain"
              />
            </Pressable>
          </View>
        </View>
      )}

      <View
        style={[styles.controls, { height: controlsHeight, paddingBottom: insets.bottom + 35 }]}
      >
        <View style={styles.row}>
          <CircleButton
            label={`Zoom ${zoom.label}`}
            onPress={() => setZoomIndex((i) => (i + 1) % ZOOM_PRESETS.length)}
          >
            <Text variant="wheelItem" color="surface">
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
              tintColor={Brand.surface}
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
            <Image
              source={require('@/assets/images/catch-close.png')}
              style={styles.closeIcon}
              tintColor={Brand.surface}
              contentFit="contain"
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
            <Image
              source={require('@/assets/images/catch-shutter.svg')}
              style={styles.shutter}
              contentFit="fill"
            />
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
              tintColor={Brand.surface}
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.circle, style, pressed && styles.pressed]}
    >
      <Image
        source={require('@/assets/images/catch-button.svg')}
        style={StyleSheet.absoluteFill}
        contentFit="fill"
      />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.icon,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  instructionBar: {
    justifyContent: 'center',
    paddingLeft: 38,
    paddingRight: 37,
    paddingBottom: 20,
    backgroundColor: Brand.scrim,
  },
  instruction: {
    maxWidth: 318,
  },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 7,
    marginLeft: 14,
  },
  xpPill: {
    minWidth: 110,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: Brand.scrim,
  },
  gpsPill: {
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Brand.scrim,
  },
  gpsHint: {
    marginTop: 7,
    marginLeft: 14,
    color: Brand.surface,
  },
  popupArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupFrame: {
    width: 301,
    maxWidth: '90%',
  },
  popup: {
    width: '100%',
    minHeight: 146,
    justifyContent: 'center',
    paddingLeft: 30,
    paddingRight: 44,
    paddingVertical: Spacing.four,
    borderRadius: 20,
    backgroundColor: Brand.scrim,
  },
  popupText: {
    maxWidth: 244,
  },
  popupClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCloseIcon: {
    width: 16,
    height: 16,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 21,
    paddingLeft: 21,
    paddingRight: 20,
    backgroundColor: Brand.scrim,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shutterRow: {
    marginTop: 10,
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
  },
  closeIcon: {
    width: 22,
    height: 22,
  },
  shutter: {
    width: 72,
    height: 72,
  },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 38,
    gap: Spacing.four,
    backgroundColor: Brand.icon,
  },
  centered: {
    textAlign: 'center',
  },
  permissionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
