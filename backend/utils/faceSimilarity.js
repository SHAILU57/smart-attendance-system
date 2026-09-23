/**
 * Face similarity helpers.
 * The browser (face-api.js) produces a 128-dim Float32Array descriptor.
 * We compare descriptors with the Euclidean (L2) distance.
 * Lower distance = more similar. face-api recommends < 0.6 as "same person".
 * We use a stricter default of 0.55 and print the score — no 100% accuracy claim.
 */

const DEFAULT_THRESHOLD = 0.55;

function euclideanDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Descriptors must be equal-length numeric arrays');
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = Number(a[i]) - Number(b[i]);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function validateDescriptor(descriptor) {
  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return { valid: false, message: 'Face descriptor is required.' };
  }
  const bad = descriptor.some((n) => typeof Number(n) !== 'number' || Number.isNaN(Number(n)));
  if (bad) {
    return { valid: false, message: 'Face descriptor contains non-numeric values.' };
  }
  return { valid: true, message: 'ok' };
}

module.exports = { euclideanDistance, validateDescriptor, DEFAULT_THRESHOLD };