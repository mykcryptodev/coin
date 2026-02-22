import { StyleSheet, View } from 'react-native';

import { useCallback, useState } from 'react';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { SharedValue } from 'react-native-reanimated';

type SlideData = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
};

const slides: SlideData[] = [
  {
    icon: 'account-balance-wallet',
    title: 'Welcome to Coin Expo',
    subtitle:
      'The simplest way to send and receive USDC. No complicated crypto jargon, no gas fees to worry about.',
  },
  {
    icon: 'send',
    title: 'Pay Anyone, Instantly',
    subtitle:
      "Send USDC to any email address or scan a QR code. It's as easy as sending a text message.",
  },
  {
    icon: 'shield',
    title: 'Your Wallet, Your Rules',
    subtitle:
      'Your smart wallet is created automatically. Secured by Coinbase, controlled by you.',
  },
];

type SlideContentProps = {
  activeIndex: SharedValue<number>;
};

export const SlideContent: React.FC<SlideContentProps> = ({ activeIndex }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const tintColor = Colors[colorScheme].tint;
  const [currentSlide, setCurrentSlide] = useState(0);

  const updateSlide = useCallback(
    (index: number) => {
      setCurrentSlide(index);
    },
    [],
  );

  useAnimatedReaction(
    () => activeIndex.get(),
    (index) => {
      scheduleOnRN(updateSlide, index);
    },
  );

  const rFadeStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 300 }),
    };
  });

  const slide = slides[currentSlide]!;

  return (
    <Animated.View style={[styles.container, rFadeStyle]}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={slide.icon} size={64} color={tintColor} />
      </View>
      <ThemedText type="title" style={styles.title}>
        {slide.title}
      </ThemedText>
      <ThemedText style={styles.subtitle}>{slide.subtitle}</ThemedText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  subtitle: {
    lineHeight: 22,
    opacity: 0.7,
    textAlign: 'center',
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
});
