/* FlowDesk Web Push service worker */
self.addEventListener("push", function (event) {
  let data = {};
  try { data = event.data.json(); } catch (e) { data = { title: "FlowDesk", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "FlowDesk";
  const options = {
    body: data.body || "",
    icon: data.icon || "/favicon.ico",
    badge: "/favicon.ico",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
