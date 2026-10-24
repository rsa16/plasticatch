import { useCameraPermissions } from 'expo-camera';
import { useForegroundPermissions } from 'expo-location';
import { router } from 'expo-router';
import type { PermissionResponse } from 'expo';
import { useEffect } from 'react';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';

export default function PermissionsScreen() {
  const [camera, requestCamera, getCamera] = useCameraPermissions();
  const [location, requestLocation, getLocation] = useForegroundPermissions();

  // Show the system prompts one after the other as soon as the step opens. The OS only
  // displays each prompt once; after that these calls just return the saved answer.
  useEffect(() => {
    (async () => {
      await requestCamera();
      await requestLocation();
    })();
  }, [requestCamera, requestLocation]);

  // Pick up changes made in the Settings app when the user switches back to us.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getCamera();
        getLocation();
      }
    });
    return () => subscription.remove();
  }, [getCamera, getLocation]);

  // Users can continue without these; features that need them should check again before use.
  return (
    <OnboardingScreen step={3} onBack={() => router.back()} onNext={() => router.push('/terms')}>
      <OnboardingHeading>Permissions</OnboardingHeading>
      <OnboardingPrompt>
        Please use the popups below to allow PlastiCatch to use your Camera and your Location.
      </OnboardingPrompt>

      <View style={styles.list}>
        <PermissionRow label="Camera" permission={camera} onRequest={requestCamera} />
        <PermissionRow label="Location" permission={location} onRequest={requestLocation} />
      </View>
    </OnboardingScreen>
  );
}

type PermissionRowProps = {
  label: string;
  permission: PermissionResponse | null;
  onRequest: () => Promise<PermissionResponse>;
};

function PermissionRow({ label, permission, onRequest }: PermissionRowProps) {
  const status = !permission
    ? 'Checking…'
    : permission.granted
      ? 'Allowed'
      : permission.status === 'undetermined'
        ? 'Not set'
        : 'Not allowed';

  // When the OS won't show the prompt again, the only way to change it is the Settings app.
  // Settings can't be opened from the web, so the browser just gets "Allow" again.
  const action =
    !permission || permission.granted
      ? null
      : permission.canAskAgain || Platform.OS === 'web'
        ? { label: 'Allow', onPress: onRequest }
        : { label: 'Open Settings', onPress: () => Linking.openSettings() };

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="wheelItem">{label}</Text>
        <Text
          variant="caption"
          color={permission?.granted ? 'accent' : undefined}
          style={[styles.rowStatus, permission?.granted && styles.rowStatusGranted]}
        >
          {status}
        </Text>
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action.label}: ${label}`}
          onPress={action.onPress}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  rowText: {
    flex: 1,
  },
  rowStatus: {
    opacity: 0.6,
  },
  rowStatusGranted: {
    opacity: 1,
  },
  action: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
