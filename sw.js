/* Meena ki Zindagi — service worker (offline support)
   To force an update after editing game files: change the CACHE version below. */
const CACHE = "meena-v3";
const FILES = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./data/story.json",
  "./data/lang/en.json",
  "./data/lang/hi.json",
  "./data/lang/mr.json",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Network-first for game data (so edits reach players), cache fallback for offline */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
