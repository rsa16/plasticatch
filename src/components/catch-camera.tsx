import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useRef, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { verifyCatchPhoto } from '@/features/catch';
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
  /** Shown in the popup when a photo fails verification. */
  failureMessage: string;
  /** Called with the photo's URI once it passes verification. */
  onVerified: (photo: string) => void;
  /** Leaves the Catch flow. */
  onClose: () => void;
};

/** A full-screen camera for one catch step: instruction, XP, controls and the failure popup. */
export function CatchCamera({
  instruction,
  xp,
  failureMessage,
  onVerified,
  onClose,
}: CatchCameraProps) {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoomIndex, setZoomIndex] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [popup, setPopup] = useState<string | null>(null);

  const topBarHeight = insets.top + TOP_BAR_BELOW_INSET;
  const controlsHeight = insets.bottom + CONTROLS_ABOVE_INSET;
  const zoom = ZOOM_PRESETS[zoomIndex];

  const capture = async () => {
    if (!camera.current || capturing) return;
    setPopup(null);
    setCapturing(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      if (verifyCatchPhoto()) {
        onVerified(photo.uri);
      } else {
        setPopup(failureMessage);
      }
    } catch {
      setPopup('Couldn’t take a photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  };

  let preview: ReactNode;
  if (!permission) {
    // Still reading the permission; keep the screen dark rather than flashing a prompt.
    preview = null;
  } else if (!permission.granted) {
    preview = (
      <View
        style={[styles.permission, { paddingTop: topBarHeight, paddingBottom: controlsHeight }]}
      >
        <Text variant="buttonLabel" style={styles.centered}>
          PlastiCatch needs your camera to photograph the litter you catch.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
          style={({ pressed }) => [styles.permissionButton, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">
            {permission.canAskAgain ? 'ALLOW CAMERA' : 'OPEN SETTINGS'}
          </Text>
        </Pressable>
      </View>
    );
  } else {
    preview = (
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        zoom={zoom.zoom}
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

      {popup && (
        <View
          style={[styles.popupArea, { top: topBarHeight, bottom: controlsHeight }]}
          pointerEvents="box-none"
        >
          <Pressable
            accessibilityRole="alert"
            accessibilityHint="Dismisses the message"
            onPress={() => setPopup(null)}
            style={styles.popup}
          >
            <Text variant="buttonLabel" style={styles.popupText}>
              {popup}
            </Text>
          </Pressable>
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
          <CircleButton label="Close" onPress={onClose} style={styles.closeButton}>
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
            accessibilityState={{ disabled: capturing || !permission?.granted }}
            disabled={capturing || !permission?.granted}
            onPress={capture}
            style={({ pressed }) => [
              styles.shutter,
              (pressed || capturing) && styles.pressed,
              !permission?.granted && styles.disabled,
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
  popup: {
    width: 301,
    maxWidth: '90%',
    minHeight: 146,
    justifyContent: 'center',
    paddingLeft: 30,
    paddingRight: 27,
    paddingVertical: Spacing.four,
    borderRadius: 20,
    backgroundColor: Brand.scrim,
  },
  popupText: {
    maxWidth: 244,
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
