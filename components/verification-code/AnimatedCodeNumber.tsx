import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
  FlipInXDown,
  FlipOutXDown,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

import { useThemeColor } from '@/hooks/use-theme-color';

export type StatusType = 'inProgress' | 'correct' | 'wrong';

type AnimatedCodeNumberProps = {
  code?: number;
  highlighted: boolean;
  status: SharedValue<StatusType>;
};

export const AnimatedCodeNumber: React.FC<AnimatedCodeNumberProps> = ({
  code,
  highlighted,
  status,
}) => {
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const inProgressColor = useThemeColor(
    { light: '#ccc', dark: '#2E2B2E' },
    'background',
  );

  const getColorByStatus = useCallback(
    (vStatus: StatusType) => {
      'worklet';
      if (highlighted) return tintColor;
      if (vStatus === 'correct') return '#22bb33';
      if (vStatus === 'wrong') return '#bb2124';
      return inProgressColor;
    },
    [highlighted, tintColor, inProgressColor],
  );

  const rBoxStyle = useAnimatedStyle(
    () => ({
      borderColor: withTiming(getColorByStatus(status.value)),
    }),
    [getColorByStatus],
  );

  return (
    <Animated.View style={[styles.container, rBoxStyle]}>
      {code != null && (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(250)}
        >
          <Animated.Text
            entering={FlipInXDown.duration(500).easing(
              Easing.bezier(0, 0.75, 0.5, 0.9),
            )}
            exiting={FlipOutXDown.duration(500).easing(
              Easing.bezier(0.6, 0.1, 0.4, 0.8),
            )}
            style={[styles.text, { color: textColor }]}
          >
            {code}
          </Animated.Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 0.95,
    borderWidth: 2,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Segment-Bold',
  },
});
