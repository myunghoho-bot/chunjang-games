// 접속자 수: 오늘 온 사람 / 지금까지 온 사람. 같은 브라우저는 하루에 한 번만 센다.
// 숫자는 abacus.jasoncameron.dev(가입 없는 무료 숫자 세기 서비스)에 저장된다. 서비스가 안 되면 조용히 숨는다.
(function () {
  const el = document.getElementById('visits');
  if (!el) return;
  const API = 'https://abacus.jasoncameron.dev';
  const NS = location.hostname.endsWith('github.io') ? 'chunjang-games' : 'chunjang-games-test'; // 내 컴퓨터에서 시험할 땐 따로 센다
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }); // 2026-10-17
  let seen = null;
  try { seen = localStorage.getItem('chunjang-visit-day'); } catch (e) {}
  const op = seen === day ? 'get' : 'hit';
  const ask = key => fetch(API + '/' + op + '/' + NS + '/' + key)
    .then(r => (r.ok ? r.json() : { value: null }))
    .catch(() => ({ value: null }));

  Promise.all([ask('day-' + day), ask('total')]).then(([today, total]) => {
    if (total.value == null) return;
    if (op === 'hit') { try { localStorage.setItem('chunjang-visit-day', day); } catch (e) {} }
    el.innerHTML = '<span>오늘 <b>' + (today.value || 1).toLocaleString('ko-KR') + '</b>명</span>' +
                   '<span>전체 <b>' + total.value.toLocaleString('ko-KR') + '</b>명</span>';
    el.hidden = false;
  });
})();
