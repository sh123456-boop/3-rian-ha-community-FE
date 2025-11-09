// function 정의


(() => {
    const roomListEl = document.getElementById('my-room-list');
    const paginationEl = document.getElementById('my-room-pagination');
    const searchInputEl = document.getElementById('my-room-search');
    const filterTabs = document.querySelectorAll('[data-room-filter]');

    if (!roomListEl || !paginationEl) return;

    const PAGE_SIZE = 5;
    const state = {
        allRooms: [],
        filteredRooms: [],
        currentPage: 0,
        isLoading: false,
        viewFilter: 'group', // group | private
    };

    // 채팅방 렌더링
    function buildRoomItems(list, { showExit }) {
        if (!list.length) {
            return `
                <div class="text-center py-4 text-muted w-100">
                    표시할 채팅방이 없습니다.
                </div>
            `;
        }

        return list.map((room) => {
            const name = room.roomName ?? '이름 없는 채팅방';
            const encodedName = encodeURIComponent(name);
            const unread = Number(room.unReadCount) || 0;
            const badge = unread > 0 ? `<span class="unread-badge">${unread}</span>` : '';
            const exitButton = showExit && room.isGroupChat ? `
                <button class="btn btn-outline-danger btn-exit" data-room-id="${room.roomId}">
                    나가기
                </button>
            ` : '';
            const badgeLabel = room.isGroupChat ? '<span class="badge bg-light text-primary ms-2">그룹</span>' : '';
            return `
                <div class="list-group-item d-flex align-items-center justify-content-between flex-wrap gap-3" data-room-id="${room.roomId}">
                    <div>
                        <div class="d-flex align-items-center gap-3 flex-wrap">
                            <div class="fw-semibold">${name}${badgeLabel}</div>
                            ${badge}
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-wrap">
                        <a href="/chat/chatRoom?roomId=${room.roomId}&roomName=${encodedName}" class="btn btn-outline-primary btn-enter">
                            <i class="bi bi-arrow-right-circle me-1"></i> 채팅방 입장
                        </a>
                        ${exitButton}
                    </div>
                </div>
            `;
        }).join('');
    }


    // 그룹 채팅/개인 채팅 필터 적용
    function applyViewFilter(list) {
        if (state.viewFilter === 'group') {
            return list.filter((room) => room.isGroupChat);
        }
        return list.filter((room) => !room.isGroupChat);
    }

    // 채팅방 렌더링
    function renderRooms(list) {
        const html = buildRoomItems(list, {
            showExit: state.viewFilter !== 'private',
        });
        roomListEl.innerHTML = html;
    }

    // 페이지네이션 UI 갱신
    function renderPagination(totalPages) {
        const current = state.currentPage;
        const items = [];

        items.push(`
            <li class="page-item ${current === 0 ? 'disabled' : ''}">
                <button class="page-link" data-page="${current - 1}" ${current === 0 ? 'tabindex="-1" aria-disabled="true"' : ''}>이전</button>
            </li>
        `);

        for (let i = 0; i < totalPages; i += 1) {
            items.push(`
                <li class="page-item ${i === current ? 'active' : ''}">
                    <button class="page-link" data-page="${i}">${i + 1}</button>
                </li>
            `);
        }

        items.push(`
            <li class="page-item ${current >= totalPages - 1 ? 'disabled' : ''}">
                <button class="page-link" data-page="${current + 1}" ${current >= totalPages - 1 ? 'tabindex="-1" aria-disabled="true"' : ''}>다음</button>
            </li>
        `);

        paginationEl.innerHTML = items.join('');
    }

    // 현재 페이지에 해당하는 채팅방 목록을 반환
    function getCurrentPageRooms() {
        const filtered = applyViewFilter(state.filteredRooms);
        const start = state.currentPage * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }

    // 검색 적용
    function applySearch(keyword) {
        if (!keyword) {
            state.filteredRooms = [...state.allRooms];
        } else {
            const lower = keyword.toLowerCase();
            state.filteredRooms = state.allRooms.filter((room) => {
                return (room.roomName || '').toLowerCase().includes(lower);
            });
        }
        state.currentPage = 0;
        updateView();
    }

    // 뷰 업데이트
    function updateView() {
        const totalPages = Math.max(Math.ceil(applyViewFilter(state.filteredRooms).length / PAGE_SIZE), 1);
        const safePage = Math.min(state.currentPage, totalPages - 1);
        state.currentPage = Math.max(safePage, 0);

        renderRooms(getCurrentPageRooms());
        renderPagination(totalPages);
    }

    // 내 채팅방 목록 호출 API
    async function fetchMyRooms() {
        if (state.isLoading) return;
        state.isLoading = true;
        const spinner = `
            <div class="text-center py-5 w-100">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        roomListEl.innerHTML = spinner;

        try {
            const url = window.buildApiUrl('/v1/chat/my/rooms');
            const res = await window.customFetch(url, { method: 'GET' });
            if (!res.ok) throw new Error('내 채팅방을 불러오지 못했습니다.');

            const payload = await res.json();
            const rooms = Array.isArray(payload?.data) ? payload.data : [];

            state.allRooms = rooms;
            state.filteredRooms = [...rooms];
            state.currentPage = 0;

            updateView();
        } catch (error) {
            console.error(error);
            const errorMsg = `
                <div class="text-center py-5 text-danger w-100">
                    채팅방 목록을 불러오는 중 문제가 발생했습니다.
                </div>
            `;
            roomListEl.innerHTML = errorMsg;
            paginationEl.innerHTML = '';
        } finally {
            state.isLoading = false;
        }
    }

    // 채팅방 나가기 API
    async function leaveRoom(roomId) {
        if (!roomId) return;
        const confirmed = window.confirm('채팅방에서 나가시겠습니까?');
        if (!confirmed) return;

        try {
            const url = window.buildApiUrl(`/v1/chat/room/group/${roomId}/leave`);
            const res = await window.customFetch(url, { method: 'DELETE' });
            if (!res.ok) throw new Error('채팅방 나가기에 실패했습니다.');

            state.allRooms = state.allRooms.filter((room) => room.roomId !== roomId);
            state.filteredRooms = state.filteredRooms.filter((room) => room.roomId !== roomId);
            updateView();
        } catch (error) {
            console.error(error);
            alert('채팅방을 나가는 중 문제가 발생했습니다.');
        }
    }

    paginationEl.addEventListener('click', (event) => {
        const target = event.target.closest('.page-link');
        if (!target) return;

        const page = Number(target.dataset.page);
        if (Number.isNaN(page)) return;

        const totalPages = Math.ceil(applyViewFilter(state.filteredRooms).length / PAGE_SIZE);
        if (page < 0 || page >= totalPages) return;

        state.currentPage = page;
        updateView();
    });

    roomListEl.addEventListener('click', (event) => {
        const exitBtn = event.target.closest('.btn-exit');
        if (!exitBtn) return;

        const roomId = Number(exitBtn.dataset.roomId);
        if (!roomId) return;

        leaveRoom(roomId);
    });

    if (searchInputEl) {
        searchInputEl.addEventListener('input', (event) => {
            applySearch(event.target.value.trim());
        });
    }

    if (filterTabs.length) {
        filterTabs.forEach((btn) => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.roomFilter;
                if (!target || state.viewFilter === target) return;

                filterTabs.forEach((b) => b.classList.toggle('active', b === btn));
                state.viewFilter = target;
                state.currentPage = 0;
                updateView();
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        (async () => {
            if (window.authReady) {
                try {
                    await window.authReady;
                } catch {
                    // ignore - auth middleware will redirect if needed
                }
            }
            fetchMyRooms();
        })();
    });
})();
