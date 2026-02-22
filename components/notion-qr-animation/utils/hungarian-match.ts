import { Point3D } from '../types';

/**
 * Greedy nearest-neighbor matching — O(n²) instead of O(n³) Hungarian.
 * For each source point, find the closest unmatched target point.
 * Visually near-identical for torus→QR morphing animations.
 */
export const hungarianMatch = (
  source: Point3D[],
  target: Point3D[],
): Point3D[] => {
  const n = source.length;
  if (n !== target.length) {
    throw new Error('Point sets must have equal length');
  }

  const result: Point3D[] = new Array(n);
  const used = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const sx = source[i].x;
    const sy = source[i].y;
    const sz = source[i].z;
    let bestDist = Infinity;
    let bestJ = 0;

    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const dx = sx - target[j].x;
      const dy = sy - target[j].y;
      const dz = sz - target[j].z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < bestDist) {
        bestDist = dist;
        bestJ = j;
      }
    }

    used[bestJ] = 1;
    result[i] = target[bestJ];
  }

  return result;
};
