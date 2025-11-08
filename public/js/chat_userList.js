(() => {
    const userListEl = document.getElementById('user-list');
    const paginationEl = document.getElementById('pagination');
    const searchInputEl = document.getElementById('user-search');
    const searchButtonEl = document.getElementById('user-search-btn');

    if (!userListEl || !paginationEl) return;

    const state = {
        users: [],
        currentPage: 0,
        hasNext: false,
        isLoading: false,
        isSearchActive: false,
    };

    const DEFAULT_PROFILE = '/img/default-profile.png';

    /**
     * 사용자 목록 DOM을 업데이트한다.
     * @param {Array} list - 렌더링할 사용자 데이터 배열
     */
    function renderUsers(list) {
        if (!list.length) {
            userListEl.innerHTML = `
                <div class="text-center py-5 text-muted w-100">
                    표시할 사용자가 없습니다.
                </div>
            `;
            return;
        }

        const html = list.map((user) => {
            const profileUrl = user.profileImageUrl || DEFAULT_PROFILE;
            const nickname = user.nickname ?? '이름 없음';
            return `
                <div class="list-group-item d-flex align-items-center justify-content-between flex-wrap gap-3" data-user-id="${user.userId}">
                    <div class="d-flex align-items-center gap-3">
                        <img 
                            src="${profileUrl}" 
                            alt="${nickname}님의 프로필 이미지" 
                            class="rounded-circle" 
                            width="48" 
                            height="48"
                            style="object-fit: cover;"
                            onerror="this.onerror=null;this.src='${DEFAULT_PROFILE}';"
                        >
                        <div class="fw-semibold">${nickname}</div>
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-chat" data-user-id="${user.userId}">
                        <i class="bi bi-send-fill me-1"></i> 채팅하기
                    </button>
                </div>
            `;
        }).join('');

        userListEl.innerHTML = html;
    }

    /**
     * 현재 페이지 정보에 맞춰 페이지네이션을 갱신한다.
     */
    function renderPagination() {
        const items = [];

        items.push(`
            <li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}">
                <button class="page-link" data-page="${state.currentPage - 1}" ${state.currentPage === 0 ? 'tabindex="-1" aria-disabled="true"' : ''}>이전</button>
            </li>
        `);

        if (state.currentPage > 0) {
            items.push(`
                <li class="page-item">
                    <button class="page-link" data-page="${state.currentPage - 1}">${state.currentPage}</button>
                </li>
            `);
        }

        items.push(`
            <li class="page-item active">
                <button class="page-link" data-page="${state.currentPage}" aria-current="page">${state.currentPage + 1}</button>
            </li>
        `);

        if (state.hasNext && !state.isSearchActive) {
            items.push(`
                <li class="page-item">
                    <button class="page-link" data-page="${state.currentPage + 1}">${state.currentPage + 2}</button>
                </li>
            `);
        }

        items.push(`
            <li class="page-item ${state.hasNext && !state.isSearchActive ? '' : 'disabled'}">
                <button class="page-link" data-page="${state.currentPage + 1}" ${state.hasNext && !state.isSearchActive ? '' : 'tabindex="-1" aria-disabled="true"'}>다음</button>
            </li>
        `);

        paginationEl.innerHTML = items.join('');
    }

    /**
     * 목록과 페이지네이션에 사용할 로딩 스피너를 렌더링한다.
     */
    function renderLoading() {
        userListEl.innerHTML = `
            <div class="text-center py-5 w-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    /**
     * 기본 사용자 목록 페이지를 불러온다.
     * @param {number} page - 0 기반 페이지 번호
     */
    async function fetchUsers(page) {
        if (state.isLoading) return;
        state.isLoading = true;
        state.isSearchActive = false;
        renderLoading();

        try {
            const url = window.buildApiUrl(`/v1/users?page=${page}`);
            const res = await window.customFetch(url, { method: 'GET' });
            if (!res.ok) throw new Error('사용자 목록을 불러오지 못했습니다.');

            const payload = await res.json();
            const data = payload?.data ?? {};
            const users = Array.isArray(data.users) ? data.users : [];

            state.users = users;
            state.currentPage = page;
            state.hasNext = Boolean(data.hasNext);

            renderUsers(state.users);
            renderPagination();
        } catch (error) {
            console.error(error);
            userListEl.innerHTML = `
                <div class="text-center py-5 text-danger w-100">
                    사용자 목록을 불러오는 중 문제가 발생했습니다.
                </div>
            `;
        } finally {
            state.isLoading = false;
        }
    }

    /**
     * 닉네임으로 사용자를 검색한다.
     * @param {string} nickname - 검색할 닉네임
     */
    async function searchUserByNickname(nickname) {
        const trimmed = nickname.trim();
        if (!trimmed) {
            fetchUsers(0);
            return;
        }

        if (state.isLoading) return;
        state.isLoading = true;
        state.isSearchActive = true;
        renderLoading();

        try {
            const url = window.buildApiUrl(`/v1/users/${encodeURIComponent(trimmed)}`);
            const res = await window.customFetch(url, { method: 'GET' });

            if (!res.ok) {
                if (res.status === 404) {
                    userListEl.innerHTML = `
                        <div class="text-center py-5 text-muted w-100">
                            '${trimmed}' 닉네임의 사용자를 찾을 수 없습니다.
                        </div>
                    `;
                    paginationEl.innerHTML = '';
                    return;
                }
                throw new Error('사용자 검색에 실패했습니다.');
            }

            const payload = await res.json();
            const user = payload?.data ? [payload.data] : [];

            state.users = user;
            state.currentPage = 0;
            state.hasNext = false;

            renderUsers(state.users);
            renderPagination();
        } catch (error) {
            console.error(error);
            userListEl.innerHTML = `
                <div class="text-center py-5 text-danger w-100">
                    사용자 검색 중 문제가 발생했습니다.
                </div>
            `;
            paginationEl.innerHTML = '';
        } finally {
            state.isLoading = false;
        }
    }

    paginationEl.addEventListener('click', (event) => {
        const target = event.target.closest('.page-link');
        if (!target || state.isLoading) return;

        const page = Number(target.dataset.page);
        if (Number.isNaN(page) || page < 0) return;
        if ((!state.hasNext || state.isSearchActive) && page > state.currentPage) return;

        fetchUsers(page);
    });

    async function createPrivateRoom(otherMemberId, buttonEl) {
        if (!otherMemberId || !Number.isFinite(otherMemberId)) return;
        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.dataset.loading = 'true';
        }

        try {
            const url = window.buildApiUrl(`/v1/chat/room/private/create?otherMemberId=${otherMemberId}`);
            const res = await window.customFetch(url, { method: 'POST' });
            if (!res.ok) throw new Error('채팅방을 생성하거나 찾지 못했습니다.');

            const payload = await res.json();
            const roomId = payload?.data;
            if (!roomId) throw new Error('채팅방 정보가 올바르지 않습니다.');

            window.location.href = `/chat/chatRoom?roomId=${roomId}`;
        } catch (error) {
            console.error(error);
            alert('채팅방을 열 수 없습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            if (buttonEl) {
                buttonEl.disabled = false;
                delete buttonEl.dataset.loading;
            }
        }
    }

    userListEl.addEventListener('click', (event) => {
        const button = event.target.closest('.btn-chat');
        if (!button || button.dataset.loading === 'true') return;

        const userIdAttr = button.dataset.userId || button.closest('[data-user-id]')?.dataset.userId;
        const userId = Number(userIdAttr);
        if (!userId) {
            alert('사용자 정보를 확인할 수 없습니다.');
            return;
        }

        createPrivateRoom(userId, button);
    });

    if (searchInputEl && searchButtonEl) {
        searchButtonEl.addEventListener('click', () => {
            searchUserByNickname(searchInputEl.value || '');
        });

        searchInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchUserByNickname(searchInputEl.value || '');
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        (async () => {
            if (window.authReady) {
                try {
                    await window.authReady;
                } catch {
                    // ignore; protected routes should redirect elsewhere
                }
            }
            fetchUsers(0);
        })();
    });
})();
