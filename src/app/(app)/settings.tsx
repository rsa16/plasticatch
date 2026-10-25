import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';

import { CATCH_RISE, useBottomBarHeight } from '@/components/bottom-menu';
import { DateWheel } from '@/components/date-wheel';
import { MenuScreen } from '@/components/menu-screen';
import { Text } from '@/components/text';
import { ScrollPane } from '@/components/scroll-pane';
import { Brand, Spacing, TextStyles } from '@/constants/theme';
import { useOnboardingDraftStore } from '@/features/onboarding/draft';

// One row of arrows per avatar part, matching onboarding. What each row changes isn't defined yet.
const AVATAR_ROWS = [0, 1, 2];

// Figma placeholders, shown when the onboarding draft has no answer from this session.
const PLACEHOLDER_USERNAME = 'yourusername';

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function confirmDeleteAccount(onDelete: () => void) {
  Alert.alert('Delete account?', 'This permanently removes your catches and progress.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

export default function SettingsScreen() {
  const draft = useOnboardingDraftStore();
  const barHeight = useBottomBarHeight();
  const usernameInput = useRef<TextInputInstance>(null);
  // Settings edits its own copy. They are not written back to the draft, which records what
  // onboarding captured; saving profile changes belongs to the account backlog ticket.
  const [username, setUsername] = useState(() =>
    draft.username.length > 0 ? draft.username : PLACEHOLDER_USERNAME,
  );
  const [dateOfBirth, setDateOfBirth] = useState(() => draft.dateOfBirth ?? new Date(1971, 5, 14));
  const [editingDate, setEditingDate] = useState(false);

  // Leaving the account ends the session, so the next player starts onboarding with a clean draft.
  function signOut() {
    draft.reset();
    router.replace('/sign-in');
  }

  return (
    <MenuScreen title="SETTINGS">
      {/* The form scrolls underneath the raised Catch tab, so the list stops at the bar. */}
      <View style={[styles.settings, { marginBottom: barHeight }]}>
        <ScrollPane
          thumbHeight={104}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="Edit Avatar" gap={19}>
            <View style={styles.avatarPicker}>
              <ChevronColumn direction="previous" />
              <Image
                source={require('@/assets/images/avatar-placeholder.png')}
                style={styles.avatar}
                contentFit="cover"
                accessibilityLabel="Avatar preview"
              />
              <ChevronColumn direction="next" />
            </View>
          </Section>

          <Section title="Edit Username">
            <View style={styles.field}>
              <TextInput
                ref={usernameInput}
                value={username}
                onChangeText={setUsername}
                style={[TextStyles.fieldText, styles.fieldInput]}
                accessibilityLabel="Username"
                autoComplete="username"
                textContentType="username"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit username"
                hitSlop={Spacing.two}
                onPress={() => usernameInput.current?.focus()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Image
                  source={require('@/assets/images/settings-edit.png')}
                  style={styles.editIcon}
                  tintColor={Brand.accent}
                  contentFit="contain"
                />
              </Pressable>
            </View>
          </Section>

          <Section title="Edit Date of Birth">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Date of birth, ${formatDate(dateOfBirth)}`}
              accessibilityHint="Shows the date picker"
              accessibilityState={{ expanded: editingDate }}
              onPress={() => setEditingDate((open) => !open)}
              style={({ pressed }) => [styles.field, pressed && styles.pressed]}
            >
              <Text variant="fieldText">{formatDate(dateOfBirth)}</Text>
            </Pressable>
            {editingDate && <DateWheel value={dateOfBirth} onChange={setDateOfBirth} />}
          </Section>

          <Pressable
            accessibilityRole="button"
            onPress={signOut}
            style={({ pressed }) => [styles.button, styles.logOut, pressed && styles.pressed]}
          >
            <Text variant="buttonLabel">LOG OUT</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => confirmDeleteAccount(signOut)}
            style={({ pressed }) => [
              styles.button,
              styles.deleteAccount,
              pressed && styles.pressed,
            ]}
          >
            <Image
              source={require('@/assets/images/settings-warning.png')}
              style={styles.warningIcon}
              tintColor={Brand.surface}
              contentFit="contain"
            />
            <Text variant="buttonLabel">DELETE ACCOUNT</Text>
          </Pressable>
        </ScrollPane>
      </View>
    </MenuScreen>
  );
}

function Section({
  title,
  gap = 15,
  children,
}: {
  title: string;
  gap?: number;
  children: ReactNode;
}) {
  return (
    <View style={[styles.section, { gap }]}>
      <Text variant="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      <Image
        source={require('@/assets/images/onboarding-divider.svg')}
        style={styles.divider}
        contentFit="fill"
      />
      {children}
    </View>
  );
}

function ChevronColumn({ direction }: { direction: 'previous' | 'next' }) {
  const isPrevious = direction === 'previous';
  return (
    <View style={styles.chevronColumn}>
      {AVATAR_ROWS.map((row) => (
        <Pressable
          key={row}
          accessibilityRole="button"
          accessibilityLabel={`${isPrevious ? 'Previous' : 'Next'} avatar option, row ${row + 1}`}
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Image
            source={require('@/assets/images/settings-chevron.svg')}
            style={[styles.chevron, isPrevious && styles.mirrored]}
            contentFit="fill"
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  settings: {
    flex: 1,
    marginTop: 25,
    paddingLeft: 18,
    paddingRight: 10,
  },
  // The design lays the form out 358pt wide; only the 324pt fields reach under the thumb's column.
  content: {
    width: 358,
    alignItems: 'center',
    gap: 29,
    paddingBottom: CATCH_RISE + Spacing.three,
  },
  section: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  divider: {
    width: 324.002,
    height: 5,
    // Figma lays the 5px stroke out in a 1px slot; keep the surrounding spacing the same.
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  avatarPicker: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 38.93,
  },
  avatar: {
    width: 154,
    height: 154,
  },
  chevronColumn: {
    justifyContent: 'space-between',
    paddingVertical: 3.43,
  },
  chevron: {
    width: 18.8189,
    height: 33.1378,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
  field: {
    width: 324,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  fieldInput: {
    flex: 1,
    padding: 0,
  },
  // The pencil sits in a slightly taller slot than its 36pt glyph, which sets the field height.
  editIcon: {
    width: 36,
    height: 36,
    marginBottom: 5.74,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
  },
  logOut: {
    width: 185,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Brand.accent,
  },
  deleteAccount: {
    width: 258,
    height: 51,
    gap: 11,
    paddingLeft: 12,
    paddingRight: 15,
    backgroundColor: Brand.danger,
  },
  warningIcon: {
    width: 32,
    height: 32,
  },
  pressed: {
    opacity: 0.7,
  },
});
