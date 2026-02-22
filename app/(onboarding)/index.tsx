import { StyleSheet } from 'react-native';

import { useCallback, useRef, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCurrentUser } from '@coinbase/cdp-hooks';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import {
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Dots } from '@/components/onboarding/dots';
import { SlideContent } from '@/components/onboarding/slide-content';
import { StepButtons } from '@/components/onboarding/step-buttons';
import { ThemedView } from '@/components/themed-view';
import { api } from '@/convex/_generated/api';

const ONBOARDING_KEY = '@coin-expo/onboarding-completed';

export default function OnboardingScreen() {
  const activeIndex = useSharedValue(0);
  const [isLastStep, setIsLastStep] = useState(false);
  const availableUsernameRef = useRef<string | null>(null);
  const [hasAvailableUsername, setHasAvailableUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const setUsername = useMutation(api.users.setUsername);

  const walletAddress =
    currentUser?.evmSmartAccounts?.[0] ??
    currentUser?.evmAccounts?.[0] ??
    null;

  const rightLabel = isLastStep ? 'Finish' : 'Continue';

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  }, [router]);

  const increaseActiveIndex = useCallback(async () => {
    if (activeIndex.get() === 2) {
      const username = availableUsernameRef.current;
      if (!username || !walletAddress || !currentUser?.userId) return;
      setSavingUsername(true);
      await setUsername({ username, walletAddress, cdpUserId: currentUser.userId });
      await finishOnboarding();
    } else {
      activeIndex.set(activeIndex.get() + 1);
    }
  }, [activeIndex, finishOnboarding, setUsername, walletAddress, currentUser?.userId]);

  const decreaseActiveIndex = useCallback(() => {
    activeIndex.set(Math.max(0, activeIndex.get() - 1));
  }, [activeIndex]);

  useAnimatedReaction(
    () => activeIndex.get(),
    (index) => {
      scheduleOnRN(setIsLastStep, index === 2);
    },
  );

  const handleAvailableUsernameChange = useCallback((username: string | null) => {
    availableUsernameRef.current = username;
    setHasAvailableUsername(username !== null);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SlideContent
        activeIndex={activeIndex}
        onAvailableUsernameChange={handleAvailableUsernameChange}
        saving={savingUsername}
      />
      <Dots activeIndex={activeIndex} count={3} dotSize={10} />
      <StepButtons
        activeIndex={activeIndex}
        rightLabel={rightLabel}
        backButtonLabel="Back"
        onBack={decreaseActiveIndex}
        onContinue={increaseActiveIndex}
        disabled={isLastStep && !hasAvailableUsername}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 64,
  },
});
