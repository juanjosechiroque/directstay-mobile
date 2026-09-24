import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Speaks `message` through the screen reader whenever it changes to a non-empty value.
 * `accessibilityLiveRegion` only exists on Android; announcements work on both platforms.
 */
export function useAnnounce(message: string | undefined): void {
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
}
