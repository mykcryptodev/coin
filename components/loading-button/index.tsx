import { StyleSheet, TouchableOpacity } from 'react-native';
import { useMemo } from 'react';
import Color from 'color';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { ActivityIndicator, type ActivityStatus } from './activity-indicator';
import type { StyleProp, ViewStyle } from 'react-native';

type LoadingButtonProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  status: ActivityStatus;
  colorFromStatusMap: Record<ActivityStatus, string>;
  titleFromStatusMap?: Record<ActivityStatus, string>;
};

const LoadingButton: React.FC<LoadingButtonProps> = ({
  onPress,
  style,
  status,
  colorFromStatusMap,
  titleFromStatusMap,
}) => {
  const activeColor = useMemo(() => {
    return colorFromStatusMap[status] || colorFromStatusMap.idle;
  }, [colorFromStatusMap, status]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!onPress} style={{ flex: 1 }}>
      <Animated.View
        layout={LinearTransition.springify()}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 12,
            backgroundColor: Color(activeColor).lighten(0.6).hex(),
          },
          style,
        ]}>
        <ActivityIndicator status={status} color={activeColor} size={22} />
        <Animated.Text
          key={status}
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.title, { color: activeColor }]}>
          {titleFromStatusMap?.[status] ?? ''}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export { LoadingButton };
export type { LoadingButtonProps };
