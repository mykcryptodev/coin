import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Atlas,
  Canvas,
  Circle,
  Group,
  rect,
  useRSXformBuffer,
  useTexture,
} from '@shopify/react-native-skia';
import {
  cancelAnimation,
  interpolate,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  type WithSpringConfig,
} from 'react-native-reanimated';
import { PressableScale } from 'pressto';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// ----------------------------------------------------------------------------
// Part A: BlastCircleEffect (Inline, Not Exported)
// ----------------------------------------------------------------------------

type BlastCircleEffectProps = {
  size: number;
  count: number;
  circleRadius: number;
  blastRadius?: number;
};

export type BlastEffectRefType = {
  blast: (springAnimationConfig?: WithSpringConfig, delay?: number) => void;
};

const BlastCircleEffect = forwardRef<BlastEffectRefType, BlastCircleEffectProps>(
  ({ size: ContainerSize, count, circleRadius, blastRadius: blastRadiusProp }, ref) => {
    const circleSize = circleRadius * 2;
    const blastRadius = blastRadiusProp ?? ContainerSize / 2 - circleSize;
    const origin = { x: ContainerSize / 2, y: ContainerSize / 2 };
    const progress = useSharedValue(0);
    const baseRandomness = useSharedValue(Math.random());

    const sprites = useDerivedValue(() => {
      return new Array(count).fill(0).map((_, i) => {
        return rect(circleSize * i, 0, circleSize, circleSize);
      });
    }, [count]);

    const PARTICLE_COLORS = ["#FF6B6B", "#FF8E8E", "#FFB4B4", "#FF5252"];

    const texture = useTexture(
      <Group>
        {new Array(count).fill(0).map((_, index) => {
          const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
          return (
            <Circle
              key={`${index}-${count}`}
              cx={circleSize * index - circleRadius}
              cy={circleRadius}
              color={color}
              r={circleRadius}
              opacity={interpolate(Math.random(), [0, 1], [0.4, 0.8])}
            />
          );
        })}
      </Group>,
      { width: circleSize * count, height: circleSize },
    );

    useImperativeHandle(ref, () => ({
      blast: (springAnimationConfig?: WithSpringConfig, delay?: number) => {
        cancelAnimation(progress);
        baseRandomness.value = Math.random();
        progress.value = 0;
        progress.value = withDelay(delay ?? 0, withSpring(1, springAnimationConfig));
      },
    }), [baseRandomness, progress]);

    const seededRandom = useCallback((seed: number) => {
      'worklet';
      const x = Math.sin(seed++) * 10000;
      return Math.sqrt((x - Math.floor(x)) * baseRandomness.value);
    }, [baseRandomness]);

    const progressRadius = useDerivedValue(() => {
      return interpolate(progress.value, [0, 1], [0, blastRadius]);
    }, [progress]);

    const transforms = useRSXformBuffer(count, (val, i) => {
      'worklet';
      const initialX = origin.x + circleRadius;
      const initialY = origin.y - circleRadius;
      const progressAnimation = progressRadius.value ** (i % 2 ? 1.02 : 1);
      const xRandom = interpolate(seededRandom(i), [0, 1], [-0.5, 0.5]);
      const randomAngle = (xRandom * Math.PI * 2) / count;
      const angle = (i / count) * Math.PI * 2 + randomAngle;
      const x = Math.cos(angle) * progressAnimation;
      const y = Math.sin(angle) * progressAnimation;
      val.set(0, 1, initialX + x, initialY + y);
    });

    const opacity = useDerivedValue(() => {
      const baseOpacity = interpolate(progress.value, [0.8, 1], [1, 0]);
      return baseOpacity ** 2;
    }, [progress]);

    return (
      <Canvas style={{ width: ContainerSize, height: ContainerSize }}>
        <Atlas image={texture} sprites={sprites} transforms={transforms} opacity={opacity} />
      </Canvas>
    );
  },
);
BlastCircleEffect.displayName = 'BlastCircleEffect';

// ----------------------------------------------------------------------------
// Part B: HeartButton Component
// ----------------------------------------------------------------------------

type HeartButtonProps = {
  isLiked: boolean;
  onToggle: () => void;
  size?: number;
};

const BLAST_CONFIG = {
  mass: 1,
  stiffness: 100,
  damping: 20,
};

const HeartButtonRaw: React.FC<HeartButtonProps> = ({ 
  isLiked, 
  onToggle, 
  size = 18 
}) => {
  const blastRef = useRef<BlastEffectRefType>(null);
  const isAnimating = useSharedValue(false);
  const blastSize = size * 5;

  const handlePress = () => {
    if (isAnimating.value) return;

    onToggle();

    if (!isLiked) {
      // Transitioning to Liked
      isAnimating.value = true;
      blastRef.current?.blast(BLAST_CONFIG, 50);
      
      // Reset isAnimating after reasonable duration (600ms)
      setTimeout(() => {
        isAnimating.value = false;
      }, 600);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.blastContainer, { width: blastSize, height: blastSize, top: size / 2 - blastSize / 2, left: size / 2 - blastSize / 2 }]}>
        <BlastCircleEffect
          ref={blastRef}
          size={blastSize}
          count={16}
          circleRadius={1.5}
          blastRadius={size * 1.5}
        />
      </View>
      <PressableScale onPress={handlePress} style={styles.button}>
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={size}
          color={isLiked ? "#FF6B6B" : "#687076"}
        />
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blastContainer: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 0,
  },
  button: {
    zIndex: 1,
  }
});

export const HeartButton = React.memo(HeartButtonRaw);
