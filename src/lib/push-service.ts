import { supabase } from "@/integrations/supabase/client";

// Public VAPID Key (URL-safe base64 uncompressed public key)
const VAPID_PUBLIC_KEY = "BEl62iC7MP7wuoT2BY1d9QqBOcVEzNB9Kokput9Wiq75r4kiv1qda-hW-HzKe6DqmBF013dAm9959vK42mz5Vt23zC0nBL_x-4NkLGlnhQKvYGO0Rrzhq-4iEUSmQLZyFx18yYn3Tm79QUqDr5J0L8-QOWei5";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return false;

    // Check if already subscribed
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Extract subscription details
    const endpoint = sub.endpoint;
    const keys = sub.toJSON().keys;
    if (!keys || !keys.p256dh || !keys.auth) return false;

    // Save to public.push_subscriptions in Supabase
    const { error } = await supabase
      .from("push_subscriptions" as any)
      .upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: "endpoint" });

    if (error) {
      console.error("Failed to save push subscription to DB:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error subscribing to push notifications:", err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    // Unsubscribe from browser push service
    await sub.unsubscribe();

    // Delete from Supabase
    const { error } = await supabase
      .from("push_subscriptions" as any)
      .delete()
      .eq("endpoint", sub.endpoint);

    if (error) {
      console.error("Failed to remove push subscription from DB:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error unsubscribing from push notifications:", err);
    return false;
  }
}
