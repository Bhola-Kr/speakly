export type UpdateKind = 'major' | 'minor' | 'patch' | null;

// Release versions only: do not accidentally force updates for malformed config.
export function parseAppVersion(value: unknown): number[] | null {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value.trim())) {
    return null;
  }
  const parts = value.trim().split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function getUpdateKind(current: unknown, latest: unknown): UpdateKind {
  const installed = parseAppVersion(current);
  const available = parseAppVersion(latest);
  if (!installed || !available) {
    return null;
  }
  const kinds = ['major', 'minor', 'patch'] as const;
  for (let index = 0; index < 3; index++) {
    if (available[index] > installed[index]) {
      return kinds[index];
    }
    if (available[index] < installed[index]) {
      return null;
    }
  }
  return null;
}
