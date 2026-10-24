// 랭킹용 기록. 이 브라우저에 '유저 번호'를 하나 붙이고, 사이트에 머문 시간(초)과 들어간 게임을 abacus에 적는다.
// 이름이나 주소 같은 건 적지 않는다. 내 컴퓨터에서 파일로 열면(file://) 아무것도 기록하지 않는다.
// abacus 키: users(유저 번호 나눠 주기), u<번호>-time(머문 초), u<번호>-games(들어간 게임 비트),
//            u<번호>-when(처음 온 때와 마지막 접속 = 처음분×10000000 + 마지막분, 분은 2026-01-01 0시(UTC)부터)
// 새 게임을 넣으면 BITS 맨 뒤에 slug를 하나 붙인다. 순서를 바꾸거나 빼면 예전 기록이 엉킨다.
(function () {
  const BITS = ['airplane', 'block', 'factory', 'cruise', 'airline', 'sailor', 'star-life', 'observatory',
    'microbe-evolution', 'sapling2d', 'solar-timeline', 'microbe-sandbox', 'microbe-genetics', 'microbe-family',
    'monkey-clicker', 'dot-baseball', 'terraform', 'sapling3d', 'random-life'];
  window.CHUNJANG_BITS = BITS;
  if (location.protocol === 'file:') return;
  if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent)) return;

  const API = 'https://abacus.jasoncameron.dev';
  const REAL = location.hostname.endsWith('github.io');
  const NS = REAL ? 'chunjang-games' : 'chunjang-games-test';   // 시험할 때는 따로 센다
  const P = REAL ? 'chunjang-' : 'chunjang-test-';
  const IDLE = 10 * 60 * 1000;                                   // 10분 동안 아무것도 안 누르면 시간을 안 셈
  const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} };
  const json = r => (r.ok ? r.json() : Promise.reject(r.status));

  // 들어간 게임 표시
  const m = location.pathname.match(/\/games\/([^/]+)\.html$/);
  const bit = m ? BITS.indexOf(m[1]) : -1;
  if (bit >= 0) {
    const g = get('games', 0);
    if (Math.floor(g / 2 ** bit) % 2 === 0) put('games', g + 2 ** bit);
  }

  // 유저 번호 만들기 (처음 한 번)
  let making = null;
  function me() {
    const u = get('user', null);
    if (u && u.n && u.tk && u.gk) return Promise.resolve(u);
    if (making) return making;
    if (get('making', 0) > Date.now()) return Promise.resolve(null);   // 다른 탭이 만드는 중
    put('making', Date.now() + 20000);
    making = (async () => {
      for (let i = 0; i < 3; i++) {
        const n = (await fetch(API + '/hit/' + NS + '/users').then(json)).value;
        const t = await fetch(API + '/create/' + NS + '/u' + n + '-time?initializer=0').then(json).catch(() => null);
        const g = t && await fetch(API + '/create/' + NS + '/u' + n + '-games?initializer=0').then(json).catch(() => null);
        if (t && g) { const u = { n, tk: t.admin_key, gk: g.admin_key }; put('user', u); put('first', minute(Date.now())); return u; }
      }
      return null;
    })().catch(() => null).finally(() => { making = null; put('making', 0); });
    return making;
  }

  // 머문 시간 세기: 화면이 보이고, 10분 안에 뭔가 눌렀을 때만
  let last = Date.now(), touched = Date.now();
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(e =>
    addEventListener(e, () => { touched = Date.now(); }, { capture: true, passive: true }));
  setInterval(() => {
    const now = Date.now(), dt = Math.min(5, (now - last) / 1000);
    last = now;
    if (document.visibilityState === 'visible' && now - touched < IDLE) {
      put('time', get('time', 0) + dt);
      put('seen', now);                                            // 마지막으로 진짜 보고 있던 때
    }
  }, 1000);

  // 언제 왔는지: 처음 온 분과 마지막 접속 분을 숫자 하나로 묶는다
  const BASE = Date.UTC(2026, 0, 1);
  function minute(ms) { return Math.max(0, Math.floor((ms - BASE) / 60000)); }
  if (get('first', null) == null) put('first', minute(Date.now()));   // 2026-10-21 전에 온 유저는 이때부터 기록됨
  const whenValue = () => get('first', 0) * 1e7 + minute(get('seen', Date.now()));

  // abacus에 적기: 20초마다, 그리고 창을 닫거나 다른 데로 갈 때
  const sent = { time: -1, games: -1, when: -1 };
  const ADM = { time: 'tk', games: 'gk', when: 'wk' };
  async function send(kind, key, value, final) {
    if (sent[kind] === value) return;
    sent[kind] = value;
    const u = await me();
    if (!u) { sent[kind] = -1; return; }
    const name = 'u' + u.n + '-' + kind, adm = ADM[kind];
    if (u[adm] === '') return;                         // 만들 수 없었던 키는 더 안 건드림
    if (!u[adm]) {                                     // 예전 유저는 '언제' 키가 없으니 처음 한 번 만든다
      const r = await fetch(API + '/create/' + NS + '/' + name + '?initializer=' + value).catch(() => null);
      if (r && r.ok) { u[adm] = (await r.json()).admin_key; put('user', u); }
      else if (r && r.status === 409) { u[adm] = ''; put('user', u); }
      else sent[kind] = -1;
      return;
    }
    const r = await fetch(API + '/set/' + NS + '/' + name + '?value=' + value,
      { method: 'POST', headers: { Authorization: 'Bearer ' + u[adm] }, keepalive: !!final }).catch(() => null);
    if (r && r.status === 404) {                       // 6개월 넘게 안 와서 지워졌으면 같은 번호로 다시 만든다
      const c = await fetch(API + '/create/' + NS + '/' + name + '?initializer=' + value).then(json).catch(() => null);
      if (c) { u[adm] = c.admin_key; put('user', u); } else sent[kind] = -1;
    } else if (!r || !r.ok) sent[kind] = -1;
  }
  function sync(final) {
    send('time', 'time', Math.floor(get('time', 0)), final);
    send('games', 'games', get('games', 0), final);
    send('when', 'when', whenValue(), final);
  }
  setTimeout(sync, 3000);
  setInterval(sync, 20000);
  addEventListener('pagehide', () => sync(true));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') sync(true); });

  window.CHUNJANG_ME = () => { const u = get('user', null); return { n: u && u.n, time: Math.floor(get('time', 0)), games: get('games', 0) }; };
})();
