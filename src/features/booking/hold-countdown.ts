/** The deadline is an absolute instant, so resuming the app does not extend the hold. */
export function remainingHoldSeconds(holdExpiresAt: string, nowMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(holdExpiresAt) - nowMs) / 1000));
}

export function formatHoldCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
