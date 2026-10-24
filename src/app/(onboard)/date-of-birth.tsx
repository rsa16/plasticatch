import { router } from 'expo-router';
import { useState } from 'react';

import { DateWheel } from '@/components/date-wheel';
import { OnboardingHeading, OnboardingPrompt, OnboardingScreen } from '@/components/onboarding';

export default function DateOfBirthScreen() {
  const [dateOfBirth, setDateOfBirth] = useState(() => new Date(2000, 0, 1));

  return (
    <OnboardingScreen step={1} onNext={() => router.push('/profile')}>
      <OnboardingHeading>Date of Birth</OnboardingHeading>
      <OnboardingPrompt>Scroll to select your birthday:</OnboardingPrompt>
      <DateWheel value={dateOfBirth} onChange={setDateOfBirth} />
    </OnboardingScreen>
  );
}
