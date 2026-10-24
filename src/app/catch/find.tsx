import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MenuScreen } from '@/components/menu-screen';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';

/** Dismiss the Catch flow and return to the app shell's default screen. */
function backToMap() {
  router.dismissTo('/map');
}

/** Placeholder for the Find half of a catch, until the capture flow is built. */
export default function FindScreen() {
  return (
    <MenuScreen title="FIND">
      <View style={styles.content}>
        <Text variant="fieldText" style={styles.prompt}>
          Photograph the litter you found to start a catch.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={backToMap}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">BACK TO MAP</Text>
        </Pressable>
      </View>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  prompt: {
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
