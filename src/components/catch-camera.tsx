import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { createCatchStep, createExpoCameraAdapter, type CatchCheck } from '@/features/catch';
import { Brand, Spacing } from '@/constants/theme';

/** Height of the instruction bar below the status-bar inset. */
const TOP_BAR_BELOW_INSET = 87;
/** Height of the controls panel above the home-indicator inset. */
const CONTROLS_ABOVE_INSET = 186;

/**
 * The zoom presets the 1x button cycles through. `CameraView` zoom is a fraction of the device's
 * maximum, so 2x is an approximation that varies by phone.
 */
const ZOOM_PRESETS = [
  { label: '1x', zoom: 0 },
  { label: '2x', zoom: 0.1 },
] as const;

type CatchCameraProps = {
  /** The step's instruction, shown in the bar across the top. */
  instruction: string;
  /** XP earned so far in this catch. */
  xp: number;
  /** Shown in the popup when a photo fails verification without a reason. */
  failureMessage: string;
  /** Judges a captured photo's URI. Throwing means it couldn't be checked. */
  verify: (photo: string) => Promise<CatchCheck>;
  /** Called with the photo's URI once it passes verification. */
  onVerified: (photo: string) => void;
  /** Leaves the Catch flow. */
  onClose: () => void;
};

/**
 * The mutable bridge between React and the framework-free step: latest permission, permission
 * prompt, verifier, verified callback, and the one mounted camera preview. Keeping it in a stable object lets
 * the step be created once while the values it reads stay current across renders.
 */
class CameraGateway {
  private permission: ReturnType<typeof useCameraPermissions>[0];
  private promptPermission: ReturnType<typeof useCameraPermissions>[1];
  private verifyPhoto: (photo: string) => Promise<CatchCheck>;
  private onVerified: (photo: string) => void;
  private camera: CameraView | null = null;

  constructor(
    permission: ReturnType<typeof useCameraPermissions>[0],
    requestPermission: ReturnType<typeof useCameraPermissions>[1],
    verify: (photo: string) => Promise<CatchCheck>,
    onVerified: (photo: string) => void,
  ) {
    this.permission = permission;
    this.promptPermission = requestPermission;
    this.verifyPhoto = verify;
    this.onVerified = onVerified;
  }

  update(
    permission: ReturnType<typeof useCameraPermissions>[0],
    requestPermission: ReturnType<typeof useCameraPermissions>[1],
    verify: (photo: string) => Promise<CatchCheck>,
    onVerified: (photo: string) => void,
  ) {
    this.permission = permission;
    this.promptPermission = requestPermission;
    this.verifyPhoto = verify;
    this.onVerified = onVerified;
  }

  setCamera = (camera: CameraView | null) => {
    this.camera = camera;
  };

  getCamera = () => this.camera;

  getPermission = () => {
    if (!this.permission) return null;
    return { granted: this.permission.granted, canAskAgain: this.permission.canAskAgain };
  };

  requestPermission = async () => {
    await this.promptPermission();
  };

  verify = (photo: string) => this.verifyPhoto(photo);

  onCaptured = (photo: string) => {
    this.onVerified(photo);
  };
}

/** A full-screen camera for one catch step: instruction, XP, controls and the failure popup. */
export function CatchCamera({
  instruction,
  xp,
  failureMessage,
  verify,
  onVerified,
  onClose,
}: CatchCameraProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoomIndex, setZoomIndex] = useState(0);

  // The step is created once per mounted step, so one mount owns one capture lifecycle. The
  // gateway carries the latest permission and verified callback without rebuilding the controller.
  const [gateway] = useState(
    () => new CameraGateway(permission, requestPermission, verify, onVerified),
  );

  useEffect(() => {
    gateway.update(permission, requestPermission, verify, onVerified);
  }, [gateway, permission, requestPermission, verify, onVerified]);

  const setCamera = useCallback(
    (camera: CameraView | null) => gateway.setCamera(camera),
    [gateway],
  );

  const adapter = useMemo(
    () =>
      createExpoCameraAdapter({
        getCamera: gateway.getCamera,
        getPermission: gateway.getPermission,
        requestPermission: gateway.requestPermission,
      }),
    [gateway],
  );

  const [step] = useState(() =>
    createCatchStep({
      adapter,
      verify: gateway.verify,
      failureMessage,
      onCaptured: gateway.onCaptured,
    }),
  );
  const state = useSyncExternalStore(step.subscribe, step.getState, step.getState);

  // Pick up the permission once the hook finishes reading it, or after the player visits Settings.
  useEffect(() => {
    step.refreshPermission();
  }, [step, permission?.granted, permission?.canAskAgain]);

  // Leaving the step abandons an in-flight capture: no verified callback, no completion path.
  useEffect(() => () => step.cancel(), [step]);

  // A back gesture from the next screen returns to this still-mounted step, so reopen the shutter
  // to retake the photo. Initial focus is a no-op because the step is not captured yet.
  useFocusEffect(
    useCallback(() => {
      step.retake();
    }, [step]),
  );

  const topBarHeight = insets.top + TOP_BAR_BELOW_INSET;
  const controlsHeight = insets.bottom + CONTROLS_ABOVE_INSET;
  const zoom = ZOOM_PRESETS[zoomIndex];
  const ready = state.status === 'ready';
  const capturing = state.status === 'capturing' || state.status === 'verifying';

  let preview: ReactNode;
  if (!state.permission) {
    // Still reading the permission; keep the screen dark rather than flashing a prompt.
    preview = null;
  } else if (!state.permission.granted) {
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
            if (state.permission?.canAskAgain) {
              void step.requestPermission();
            } else {
              void Linking.openSettings();
            }
          }}
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">
            {state.permission.canAskAgain ? 'ALLOW CAMERA' : 'OPEN SETTINGS'}
          </Text>
        </Pressable>
      </View>
    );
  } else {
    preview = (
      <CameraView
        ref={setCamera}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        zoom={zoom.zoom}
        onCameraReady={step.cameraReady}
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
        <View style={styles.xpPill}>
          <Text variant="buttonLabel" accessibilityLabel={`${xp} XP earned`}>
            XP: {xp}
          </Text>
        </View>
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
            {/* Sibling of the alert, not a child: iOS VoiceOver treats an accessible parent as
                one element, so a nested button would never be reachable. */}
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
            label={flash === 'on' ? 'Flash on' : 'Flash off'}
            onPress={() => setFlash((f) => (f === 'on' ? 'off' : 'on'))}
          >
            <SymbolView
              name={
                flash === 'on'
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
  xpPill: {
    alignSelf: 'flex-start',
    minWidth: 110,
    height: 50,
    marginTop: 7,
    marginLeft: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: Brand.scrim,
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
    // Room for the close button in the top-right corner.
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
  // The shutter row starts 10pt below the zoom/flash row; Close and Switch sit a little lower.
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
  },
  permissionButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  centered: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
