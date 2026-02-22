/**
 * createPicture - Core rendering worklet for the QR Code Animation
 * Renders colored dots morphing from torus to QR code
 */
import { Skia } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';

import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CENTER_X,
  CENTER_Y,
  DISTANCE,
} from './constants';
import { reusableWhiteBgPaint } from './data';
import { ColorConfig, Point3D, ShapeData } from './types';
import { rotateX, rotateY, smoothstep } from './utils';

interface DotTransform {
  index: number;
  x: number;
  y: number;
  size: number;
  cornerRadius: number;
  bgOpacity: number;
  z: number;
  morphProgress: number;
}

export const createPicture = (
  progress: SharedValue<number>,
  iTime: SharedValue<number>,
  staggerBaseTime: SharedValue<number>,
  frozenRotationTime: SharedValue<number>,
  shapeData: ShapeData,
  colors: ColorConfig,
  dotSize: number,
) => {
  'worklet';

  // Step 1: Setup
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(
    Skia.XYWHRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT),
  );

  const progressValue = progress.value;
  const timeValue = iTime.value % (Math.PI * 2);
  const staggerTime = staggerBaseTime.value;
  const frozenRotation = frozenRotationTime.value;

  const { allShapes, nPoints, qrModuleSize } = shapeData;

  const [satMin, satMax] = colors.saturationRange;
  const [lightMin, lightMax] = colors.lightnessRange;
  const satRange = satMax - satMin;
  const lightRange = lightMax - lightMin;

  const transforms: DotTransform[] = [];

  // Step 2: Compute transforms for each point
  for (let index = 0; index < nPoints; index++) {
    const torusPoint = allShapes[0][index];

    // Rotate torus to get wave angle
    let rotatedTorus = rotateX(torusPoint, 0.3);
    rotatedTorus = rotateY(rotatedTorus, staggerTime);

    const angle = Math.atan2(rotatedTorus.z, rotatedTorus.x);
    const normalizedAngle = (angle + Math.PI) / (2 * Math.PI);

    // Wave stagger delay
    const waveDelay = normalizedAngle * 0.25;

    const staggeredProgress = Math.min(
      1,
      Math.max(0, (progressValue - waveDelay) / (1 - waveDelay)),
    );

    // Cubic easing
    const eased =
      staggeredProgress < 0.5
        ? 4 * Math.pow(staggeredProgress, 3)
        : 1 - Math.pow(-2 * staggeredProgress + 2, 3) / 2;

    // Interpolate position between torus and QR
    const baseX =
      allShapes[0][index].x +
      (allShapes[1][index].x - allShapes[0][index].x) * eased;
    const baseY =
      allShapes[0][index].y +
      (allShapes[1][index].y - allShapes[0][index].y) * eased;
    const baseZ =
      allShapes[0][index].z +
      (allShapes[1][index].z - allShapes[0][index].z) * eased;

    // Transition boost for rotation
    const transitionBoost = Math.sin(eased * Math.PI) * 0.6;

    // Rotation delta
    let rotationDelta = timeValue - frozenRotation;
    if (rotationDelta > Math.PI) rotationDelta -= 2 * Math.PI;
    if (rotationDelta < -Math.PI) rotationDelta += 2 * Math.PI;

    const rotationAmount =
      (frozenRotation + rotationDelta) * (1 - eased) + transitionBoost;
    const tiltAmount = 0.3 * (1 - eased);

    // Apply 3D transformations
    let p: Point3D = { x: baseX, y: baseY, z: baseZ };
    p = rotateX(p, tiltAmount);
    p = rotateY(p, rotationAmount);

    // Perspective projection
    const scale = DISTANCE / (DISTANCE + p.z);
    const screenX = CENTER_X + p.x * scale;
    const screenY = CENTER_Y + p.y * scale;

    // Size calculation
    const dotScale = dotSize * scale;
    const qrScale = qrModuleSize * scale * 0.9;
    const baseSize = dotScale + (qrScale - dotScale) * eased;

    // Pulse effect
    const pulsePhase = eased * Math.PI;
    const scalePulse =
      1 + Math.sin(pulsePhase) * Math.pow(1 - eased, 0.5) * 0.3;
    const size = baseSize * scalePulse;

    // Corner radius: circle when 0, square when 1
    const cornerRadius = (size / 2) * (1 - eased);

    // Opacity calculation: combine frontFade with morphProgress
    const frontFade = smoothstep(100, -150, p.z);
    const transitionOpacity = 1 - eased;
    const bgOpacity = Math.max(transitionOpacity * frontFade, eased);

    transforms.push({
      index,
      x: screenX - size / 2,
      y: screenY - size / 2,
      size,
      cornerRadius,
      bgOpacity,
      z: p.z,
      morphProgress: eased,
    });
  }

  // Step 3: Depth sort (insertion sort for nearly-sorted data)
  for (let i = 1; i < transforms.length; i++) {
    const current = transforms[i];
    let j = i - 1;
    while (j >= 0 && transforms[j].z < current.z) {
      transforms[j + 1] = transforms[j];
      j--;
    }
    transforms[j + 1] = current;
  }

  // Step 4: Render colored dots
  for (const t of transforms) {
    // Color: vary saturation and lightness based on dot index for visual variety
    const baseSat = satMin + (t.index % 5) * (satRange / 4);
    const baseLight = lightMin + (t.index % 4) * (lightRange / 3);

    // Increase contrast during morph
    const contrastBoost = t.morphProgress;
    const sat = Math.min(100, baseSat + 10 * contrastBoost);
    const light = Math.max(30, baseLight - 15 * contrastBoost);

    const dotColor = `hsl(${colors.hue}, ${sat}%, ${light}%)`;
    reusableWhiteBgPaint.setColor(Skia.Color(dotColor));

    // Opacity: use bgOpacity computed above
    reusableWhiteBgPaint.setAlphaf(t.bgOpacity);

    // Draw as rounded rect (circle when cornerRadius = size/2, square when = 0)
    const dotRect = Skia.XYWHRect(t.x, t.y, t.size, t.size);
    canvas.drawRRect(
      Skia.RRectXY(dotRect, t.cornerRadius, t.cornerRadius),
      reusableWhiteBgPaint,
    );
  }

  return recorder.finishRecordingAsPicture();
};
