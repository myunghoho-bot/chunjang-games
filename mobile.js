// 핸드폰·태블릿에서 게임하기. 춘장게임즈 사이트의 게임 복사본에만 들어간다(원본 게임 파일은 그대로).
// chunjang-update.py가 </head> 앞에 넣는다. 컴퓨터에서는 아무것도 하지 않는다(주소에 ?mobile=1을 붙이면 컴퓨터에서도 시험 가능).
// 하는 일:
//   1. 화면 맞춤: 게임마다 viewport를 바꾼다(vp).
//   2. 세로 화면이면 "가로로 돌려 주세요" 화면을 띄운다(orient:'land'). 전체 화면 버튼도 있다.
//   3. 키보드가 필요한 게임에는 화면 버튼을 단다(L: 왼쪽 아래, R: 오른쪽 아래, dpad: 상하좌우).
//      버튼은 진짜 키를 누른 것처럼 keydown/keyup을 보낸다. hold:1이면 누르고 있는 동안 계속 눌린다.
//   4. 마우스로만 되는 게임(mouse:1)은 손가락을 마우스로 바꿔 준다. 두 손가락 벌리기는 마우스 휠로 바꾼다(pinch).
// 새 게임을 넣을 때: 키보드가 꼭 필요하면 아래 CONFIG에 한 줄 넣는다. 아무것도 안 넣으면 가로 안내 + 두 손가락 확대만 된다.
(function () {
  'use strict';
  const slug = (location.pathname.match(/\/games\/([^/]+)\.html$/) || [])[1];
  const forced = /[?&]mobile=1/.test(location.search);
  const touch = forced || matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (!slug || !touch) return;

  const g = f => { try { return f(); } catch (e) { return undefined; } };   // 게임 속 값 읽기(없으면 undefined)
  const $id = id => document.getElementById(id);
  const modalOn = sel => { const m = document.querySelector(sel); return !!m && getComputedStyle(m).display !== 'none'; };

  // 아래쪽에 알림 상자가 있는 3D 게임: 버튼을 조금 올리고 상하좌우 칸을 작게
  const LIFT = (px = 72) => `#cjPad .cl{bottom:calc(${px}px + env(safe-area-inset-bottom,0px))}
#cjPad .dp{grid-template-columns:repeat(3,46px);grid-template-rows:repeat(3,46px)}
#cjPad .dp button{width:46px;height:46px}`;

  // 게임마다 다른 설정
  const CONFIG = {
    'airplane': { orient: 'any' },            // 이 게임은 자기만의 가로 안내와 터치 조종이 있다
    'star-life': { orient: 'any' },
    'monkey-clicker': { orient: 'any' },
    'block': {
      mouse: 1, pinch: 0, show: () => g(() => screenMode) !== 'title',
      L: [{ t: '◀', k: 'KeyA', hold: 1 }, { t: '▶', k: 'KeyD', hold: 1 }],
      R: [{ t: () => (BTN === 2 ? '놓기' : '캐기'), mouseToggle: 1 }, { t: '만들기', k: 'KeyC' }, { t: '점프', k: 'Space', hold: 1, big: 1 }],
      // 아래쪽 가운데 아이템 칸(1~9)을 가리지 않게 버튼을 위로 올리고, 오른쪽은 두 줄로 쌓는다
      css: `#cjPad .cl{bottom:78px}
#cjPad .cl.R{display:grid;grid-template-columns:auto auto;gap:8px}
#cjPad .cl.R button:nth-child(1){grid-column:1;grid-row:2}
#cjPad .cl.R button:nth-child(2){grid-column:1;grid-row:1}
#cjPad .cl.R button:nth-child(3){grid-column:2;grid-row:1/3;align-self:end}`,
    },
    'factory': { vp: 'width=1240', mouse: 1 },
    'cruise': {
      vp: 'width=device-width,initial-scale=1',
      show: () => !modalOn('#modal') && !modalOn('#start'),
      L: [{ t: '느리게', k: 'ArrowLeft', hold: 1, big: 1 }],
      R: [{ t: '뱃고동', k: 'Space' }, { t: '지도', k: 'KeyM' }, { t: '빠르게', k: 'ArrowRight', hold: 1, big: 1 }],
      css: '#cjPad .cl.R{right:calc(345px + env(safe-area-inset-right,0px))}',   // 오른쪽 판(330px)을 가리지 않게
    },
    'airline': { mouse: 1 },
    'sailor': {
      show: () => { const sc = g(() => S.scene); return (sc === 'sail' || sc === 'battle') && !document.querySelector('#modal.on'); },
      L: [{ t: () => (g(() => S.scene) === 'battle' ? '멀어지기' : '돛 내리기'), k: 'ArrowLeft' }],
      R: [{ t: '싸우기', k: 'KeyC', when: () => g(() => S.scene === 'sail' && !!W.foe) },
          { t: () => (g(() => S.scene) === 'battle' ? '다가가기' : '돛 올리기'), k: 'ArrowRight' }],
      // 아래는 선장 대사창, 오른쪽은 나침반이라 위쪽 왼편 하늘에 작게 둔다
      css: `#cjPad .cl{bottom:auto;top:calc(50px + env(safe-area-inset-top,0px))}
#cjPad .cl.R{right:auto;left:calc(126px + env(safe-area-inset-left,0px))}
#cjPad button{height:44px;min-width:0;padding:0 12px}`,
    },
    'observatory': { vp: 'width=device-width,initial-scale=1', pinch: 0 },
    'sapling2d': { pinch: 0, orient: 'any' },   // 처음부터 핸드폰용으로 만든 게임(조종 버튼·세로 화면)
    'sapling3d': { pinch: 0 },
    'sandcastle': { pinch: 0 },
    'small-station': { pinch: 0 },
    'terraform': { pinch: 0 },
    'ssuksu': { pinch: 0 },
    'random-system': { mouse: 1 },
    'stellar': { mouse: 1 },
    'random-life': {
      pinch: 0, show: () => g(() => MODE) === 'live' && !g(() => modalOpen),
      dpad: 1, R: [{ t: '행동', k: 'KeyE', big: 1 }], css: LIFT(),
    },
    'small-business': {
      show: () => !g(() => modalOpen) && !g(() => ED.D),
      dpad: 1, R: [{ t: '행동', k: 'KeyE', big: 1 }], css: LIFT(104),   // 왼쪽 아래 알림 상자가 커서 더 올림
    },
  };
  const C = Object.assign({ orient: 'land', pinch: 1 }, CONFIG[slug] || {});
  let BTN = 0;   // 손가락을 마우스로 바꿀 때 누르는 버튼(0 왼쪽, 2 오른쪽)

  // 1. 화면 맞춤
  if (C.vp) {
    let m = document.querySelector('meta[name="viewport"]');
    if (!m) { m = document.createElement('meta'); m.name = 'viewport'; document.head.appendChild(m); }
    m.content = C.vp;
  }

  // 키 이름 → [e.key, e.code]
  function keyOf(name) {
    const sp = { Space: [' ', 'Space'], Enter: ['Enter', 'Enter'], Escape: ['Escape', 'Escape'], Plus: ['+', 'Equal'], Minus: ['-', 'Minus'] };
    if (sp[name]) return sp[name];
    let m = /^Key([A-Z])$/.exec(name); if (m) return [m[1].toLowerCase(), name];
    m = /^Digit(\d)$/.exec(name); if (m) return [m[1], name];
    return [name, name];   // ArrowLeft 같은 것
  }
  function fireKey(type, name) {
    const [key, code] = keyOf(name);
    const ev = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
    (document.body || document).dispatchEvent(ev);
  }

  const CSS = `
html,body{overscroll-behavior:none}
${C.orient === 'land' ? 'canvas{touch-action:none}' : ''}
#cjPad{position:fixed;left:0;right:0;bottom:0;height:0;z-index:2147483000;font:600 15px/1 system-ui,-apple-system,"Malgun Gothic",sans-serif}
#cjPad .cl{position:fixed;bottom:calc(12px + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:10px}
#cjPad .cl.L{left:calc(12px + env(safe-area-inset-left,0px))}
#cjPad .cl.R{right:calc(12px + env(safe-area-inset-right,0px))}
#cjPad .dp{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);gap:4px}
#cjPad button{min-width:58px;height:58px;padding:0 14px;border-radius:14px;border:1.5px solid rgba(255,255,255,.4);
  background:rgba(18,18,22,.46);color:#fff;font:inherit;touch-action:none;user-select:none;-webkit-user-select:none;
  -webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;text-shadow:0 1px 2px rgba(0,0,0,.6)}
#cjPad .dp button{min-width:0;width:52px;height:52px;padding:0}
#cjPad button.big{min-width:74px;height:74px;border-radius:50%}
#cjPad button.on{background:rgba(255,255,255,.38)}
#cjPad[hidden],#cjPad button[hidden]{display:none}
#cjRot{position:fixed;inset:0;z-index:2147483600;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;
  background:#121318;color:#eef0f4;font:500 17px/1.5 system-ui,-apple-system,"Malgun Gothic",sans-serif;text-align:center;padding:24px}
#cjRot .ph{width:46px;height:78px;border:3px solid #eef0f4;border-radius:9px;animation:cjTurn 2.2s ease-in-out infinite}
@keyframes cjTurn{0%,25%{transform:rotate(0)}55%,100%{transform:rotate(-90deg)}}
#cjRot button{font:600 16px system-ui,-apple-system,"Malgun Gothic",sans-serif;border-radius:10px;padding:12px 18px;border:0;background:#f5d33f;color:#24160d}
#cjRot .skip{background:none;color:#a7abb6;text-decoration:underline;padding:6px}
@media (orientation:portrait){html:not(.cjSkip) #cjRot.need{display:flex}}
${C.css || ''}`;

  function build() {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    // 2. 가로 안내
    if (C.orient === 'land') {
      try { if (sessionStorage.getItem('cjSkipRot')) document.documentElement.classList.add('cjSkip'); } catch (e) {}
      const r = document.createElement('div'); r.id = 'cjRot'; r.className = 'need';
      const canFull = !!document.documentElement.requestFullscreen;
      r.innerHTML = '<div class="ph"></div><div>화면을 가로로 돌려 주세요.</div>' +
        (canFull ? '<button type="button" class="full">전체 화면으로 하기</button>' : '') +
        '<button type="button" class="skip">세로로 그냥 할게요</button>';
      document.body.appendChild(r);
      const fb = r.querySelector('.full');
      if (fb) fb.onclick = () => document.documentElement.requestFullscreen()
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(() => {});
      r.querySelector('.skip').onclick = () => {
        document.documentElement.classList.add('cjSkip');
        try { sessionStorage.setItem('cjSkipRot', '1'); } catch (e) {}
      };
    }

    // 3. 화면 버튼
    const specs = [];
    if (C.L || C.R || C.dpad) {
      const pad = document.createElement('div'); pad.id = 'cjPad';
      const mk = (spec, parent) => {
        const b = document.createElement('button'); b.type = 'button';
        if (spec.big) b.className = 'big';
        spec.el = b; specs.push(spec);
        let down = false;
        const press = e => {
          e.preventDefault(); e.stopPropagation();
          if (down) return; down = true; b.classList.add('on');
          try { b.setPointerCapture(e.pointerId); } catch (x) {}
          if (spec.mouseToggle) { BTN = BTN === 2 ? 0 : 2; label(); return; }
          if (spec.k) { fireKey('keydown', spec.k); if (!spec.hold) setTimeout(() => fireKey('keyup', spec.k), 60); }
        };
        const release = e => {
          if (e) e.stopPropagation();
          if (!down) return; down = false; b.classList.remove('on');
          if (spec.k && spec.hold) fireKey('keyup', spec.k);
        };
        b.addEventListener('pointerdown', press);
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, release));
        b.addEventListener('contextmenu', e => e.preventDefault());
        parent.appendChild(b);
      };
      if (C.dpad || C.L) {
        const L = document.createElement('div'); L.className = 'cl L'; pad.appendChild(L);
        if (C.dpad) {
          const dp = document.createElement('div'); dp.className = 'dp'; L.appendChild(dp);
          const cells = [null, { t: '▲', k: 'KeyW', hold: 1 }, null, { t: '◀', k: 'KeyA', hold: 1 }, null, { t: '▶', k: 'KeyD', hold: 1 }, null, { t: '▼', k: 'KeyS', hold: 1 }, null];
          cells.forEach(c => { if (c) mk(c, dp); else dp.appendChild(document.createElement('span')); });
        }
        (C.L || []).forEach(s => mk(s, L));
      }
      if (C.R) { const R = document.createElement('div'); R.className = 'cl R'; pad.appendChild(R); C.R.forEach(s => mk(s, R)); }
      document.body.appendChild(pad);
      function label() {
        for (const s of specs) {
          const t = typeof s.t === 'function' ? s.t() : s.t;
          if (s.el.textContent !== t) s.el.textContent = t;
          s.el.hidden = s.when ? !s.when() : false;
        }
      }
      const tick = () => { pad.hidden = C.show ? !C.show() : false; if (!pad.hidden) label(); };
      label(); tick(); setInterval(tick, 250);
      window.__cjLabel = label;
    }

    // 4. 손가락 → 마우스, 두 손가락 → 휠
    for (const cv of document.querySelectorAll('canvas')) {
      if (C.mouse) mouseShim(cv);
      else if (C.pinch) pinchWheel(cv, false);
    }
  }

  function mouseEv(el, type, x, y) {
    el.dispatchEvent(new MouseEvent(type, {
      clientX: x, clientY: y, screenX: x, screenY: y, button: BTN, buttons: type === 'mouseup' || type === 'click' ? 0 : (BTN === 2 ? 2 : 1),
      bubbles: true, cancelable: true, view: window,
    }));
  }
  function wheelEv(el, x, y, dy) {
    el.dispatchEvent(new WheelEvent('wheel', { clientX: x, clientY: y, deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }));
  }
  function pinchWheel(el, alsoMouse) {
    let last = null;
    const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    el.addEventListener('touchstart', e => { if (e.touches.length === 2) last = dist(e.touches); }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || last == null) return;
      const d = dist(e.touches), cx = (e.touches[0].clientX + e.touches[1].clientX) / 2, cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (Math.abs(d - last) > 12) { wheelEv(el, cx, cy, d > last ? -100 : 100); last = d; }
      if (alsoMouse) e.preventDefault();
    }, { passive: !alsoMouse });
    el.addEventListener('touchend', e => { if (e.touches.length < 2) last = null; }, { passive: true });
  }
  function mouseShim(el) {
    let start = null, moved = false, multi = false;
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (e.touches.length === 1) {
        start = { x: t.clientX, y: t.clientY }; moved = false; multi = false;
        mouseEv(el, 'mousemove', t.clientX, t.clientY); mouseEv(el, 'mousedown', t.clientX, t.clientY);
      } else if (!multi) {               // 두 번째 손가락이 닿으면 누르던 것을 놓고 확대로 바꾼다
        multi = true; if (start) mouseEv(el, 'mouseup', start.x, start.y);
      }
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      e.preventDefault();
      if (multi || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (start && Math.hypot(t.clientX - start.x, t.clientY - start.y) > 8) moved = true;
      mouseEv(el, 'mousemove', t.clientX, t.clientY);
    }, { passive: false });
    const end = e => {
      e.preventDefault();
      if (e.touches.length) return;
      const t = e.changedTouches[0];
      if (!multi) { mouseEv(el, 'mouseup', t.clientX, t.clientY); if (!moved) mouseEv(el, 'click', t.clientX, t.clientY); }
      start = null; multi = false;
    };
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('touchcancel', end, { passive: false });
    if (C.pinch) pinchWheel(el, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
