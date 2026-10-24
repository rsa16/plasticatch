import { router } from 'expo-router';
import { useState } from 'react';

import { DateWheel } from '@/components/date-wheel';
import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';
import { admit } from '@/features/onboarding/age';

export default function DateOfBirthScreen() {
  const [dateOfBirth, setDateOfBirth] = useState(() => new Date(2000, 0, 1));

  return (
    <OnboardingScreen
      step={1}
      // The age gate owns the admission decision; this screen only routes on its answer.
      onNext={() => router.push(admit(dateOfBirth, new Date()) ? '/profile' : '/blocked')}
    >
      <OnboardingHeading>Date of Birth</OnboardingHeading>
      <OnboardingPrompt>Scroll to select your birthday:</OnboardingPrompt>
      <DateWheel value={dateOfBirth} onChange={setDateOfBirth} />
    </OnboardingScreen>
  );
}
