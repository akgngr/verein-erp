// Verein ERP — Web Push Service Worker (Issue #360 / ADR 0006)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "Verein ERP";
  let body = "";
  let url = "/";

  if (event.data) {
    try {
      const data = event.data.json();
      if (data && typeof data === "object") {
        if (typeof data.title === "string" && data.title.trim()) {
          title = data.title.trim();
        }
        if (typeof data.body === "string") {
          body = data.body;
        }
        if (typeof data.url === "string") {
          url = data.url;
        }
      }
    } catch {
      try {
        const text = event.data.text();
        if (text) {
          body = text;
        }
      } catch {
        // Fallback to default
      }
    }
  }

  // Same-origin URL safety check: ensure in-app relative/same-origin link
  let destination = "/";
  try {
    const parsed = new URL(url, self.location.origin);
    if (parsed.origin === self.location.origin) {
      destination = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    destination = "/";
  }

  const options = {
    body,
    icon: "/logo.svg",
    badge: "/logo.svg",
    data: {
      url: destination,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  let destination = "/";
  if (event.notification.data && typeof event.notification.data.url === "string") {
    try {
      const parsed = new URL(event.notification.data.url, self.location.origin);
      if (parsed.origin === self.location.origin) {
        destination = parsed.href;
      } else {
        destination = self.location.origin + "/";
      }
    } catch {
      destination = self.location.origin + "/";
    }
  } else {
    destination = self.location.origin + "/";
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If an existing window/tab matches destination, focus it
      for (const client of clientList) {
        if (client.url === destination && "focus" in client) {
          return client.focus();
        }
      }
      // If an existing tab from the same origin is open, navigate and focus it
      for (const client of clientList) {
        if ("navigate" in client && "focus" in client) {
          return client.navigate(destination).then((navigatedClient) => {
            if (navigatedClient && "focus" in navigatedClient) {
              return navigatedClient.focus();
            }
          });
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(destination);
      }
    })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true })
      .then((newSubscription) => {
        return self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "PUSH_SUBSCRIPTION_CHANGED",
              subscription: newSubscription.toJSON(),
            });
          });
        });
      })
      .catch(() => {
        // Silently catch to prevent worker crash
      })
  );
});
