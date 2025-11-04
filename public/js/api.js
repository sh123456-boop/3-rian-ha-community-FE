// Single-flight customFetch with shared reissue logic.
// - Ensures concurrent requests that detect expired access token share one reissue request.
// - Exposes window.customFetch, window.getAccessToken, and window.authReady.

(function () {
    let accessToken = localStorage.getItem('accessToken') || null;
    let reissuePromise = null;

    function setAccessToken(newToken) {
        accessToken = newToken || null;
        if (newToken) localStorage.setItem('accessToken', newToken);
        else localStorage.removeItem('accessToken');
    }

    // access 헤더에 한글 포함시 로그인 페이지로 이동. access 토큰 null 처리
    function purgeAccessTokenAndRedirect() {
        setAccessToken(null);
        alert('세션 정보가 손상되었습니다. 다시 로그인해주세요.');
        window.location.href = '/v1/auth/login';
    }

    async function reissueOnce() {
        // If a reissue is already in progress, return the same promise (single-flight)
        if (reissuePromise) return reissuePromise;

        reissuePromise = (async () => {
            const res = await fetch(window.buildApiUrl('/v1/auth/reissue'), {
                method: 'POST',
                credentials: 'include', // refresh cookie must be sent
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
        // If we already have an access token, nothing to do
        if (accessToken) return;
        try {
            await reissueOnce(); // attempt to populate accessToken from refresh cookie
        } catch {
            // ignore - pages that require auth will handle redirect on demand
        }
    }

    async function customFetch(url, options = {}) {
        const headers = new Headers(options.headers || {});
        if (accessToken) {
            try {
                headers.set('access', accessToken);
            } catch (err) {
                if (err instanceof TypeError) {
                    purgeAccessTokenAndRedirect();
                }
                throw err;
            }
        }

        const baseInit = {
            ...options,
            headers,
            credentials: options.credentials ?? 'include',
        };

        // First request
        let res = await fetch(url, baseInit);
        if (!(res.status === 401 || res.status === 403)) return res;

        // If there was no access token (anonymous), don't try reissue here
        if (!accessToken) return res;

        try {
            await reissueOnce();
        } catch (e) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            window.location.href = '/v1/auth/login';
            throw e;
        }

        // Retry with refreshed access token
        const retryHeaders = new Headers(options.headers || {});
        if (accessToken) {
            try {
                retryHeaders.set('access', accessToken);
            } catch (err) {
                if (err instanceof TypeError) {
                    purgeAccessTokenAndRedirect();
                }
                throw err;
            }
        }

        return fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: baseInit.credentials,
        });
    }

    // Expose to global scope for existing code
    window.customFetch = customFetch;
    window.getAccessToken = () => accessToken;

    // authReady promise that other scripts can await
    window.authReady = (async () => {
        await ensureAccessToken();
    })();

    // Dispatch event after DOMContentLoaded so listeners can subscribe
    window.addEventListener('DOMContentLoaded', () => {
        window.authReady.finally(() => {
            window.dispatchEvent(new Event('auth:ready'));
        });
    });
})();
