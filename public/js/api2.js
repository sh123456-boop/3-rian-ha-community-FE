// File: public/js/api.js
// - 모든 요청은 customFetch 사용
// - reissue는 동시에 한 번만( single-flight )
// - 초기 부팅 때 access 없으면 한 번 reissue 시도해서 authReady 신호 제공

(() => {
  let accessToken = localStorage.getItem('accessToken') || null;
  let reissuePromise = null;

  function setAccessToken(newToken) {
    accessToken = newToken || null;
    if (newToken) localStorage.setItem('accessToken', newToken);
    else localStorage.removeItem('accessToken');
  }

  async function reissueOnce() {
    // 이미 진행 중이면 그 Promise를 공유
    if (reissuePromise) return reissuePromise;

    reissuePromise = (async () => {
      const res = await fetch('http://localhost:8080/v1/auth/reissue', {
        method: 'POST',
        credentials: 'include', // refresh 쿠키 필요
      });
      if (!res.ok) throw new Error('REISSUE_FAILED');

      const newAccess = res.headers.get('access');
      if (!newAccess) throw new Error('REISSUE_NO_ACCESS_HEADER');

      setAccessToken(newAccess);
    })();

    try {
      await reissuePromise;
    } finally {
      reissuePromise = null;
    }
  }

  async function ensureAccessToken() {
    // 이미 있으면 건너뜀
    if (accessToken) return;
    try {
      await reissueOnce(); // refresh가 있으면 여기서 access 미리 세팅
    } catch {
      // refresh 없거나 만료 → 로그인 상태 아님. 그냥 넘어가고,
      // 보호 API를 치면 그때 401로 흐름 처리됨.
    }
  }

  async function customFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (accessToken) headers.set('access', accessToken); // 서버가 'access' 헤더를 읽는 현재 방식 유지

    const baseInit = {
      ...options,
      headers,
      credentials: options.credentials ?? 'include', // 기본적으로 쿠키 포함
    };

    // 1차 요청
    let res = await fetch(url, baseInit);
    if (!(res.status === 401 || res.status === 403)) return res;

    // access가 있었고 만료로 보이면 reissue 단 한 번
    if (!accessToken) return res; // 애초에 토큰이 없던 경우면 재발급 시도 안 함

    try {
      await reissueOnce();
    } catch (e) {
      // 재발급 실패 → 로그인 페이지로 보내고 원요청은 실패 처리
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      window.location.href = '/v1/auth/login';
      throw e;
    }

    // 재시도(새 access 반영)
    const retryHeaders = new Headers(options.headers || {});
    if (accessToken) retryHeaders.set('access', accessToken);

    return fetch(url, {
      ...options,
      headers: retryHeaders,
      credentials: baseInit.credentials,
    });
  }

  // 전역 노출
  window.customFetch = customFetch;
  window.getAccessToken = () => accessToken;

  // 다른 스크립트가 기다릴 수 있는 Promise
  window.authReady = (async () => {
    await ensureAccessToken();
  })();

  // 이벤트로도 알림 (DOMContentLoaded 이후에 쏴서 리스너 손실 방지)
  window.addEventListener('DOMContentLoaded', () => {
    window.authReady.finally(() => {
      window.dispatchEvent(new Event('auth:ready'));
    });
  });
})();
