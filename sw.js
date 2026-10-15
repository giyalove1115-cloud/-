// 안심길 서비스 워커
// 코드를 수정해서 다시 올린 뒤 예전 화면이 보이면 아래 버전 숫자를 올리세요 (v1 → v2)
const CACHE = 'ansimgil-v1';
const LOCAL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const LEAFLET = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCAL);
    // 지도 라이브러리는 실패해도 설치가 중단되지 않게 따로 저장
    await Promise.all(LEAFLET.map(async (u) => {
      try { await cache.put(u, await fetch(u, { mode: 'no-cors' })); } catch (err) {}
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 내 사이트 파일: 인터넷이 되면 최신 것, 안 되면 저장된 것
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // 지도 라이브러리(Leaflet): 저장된 것을 먼저 쓰고 뒤에서 갱신
  if (url.hostname === 'cdnjs.cloudflare.com') {
    e.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => cached);
        return cached || net;
      })
    );
  }
  // 지도 타일, 길찾기 서버 등 그 외 요청은 건드리지 않음
});
