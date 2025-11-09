// function 정의
// 1. 오픈 채팅방 렌더링
// 2. 페이지네이션 UI 갱신
// 3. 오픈 채팅방 목록 api 호출
// 4. 이름으로 채팅방 검색
// 5. 오픈 채팅방 생성 api 호출

(() => {
    const roomListEl = document.getElementById('room-list');
    const paginationEl = document.getElementById('room-pagination');
    const searchInputEl = document.getElementById('room-search');
    const searchButtonEl = document.getElementById('room-search-btn');
    const createInputEl = document.getElementById('room-create-input');
    const createButtonEl = document.getElementById('room-create-btn');

    if (!roomListEl || !paginationEl) return;

    const state = {
        rooms: [],
        currentPage: 0,
        hasNext: false,
        isLoading: false,
        isSearchActive: false,
        isCreatingRoom: false,
    };

    // 오픈 채팅방 렌더링
    function renderRooms(list) {
        if (!list.length) {
            roomListEl.innerHTML = `
                <div class="text-center py-5 text-muted w-100">
                    표시할 채팅방이 없습니다.
                </div>
            `;
            return;
        }

        const html = list.map((room) => {
            const name = room.roomName ?? '이름 없는 채팅방';
            const encodedName = encodeURIComponent(name);
            return `
                <div class="list-group-item d-flex align-items-center justify-content-between flex-wrap gap-3" data-room-id="${room.roomId}" data-room-name="${encodedName}">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="fw-semibold">${name}</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-outline-primary btn-join" data-room-id="${room.roomId}" data-room-name="${encodedName}">
                        <i class="bi bi-door-open me-1"></i> 참여하기
                    </button>
                </div>
            `;
        }).join('');

        roomListEl.innerHTML = html;
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
        roomListEl.innerHTML = `
            <div class="text-center py-5 w-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }

    /**
     * 현재 fetch가 끝날 때까지 기다린다.
     * @returns {Promise<void>}
     */
    function waitForIdle() {
        return new Promise((resolve) => {
            const poll = () => {
                if (!state.isLoading) {
                    resolve();
                    return;
                }
                setTimeout(poll, 50);
            };
            poll();
        });
    }

    // 오픈 채팅 목록 호출 API
    async function fetchRooms(page) {
        if (state.isLoading) return;
        state.isLoading = true;
        state.isSearchActive = false;
        renderLoading();

        try {
            const url = window.buildApiUrl(`/v1/chat/room/group/list?page=${page}`);
            const res = await window.customFetch(url, { method: 'GET' });
            if (!res.ok) throw new Error('채팅방 목록을 불러오지 못했습니다.');

            const payload = await res.json();
            const data = payload?.data ?? {};
            const rooms = Array.isArray(data.rooms) ? data.rooms : [];

            state.rooms = rooms;
            state.currentPage = page;
            state.hasNext = Boolean(data.hasNext);

            renderRooms(state.rooms);
            renderPagination();
        } catch (error) {
            console.error(error);
            roomListEl.innerHTML = `
                <div class="text-center py-5 text-danger w-100">
                    채팅방 목록을 불러오는 중 문제가 발생했습니다.
                </div>
            `;
        } finally {
            state.isLoading = false;
        }
    }

    // 이름으로 채팅방 검색
    async function searchRoomsByName(name) {
        const trimmed = name.trim();
        if (!trimmed) {
            fetchRooms(0);
            return;
        }

        if (state.isLoading) return;
        state.isLoading = true;
        state.isSearchActive = true;
        renderLoading();

        try {
            const url = window.buildApiUrl(`/v1/chat/room/group?name=${encodeURIComponent(trimmed)}`);
            const res = await window.customFetch(url, { method: 'GET' });

            if (!res.ok) {
                if (res.status === 404) {
                    roomListEl.innerHTML = `
                        <div class="text-center py-5 text-muted w-100">
                            '${trimmed}' 이름의 오픈 채팅을 찾을 수 없습니다.
                        </div>
                    `;
                    paginationEl.innerHTML = '';
                    return;
                }
                throw new Error('채팅방 검색에 실패했습니다.');
            }

            const payload = await res.json();
            const room = payload?.data ? [payload.data] : [];

            state.rooms = room;
            state.currentPage = 0;
            state.hasNext = false;

            renderRooms(state.rooms);
            renderPagination();
        } catch (error) {
            console.error(error);
            roomListEl.innerHTML = `
                <div class="text-center py-5 text-danger w-100">
                    오픈 채팅 검색 중 문제가 발생했습니다.
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

        fetchRooms(page);
    });

    if (searchInputEl && searchButtonEl) {
        searchButtonEl.addEventListener('click', () => {
            searchRoomsByName(searchInputEl.value || '');
        });

        searchInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchRoomsByName(searchInputEl.value || '');
            }
        });
    }

    // 오픈 채팅방 생성 API
    async function createGroupRoom(roomName) {
        const trimmed = roomName.trim();
        if (!trimmed) {
            alert('채팅방 이름을 입력해주세요.');
            return;
        }

        if (!createButtonEl || state.isCreatingRoom) return;

        state.isCreatingRoom = true;
        createButtonEl.disabled = true;

        try {
            await waitForIdle();

            const url = window.buildApiUrl(`/v1/chat/room/group/create?roomName=${encodeURIComponent(trimmed)}`);
            const res = await window.customFetch(url, { method: 'POST' });
            if (!res.ok) throw new Error('채팅방 생성에 실패했습니다.');

            createInputEl.value = '';
            await fetchRooms(0);
        } catch (error) {
            console.error(error);
            alert('채팅방 생성 중 문제가 발생했습니다.');
        } finally {
            createButtonEl.disabled = false;
            state.isCreatingRoom = false;
        }
    }

    async function joinGroupRoom(roomId, roomName, buttonEl) {
        if (!roomId || !Number.isFinite(roomId)) return;
        if (buttonEl?.dataset.loading === 'true') return;

        if (buttonEl) {
            buttonEl.disabled = true;
            buttonEl.dataset.loading = 'true';
        }

        try {
            const url = window.buildApiUrl(`/v1/chat/room/group/${roomId}/join`);
            const res = await window.customFetch(url, { method: 'POST' });
            if (!res.ok) throw new Error('채팅방에 참여할 수 없습니다.');

            const nameParam = roomName ? `&roomName=${encodeURIComponent(roomName)}` : '';
            window.location.href = `/chat/chatRoom?roomId=${roomId}${nameParam}`;
        } catch (error) {
            console.error(error);
            alert('채팅방에 참여 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            if (buttonEl) {
                buttonEl.disabled = false;
                delete buttonEl.dataset.loading;
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        (async () => {
            if (window.authReady) {
                try {
                    await window.authReady;
                } catch {
                    // ignore - protected routes should handle redirect
                }
            }
            fetchRooms(0);
        })();
    });

    roomListEl.addEventListener('click', (event) => {
        const button = event.target.closest('.btn-join');
        if (!button) return;

        const container = button.closest('[data-room-id]');
        const roomIdAttr = button.dataset.roomId || container?.dataset.roomId;
        const roomId = Number(roomIdAttr);
        if (!roomId) {
            alert('채팅방 정보를 확인할 수 없습니다.');
            return;
        }

        const encodedName = button.dataset.roomName || container?.dataset.roomName || '';
        const roomName = encodedName ? decodeURIComponent(encodedName) : '';

        joinGroupRoom(roomId, roomName, button);
    });

    if (createInputEl && createButtonEl) {
        createButtonEl.addEventListener('click', () => {
            createGroupRoom(createInputEl.value || '');
        });

        createInputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                createGroupRoom(createInputEl.value || '');
            }
        });
    }
})();
