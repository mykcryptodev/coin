import { useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, Stack } from 'expo-router';
import { useIsSignedIn } from '@coinbase/cdp-hooks';

const ONBOARDING_KEY = '@coin-expo/onboarding-completed';

export default function OnboardingLayout() {
  const { isSignedIn } = useIsSignedIn();
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setHasCompleted(value === 'true');
    });
  }, []);

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  if (hasCompleted === null) {
    return null;
  }

  if (hasCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
