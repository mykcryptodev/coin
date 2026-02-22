import { StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import { Canvas, Picture } from '@shopify/react-native-skia';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DEFAULT_COLORS,
  DEFAULT_DOT_SIZE,
  DEFAULT_QR_TARGET_HEIGHT,
  DEFAULT_TORUS,
} from './constants';
import { createPicture } from './create-picture';
import { useShapeData } from './hooks';
import type { ColorConfig, TorusConfig } from './types';

interface NotionQRAnimationProps {
  qrData: string;
  colors?: ColorConfig;
  torus?: TorusConfig;
  dotSize?: number;
  qrTargetHeight?: number;
}

export default function NotionQRAnimation({
  qrData,
  colors = DEFAULT_COLORS,
  torus = DEFAULT_TORUS,
  dotSize = DEFAULT_DOT_SIZE,
  qrTargetHeight = DEFAULT_QR_TARGET_HEIGHT,
}: NotionQRAnimationProps) {
  const iTime = useSharedValue(0.0);
  const progress = useSharedValue(0);
  const staggerBaseTime = useSharedValue(0.0);
  const frozenRotationTime = useSharedValue(0.0);

  const shapeData = useShapeData(qrData, torus, qrTargetHeight);
  const reducedMotion = useReducedMotion();

  // Auto-play: morph from torus to QR code after a short delay
  useEffect(() => {
    if (reducedMotion) {
      // Skip animation, show QR immediately
      progress.value = 1;
      return;
    }

    const currentRotation = iTime.value % (2 * Math.PI);
    staggerBaseTime.value = currentRotation;
    frozenRotationTime.value = currentRotation;

    const timer = setTimeout(() => {
      progress.value = withSpring(1, {
        duration: 6000,
        dampingRatio: 1,
      });
    }, 500);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [iTime, staggerBaseTime, frozenRotationTime, progress, reducedMotion]);

  useEffect(() => {
    const duration = 40000;
    const rotations = 1000;
    iTime.value = withTiming(Math.PI * 2 * rotations, {
      duration: duration * rotations,
      easing: Easing.linear,
    });
    return () => cancelAnimation(iTime);
  }, [iTime]);

  const picture = useDerivedValue(() => {
    return createPicture(
      progress,
      iTime,
      staggerBaseTime,
      frozenRotationTime,
      shapeData,
      colors,
      dotSize,
    );
  }, [progress, iTime, staggerBaseTime, frozenRotationTime, shapeData, colors, dotSize]);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: CANVAS_HEIGHT,
    position: 'absolute',
    width: CANVAS_WIDTH,
  },
  container: {
    backgroundColor: '#f5f5f5',
    flex: 1,
  },
});
