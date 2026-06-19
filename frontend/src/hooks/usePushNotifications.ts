"use client";

/**
 * Push notification stub — register service worker and request permission.
 * Wire to FCM when push credentials are configured (V2).
 */
export function usePushNotifications() {
  const register = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { supported: false };
    }
    const permission = await Notification.requestPermission();
    return { supported: true, permission };
  };

  return { register };
}
