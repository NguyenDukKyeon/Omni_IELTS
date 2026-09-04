export const SOURCE_ARTIFACT_TARGET_BAND_MIN = 3;
export const SOURCE_ARTIFACT_TARGET_BAND_MAX = 9;
export const SOURCE_ARTIFACT_TARGET_BAND_STEP = 0.5;

export function isValidSourceArtifactTargetBand(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (value < SOURCE_ARTIFACT_TARGET_BAND_MIN || value > SOURCE_ARTIFACT_TARGET_BAND_MAX) return false;
  return Number.isInteger(value / SOURCE_ARTIFACT_TARGET_BAND_STEP);
}
