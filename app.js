// 바로가기 만들기(앱 설치)와 오프라인 안내. 첫 화면·역사관·랭킹에 들어간다.
// 기기에 저장(서비스 워커 sw.js 등록)은 track.js가 모든 페이지에서 한다.
(function () {
  const btn = document.getElementById('install');
  if (!btn) return;
  const ua = navigator.userAgent;
  const installed = () => matchMedia('(display-mode: standalone), (display-mode: minimal-ui)').matches || navigator.standalone === true;
  let deferred = null;

  if (installed()) btn.hidden = true;               // 이미 앱으로 열었으면 버튼이 필요 없다
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  addEventListener('appinstalled', () => { deferred = null; btn.textContent = '바로가기 만듦'; btn.disabled = true; });

  // 브라우저마다 바로가기 만드는 곳이 달라서 알맞은 설명을 고른다
  function how() {
    if (/KAKAOTALK|NAVER\(|Instagram|FBAN|FBAV|Line\//i.test(ua))
      return '앱 안에서 열린 화면에서는 바로가기를 만들 수 없어요. 메뉴(⋮ 또는 ⋯)에서 <b>다른 브라우저로 열기</b>를 누른 다음, 거기서 이 버튼을 다시 눌러 주세요.';
    if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
      return '아래쪽(아이패드는 위쪽)의 <b>공유 버튼</b>(네모에서 화살표가 나오는 모양)을 누르고 <b>홈 화면에 추가</b>를 누르세요.';
    if (/SamsungBrowser/.test(ua))
      return '아래쪽 메뉴(≡)를 누르고 <b>현재 페이지 추가</b> → <b>홈 화면</b>을 누르세요.';
    if (/Android/.test(ua))
      return '오른쪽 위 메뉴(⋮)를 누르고 <b>홈 화면에 추가</b>(또는 <b>앱 설치</b>)를 누르세요.';
    if (/Firefox\//.test(ua))
      return 'Firefox는 앱 설치가 안 돼요. 주소창 왼쪽의 자물쇠 모양을 바탕화면으로 끌어다 놓으면 바로가기가 생겨요. Chrome이나 Edge로 열면 앱으로 설치할 수 있어요.';
    if (/Edg\//.test(ua))
      return '주소창 오른쪽의 <b>앱 설치</b> 아이콘을 누르거나, 메뉴(⋯) → <b>앱</b> → <b>이 사이트를 앱으로 설치</b>를 누르세요. 설치하면 바탕화면과 시작 메뉴에 춘장게임즈가 생겨요.';
    if (/Chrome\//.test(ua))
      return '주소창 오른쪽의 <b>설치</b> 아이콘(모니터에 화살표)을 누르거나, 메뉴(⋮) → <b>전송, 저장, 공유</b> → <b>페이지를 앱으로 설치</b>를 누르세요. 설치하면 바탕화면과 시작 메뉴에 춘장게임즈가 생겨요.';
    return '브라우저 메뉴에서 <b>홈 화면에 추가</b>나 <b>바로가기 만들기</b>를 찾아 누르세요.';
  }

  // 이 기기에 저장된 파일 수(오프라인 준비 상태)
  async function saved() {
    if (!('caches' in window)) return '이 브라우저는 인터넷 없이 하기가 안 돼요.';
    const name = (await caches.keys()).find(k => /^chunjang-(?!extra)/.test(k));
    if (!name) return '인터넷 없이 하기: 준비하는 중이에요. 잠깐 뒤에 다시 열어 보세요.';
    const n = (await (await caches.open(name)).keys()).length;
    return '인터넷 없이 하기: 준비 끝. 이 기기에 파일 ' + n + '개를 저장해 뒀어요.';
  }

  const dlg = document.createElement('dialog');
  dlg.className = 'help';
  dlg.innerHTML = '<h3>바로가기 만들기</h3><p class="how"></p><p class="saved"></p>' +
    '<p class="note">바로가기를 만들어 두면 홈 화면이나 바탕화면에서 바로 열 수 있어요. 한 번 들어온 기기에서는 인터넷이 없어도 게임을 할 수 있어요. 게임 저장은 기기마다 따로예요.</p>' +
    '<form method="dialog"><button class="play">닫기</button></form>';
  document.body.appendChild(dlg);

  btn.addEventListener('click', async () => {
    if (deferred) {                                   // Chrome·Edge·안드로이드: 진짜 설치 창
      deferred.prompt();
      const r = await deferred.userChoice.catch(() => null);
      deferred = null;
      if (r && r.outcome === 'accepted') return;
    }
    dlg.querySelector('.how').innerHTML = how();
    dlg.querySelector('.saved').textContent = await saved().catch(() => '');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });

  // 인터넷이 끊기면 한 줄 알려 준다
  const off = document.createElement('p');
  off.className = 'offline'; off.hidden = navigator.onLine;
  off.textContent = '인터넷이 끊겨 있어요. 이 기기에 저장해 둔 게임으로 할 수 있어요. 접속자 수와 랭킹은 인터넷이 되면 다시 보여요.';
  const nav = document.querySelector('.nav');
  if (nav) nav.after(off);
  addEventListener('online', () => { off.hidden = true; });
  addEventListener('offline', () => { off.hidden = false; });
})();
