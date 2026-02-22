import { type FC, useEffect } from 'react';
import Animated, {
  Easing,
  FadeOut,
  LinearTransition,
  SlideOutDown,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

type AnimatedSingleNumberProps = {
  value: string;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
  index: number;
  itemWidth: number;
  itemHeight: number;
  totalNumbersLength: number;
  rightSpace?: number;
  scale: number;
  scaleWidthOffset?: number;
};

export const AnimatedSingleNumber: FC<AnimatedSingleNumberProps> = ({
  value,
  style,
  index,
  itemHeight,
  itemWidth,
  totalNumbersLength,
  containerStyle,
  rightSpace,
  scale,
  scaleWidthOffset = 0,
}) => {
  const bottom = useSharedValue(-50);
  const opacity = useSharedValue(0);

  const scaledItemWidth = useDerivedValue(() => {
    return itemWidth * (scale + scaleWidthOffset);
  }, [itemWidth, scale]);

  useEffect(() => {
    bottom.value = withSpring(0);
    opacity.value = withTiming(1);
  }, [bottom, opacity]);

  const rStyle = useAnimatedStyle(() => {
    const left = (index - totalNumbersLength / 2) * scaledItemWidth.value;

    return {
      bottom: bottom.value,
      opacity: opacity.value,
      left: withTiming(left + (rightSpace ?? 0), {
        duration: 200,
      }),
      transform: [{ scale: withTiming(scale) }],
    };
  }, [index, itemWidth, totalNumbersLength]);

  return (
    <Animated.View layout={LinearTransition} exiting={FadeOut.duration(100)}>
      <Animated.View
        layout={LinearTransition}
        exiting={SlideOutDown.duration(150).easing(Easing.linear)}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: itemWidth,
              height: itemHeight,
            },
            rStyle,
            containerStyle,
          ]}>
          <Animated.Text
            style={[
              {
                position: 'absolute',
              },
              style,
            ]}>
            {value}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};
