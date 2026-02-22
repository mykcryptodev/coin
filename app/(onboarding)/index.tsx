import { StyleSheet } from 'react-native';

import { useCallback, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
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

const ONBOARDING_KEY = '@coin-expo/onboarding-completed';

export default function OnboardingScreen() {
  const activeIndex = useSharedValue(0);
  const [isLastStep, setIsLastStep] = useState(false);
  const router = useRouter();

  const rightLabel = isLastStep ? 'Finish' : 'Continue';

  const increaseActiveIndex = useCallback(async () => {
    if (activeIndex.get() === 2) {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      router.replace('/(tabs)');
    } else {
      activeIndex.set(activeIndex.get() + 1);
    }
  }, [activeIndex, router]);

  const decreaseActiveIndex = useCallback(() => {
    activeIndex.set(Math.max(0, activeIndex.get() - 1));
  }, [activeIndex]);

  useAnimatedReaction(
    () => activeIndex.get(),
    (index) => {
      scheduleOnRN(setIsLastStep, index === 2);
    },
  );

  return (
    <ThemedView style={styles.container}>
      <SlideContent activeIndex={activeIndex} />
      <Dots activeIndex={activeIndex} count={3} dotSize={10} />
      <StepButtons
        activeIndex={activeIndex}
        rightLabel={rightLabel}
        backButtonLabel="Back"
        onBack={decreaseActiveIndex}
        onContinue={increaseActiveIndex}
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
