(function () {
    const DEFAULT_API_BASE_URL = 'http://localhost:8080';
    // const DEFAULT_API_BASE_URL = 'http://ktb-rian.com:80';

    function normalizeBaseUrl(raw) {
        if (typeof raw !== 'string') return DEFAULT_API_BASE_URL;
        const trimmed = raw.trim();
        if (!trimmed) return DEFAULT_API_BASE_URL;
        return trimmed.replace(/\/+$/, '');
    }

    const override = window.__API_BASE_URL__;
    const apiBaseUrl = normalizeBaseUrl(override);

    window.API_BASE_URL = apiBaseUrl;
    window.buildApiUrl = function buildApiUrl(path) {
        if (typeof path !== 'string') {
            throw new TypeError('API 경로는 문자열이어야 합니다.');
        }
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `${apiBaseUrl}${normalized}`;
    };
})();
