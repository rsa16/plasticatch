import { router } from 'expo-router';
import { useState } from 'react';

import { DateWheel } from '@/components/date-wheel';
import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { useSessionStore } from '@/features/auth';
import { admit } from '@/features/onboarding/age';
import { useOnboardingDraftStore } from '@/features/onboarding/draft';

export default function DateOfBirthScreen() {
  const draft = useOnboardingDraftStore();
  const status = useSessionStore((state) => state.status);
  // Returning from the next step restores the answer the player already gave.
  const [dateOfBirth, setDateOfBirth] = useState(() => draft.dateOfBirth ?? new Date(2000, 0, 1));

  return (
    <OnboardingScreen
      step={1}
      // The age gate owns the admission decision; this screen only routes on its answer.
      onNext={() => {
        // Save before navigating so the answer survives Back and reaches Settings.
        draft.setDateOfBirth(dateOfBirth);

        if (!admit(dateOfBirth, new Date())) {
          router.push('/blocked');
          return;
        }

        // The age gate admits first, then an account is created: a signed-in player returning
        // to onboarding skips straight to their profile.
        router.push(status === 'signed-in' ? '/profile' : '/sign-in');
      }}
    >
      <OnboardingHeading>Date of Birth</OnboardingHeading>
      <OnboardingPrompt>Select your birthday:</OnboardingPrompt>
      <DateWheel value={dateOfBirth} onChange={setDateOfBirth} />
    </OnboardingScreen>
  );
}
