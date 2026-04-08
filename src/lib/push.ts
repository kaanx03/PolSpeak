const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export async function subscribeToPush(
  userType: "teacher" | "student",
  studentId?: string
): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("[push] SW or PushManager not available");
      return false;
    }

    const permission = await Notification.requestPermission();
    console.log("[push] permission:", permission);
    if (permission !== "granted") return false;

    let reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) reg = await navigator.serviceWorker.ready;
    console.log("[push] SW reg:", reg?.active?.scriptURL ?? reg?.installing?.scriptURL ?? "no sw");

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    console.log("[push] subscription endpoint:", sub.endpoint);

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userType, studentId }),
    });
    console.log("[push] subscribe API response:", res.status);

    return true;
  } catch (err) {
    console.error("[push] subscribeToPush error:", err);
    return false;
  }
}

export async function sendPushNotification(
  targetUserType: "teacher" | "student",
  opts: { studentId?: string; title: string; body: string; url?: string }
) {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserType, ...opts }),
    });
  } catch {
    // non-critical
  }
}
