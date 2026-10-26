import { useCameraPermissions } from 'expo-camera';
import { useForegroundPermissions } from 'expo-location';
import { router } from 'expo-router';
import type { PermissionResponse } from 'expo';
import { useEffect } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { goBackOr } from '@/features/onboarding/back';
import { useReadOnlyStore } from '@/stores/read-only';
import { useTheme } from '@/theme';

export default function PermissionsScreen() {
  const theme = useTheme();
  const [camera, requestCamera, getCamera] = useCameraPermissions();
  const [location, requestLocation, getLocation] = useForegroundPermissions();
  const refreshReadOnly = useReadOnlyStore((state) => state.refresh);

  // Show the system prompts one after the other as soon as the step opens. The OS only
  // displays each prompt once; after that these calls just return the saved answer.
  useEffect(() => {
    (async () => {
      await requestCamera();
      await requestLocation();
      // The app shell reads the same store, so the explainer's answers are already there when
      // the player continues into the tabs.
      await refreshReadOnly();
    })();
  }, [requestCamera, requestLocation, refreshReadOnly]);

  // Pick up changes made in the Settings app when the user switches back to us.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        getCamera();
        getLocation();
        void refreshReadOnly();
      }
    });
    return () => subscription.remove();
  }, [getCamera, getLocation, refreshReadOnly]);

  // Users can continue without these; features that need them should check again before use.
  return (
    <OnboardingScreen
      step={5}
      onBack={() => goBackOr('/home-state')}
      onNext={() => router.push('/terms')}
    >
      <OnboardingHeading>Permissions</OnboardingHeading>
      <OnboardingPrompt>
        PlastiCatch needs your camera and location to verify a catch. Use the system prompts to
        allow them.
      </OnboardingPrompt>

      <View style={styles.list}>
        <PermissionRow label="Camera" permission={camera} onRequest={requestCamera} />
        <PermissionRow label="Location" permission={location} onRequest={requestLocation} />
      </View>

      <Card sunken>
        <Text variant="caption" tone="muted">
          You can continue without these. Catch and the map will explain what is missing, and you
          can allow them later from the device settings.
        </Text>
      </Card>
      <View style={{ height: theme.space.sm }} />
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
        : { label: 'Open settings', onPress: () => Linking.openSettings() };

  return (
    <Card style={styles.row}>
      <View style={styles.rowText}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" tone={permission?.granted ? 'accent' : 'muted'}>
          {status}
        </Text>
      </View>
      {action && (
        <Button
          label={action.label}
          variant="secondary"
          onPress={action.onPress}
          accessibilityLabel={`${action.label}: ${label}`}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
