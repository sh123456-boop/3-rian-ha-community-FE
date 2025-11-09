// function 정의
// 1. 사용자 목록 렌더링
// 2. 페이지네이션 UI 갱신
// 3. 사용자 목록 api 호출
// 4. 닉네임으로 사용자 검색
// 5. 1:1 채팅방 생성 api 호출


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

    // 사용자 목록 렌더링
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
            const encodedNickname = encodeURIComponent(nickname);
            return `
                <div class="list-group-item d-flex align-items-center justify-content-between flex-wrap gap-3" data-user-id="${user.userId}" data-user-nickname="${encodedNickname}">
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
                    <button type="button" class="btn btn-outline-primary btn-chat" data-user-id="${user.userId}" data-user-nickname="${encodedNickname}">
                        <i class="bi bi-send-fill me-1"></i> 채팅하기
                    </button>
                </div>
            `;
        }).join('');

        userListEl.innerHTML = html;
    }

    // 페이지네이션 UI 갱신
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

    // 로딩 스피너 렌더링
    function renderLoading() {
        userListEl.innerHTML = `
            <div class="text-center py-5 w-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    // 사용자 목록 api 호출
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

    // 닉네임으로 사용자 검색
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

    // 페이지네이션 클릭 이벤트 처리
    paginationEl.addEventListener('click', (event) => {
        const target = event.target.closest('.page-link');
        if (!target || state.isLoading) return;

        const page = Number(target.dataset.page);
        if (Number.isNaN(page) || page < 0) return;
        if ((!state.hasNext || state.isSearchActive) && page > state.currentPage) return;

        fetchUsers(page);
    });

    // 1:1 채팅방 생성 또는 기존 채팅방으로 이동
    async function createPrivateRoom(otherMemberId, nickname, buttonEl) {
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

            const displayName = nickname || '1:1 채팅';
            window.location.href = `/chat/chatRoom?roomId=${roomId}&roomName=${encodeURIComponent(displayName)}`;
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

    // 사용자 목록에서 채팅하기 버튼 클릭 이벤트 처리
    userListEl.addEventListener('click', (event) => {
        const button = event.target.closest('.btn-chat');
        if (!button || button.dataset.loading === 'true') return;

        const container = button.closest('[data-user-id]');
        const userIdAttr = button.dataset.userId || container?.dataset.userId;
        const userId = Number(userIdAttr);
        if (!userId) {
            alert('사용자 정보를 확인할 수 없습니다.');
            return;
        }

        const encodedNickname = button.dataset.userNickname || container?.dataset.userNickname || '';
        const nickname = encodedNickname ? decodeURIComponent(encodedNickname) : '';

        createPrivateRoom(userId, nickname, button);
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

    // 초기 사용자 목록 불러오기
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
