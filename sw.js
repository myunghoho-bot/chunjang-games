// 오프라인 놀이(2026-11-20, 아이 요청 "오프라인 플레이 가능하게"): 사이트와 모든 게임을 기기에 저장해 두고,
// 인터넷이 없으면 저장해 둔 것을 보여 준다. 인터넷이 되면 늘 새 파일을 먼저 받고 저장도 새로 한다.
// 아래 VERSION과 FILES 두 줄은 화동사니\.claude\chunjang-update.py가 파일이 바뀔 때마다 자동으로 고친다. 손으로 고치지 말 것.
const VERSION = '37ca8beb0109';
const FILES = ["./", "app.js", "bowl.svg", "counter.js", "games/airline.html", "games/airplane.html", "games/airplane3d.html", "games/antwar.html", "games/baduk.html", "games/block.html", "games/cosmos.html", "games/crash.html", "games/cruise.html", "games/dot-baseball.html", "games/dragon.html", "games/factory.html", "games/firewater.html", "games/galaxy.html", "games/haiyen.html", "games/impact.html", "games/microbe-evolution.html", "games/microbe-family.html", "games/microbe-genetics.html", "games/microbe-sandbox.html", "games/monkey-clicker.html", "games/observatory.html", "games/random-life.html", "games/random-system.html", "games/rocket.html", "games/sailor.html", "games/sandcastle.html", "games/sapling2d.html", "games/sapling3d.html", "games/siege.html", "games/small-business.html", "games/small-station.html", "games/solar-timeline.html", "games/ssuksu.html", "games/star-life.html", "games/stellar.html", "games/taxi3d.html", "games/terraform.html", "games.js", "history.html", "icons/apple-touch-icon.png", "icons/favicon.ico", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-192.png", "icons/maskable-512.png", "img/airline.webp", "img/airplane.webp", "img/airplane3d.webp", "img/antwar.webp", "img/baduk.webp", "img/block.webp", "img/cosmos.webp", "img/crash.webp", "img/cruise.webp", "img/dot-baseball.webp", "img/dragon.webp", "img/factory.webp", "img/firewater.webp", "img/galaxy.webp", "img/haiyen.webp", "img/impact.webp", "img/microbe-evolution.webp", "img/microbe-family.webp", "img/microbe-genetics.webp", "img/microbe-sandbox.webp", "img/monkey-clicker.webp", "img/observatory.webp", "img/random-life.webp", "img/random-system.webp", "img/rocket.webp", "img/sailor.webp", "img/sandcastle.webp", "img/sapling2d.webp", "img/sapling3d.webp", "img/siege.webp", "img/small-business.webp", "img/small-station.webp", "img/solar-timeline.webp", "img/ssuksu.webp", "img/star-life.webp", "img/stellar.webp", "img/taxi3d.webp", "img/terraform.webp", "index.html", "manifest.webmanifest", "mobile.js", "ranking.html", "site.css", "track.js"];
const CACHE = 'chunjang-' + VERSION;
const EXTRA = 'chunjang-extra';          // 바깥 파일(글꼴·랭킹 표). 버전이 바뀌어도 지우지 않는다

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // 하나씩 저장한다. 하나가 실패해도 나머지는 저장되게(addAll은 하나만 실패해도 전부 실패)
    await Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('chunjang-') && k !== CACHE && k !== EXTRA) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) e.respondWith(networkFirst(req, CACHE));
  else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(cacheFirst(req, EXTRA));
  else if (url.hostname === 'raw.githubusercontent.com') e.respondWith(networkFirst(req, EXTRA));
  // 접속자 수·랭킹 기록(abacus)은 인터넷이 있을 때만: 그대로 둔다
});

async function networkFirst(req, name) {
  const c = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) c.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: true }) || await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const home = await caches.match('./', { ignoreSearch: true }) || await caches.match('index.html');
      if (home) return home;
    }
    throw err;
  }
}

async function cacheFirst(req, name) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone()).catch(() => {});
  return res;
}
