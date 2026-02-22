import { useMemo } from 'react';

import {
  generateQRMatrix,
  generateQRPointsFromModules,
  generateTorusPoints,
  getQRBlackModules,
  hungarianMatch,
  normalizeShape,
  sortBySpiral,
  sortTorusByFlow,
} from '../utils';

import type { ShapeData, TorusConfig } from '../types';

export const useShapeData = (
  qrData: string,
  torus: TorusConfig,
  qrTargetHeight: number,
): ShapeData => {
  return useMemo(() => {
    // Generate QR matrix and get black modules
    const qrMatrix = generateQRMatrix(qrData);
    const qrBlackModules = getQRBlackModules(qrMatrix);

    const nPoints = qrBlackModules.length;
    const qrSize = qrMatrix.length;
    const qrModuleSize = qrTargetHeight / qrSize;

    // Generate shapes with matching point counts
    const rawTorusPoints = generateTorusPoints(
      nPoints,
      torus.majorRadius,
      torus.minorRadius,
    );
    const rawQRPoints = generateQRPointsFromModules(qrBlackModules, qrSize);

    // Normalize shapes
    const normalizedTorus = normalizeShape(rawTorusPoints, torus.targetHeight);
    const normalizedQR = normalizeShape(rawQRPoints, qrTargetHeight);

    // Sort torus by flow for visual coherence
    const torusPoints = sortTorusByFlow(normalizedTorus);

    // Use Hungarian algorithm to find optimal QR point matching
    const qrPoints = hungarianMatch(torusPoints, sortBySpiral(normalizedQR));

    return {
      allShapes: [torusPoints, qrPoints],
      nPoints,
      qrSize,
      qrModuleSize,
    };
  }, [qrData, torus, qrTargetHeight]);
};
