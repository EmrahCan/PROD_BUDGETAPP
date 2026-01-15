import { supabase } from "@/integrations/supabase/client";

// VAPID public key - fetched from edge function
let vapidPublicKey: string | null = null;

async function getVapidPublicKey(): Promise<string> {
  if (vapidPublicKey) return vapidPublicKey;
  
  const { data, error } = await supabase.functions.invoke('get-vapid-key');
  if (error) throw new Error('Failed to get VAPID key');
  
  vapidPublicKey = data.publicKey;
  return vapidPublicKey!;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw-push.js', {
      scope: '/'
    });
    console.log('Push Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function subscribeToPushNotifications(userId: string): Promise<PushSubscription | null> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Get VAPID public key
    const publicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer
    });

    // Save subscription to database
    const subscriptionJSON = subscription.toJSON();
    
    const { error } = await supabase
      .from('push_notification_preferences')
      .upsert({
        user_id: userId,
        enabled: true,
        subscription_endpoint: subscriptionJSON.endpoint,
        subscription_keys: {
          p256dh: subscriptionJSON.keys?.p256dh,
          auth: subscriptionJSON.keys?.auth
        }
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Failed to save subscription:', error);
      throw error;
    }

    console.log('Push subscription saved successfully');
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

export async function unsubscribeFromPushNotifications(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
    }

    // Update database
    await supabase
      .from('push_notification_preferences')
      .update({
        enabled: false,
        subscription_endpoint: null,
        subscription_keys: null
      })
      .eq('user_id', userId);

  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

export async function checkPushSupport(): Promise<{
  supported: boolean;
  permission: NotificationPermission | null;
}> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { supported: false, permission: null };
  }

  return {
    supported: true,
    permission: Notification.permission
  };
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  return await Notification.requestPermission();
}
