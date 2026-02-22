import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import type { SharedValue } from 'react-native-reanimated';

type DotProps = {
  index: number;
  activeIndex: SharedValue<number>;
  dotSize: number;
};

export const Dot: React.FC<DotProps> = ({ index, activeIndex, dotSize }) => {
  const rDotStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(
        activeIndex.value >= index ? 'white' : 'rgba(0,0,0,0.15)',
        {
          duration: 200,
        },
      ),
    };
  }, [index]);

  return (
    <Animated.View
      key={index}
      style={[
        {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          borderCurve: 'continuous',
        },
        rDotStyle,
      ]}
    />
  );
};
