import { api } from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function isPushEnabled() {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("Browser Anda tidak mendukung notifikasi push");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Izin notifikasi ditolak");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const { data } = await api.get("/push/public-key");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    });
  }
  await api.post("/push/subscribe", { subscription: sub.toJSON() });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) {
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      try { await api.post("/push/unsubscribe", { subscription: sub.toJSON() }); } catch {}
      await sub.unsubscribe();
    }
  }
}
