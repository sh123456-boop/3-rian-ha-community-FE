(() => {
    const chatLogEl = document.getElementById('chat-log');
    const emptyStateEl = document.getElementById('chat-log-empty');
    const messageInputEl = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const goMyChatListBtn = document.getElementById('my-chat-list-btn');
    const roomNameEl = document.getElementById('chat-room-name');

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('roomId');
    const roomNameParam = params.get('roomName');

    if (!chatLogEl || !roomId) {
        alert('채팅방 정보를 확인할 수 없습니다.');
        window.location.href = '/chat/myChatList';
        return;
    }

    const SUBSCRIBE_DESTINATION = `/v1/topic/${roomId}`;
    const PUBLISH_DESTINATION = `/v1/publish/${roomId}`;

    const state = {
        roomId,
        messages: [],
        currentUser: null,
        stompClient: null,
        socket: null,
        reconnectAttempts: 0,
        roomName: roomNameParam || '',
        subscription: null,
        cleanupPromise: null,
    };

    if (roomNameEl && state.roomName) {
        roomNameEl.textContent = state.roomName;
    }

    function escapeHtml(text = '') {
        return text.replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[ch] || ch));
    }

    // 시간 포맷팅
    function formatTimestamp(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
    }

    // 빈 상태 제거
    function clearEmptyState() {
        if (emptyStateEl) {
            emptyStateEl.remove();
        }
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatLogEl.scrollTop = chatLogEl.scrollHeight;
        });
    }

    // 메시지 마크업 생성
    function createMessageMarkup(message) {
        const isSelf = state.currentUser && message.senderId === state.currentUser.userId;
        const nickname = message.nickName || message.nickname || `사용자 ${message.senderId ?? ''}`;
        const senderLabel = isSelf ? '나' : nickname;
        const meta = formatTimestamp(message.createdAt || Date.now());
        const content = escapeHtml(message.message || '');
        return `
            <div class="message-group${isSelf ? ' self' : ''}">
                <div class="message-sender">${escapeHtml(senderLabel)}</div>
                <div class="message-bubble">${content}</div>
                <div class="message-meta">${meta}</div>
            </div>
        `;
    }

    // 메시지 렌더링
    function renderMessages(messages) {
        clearEmptyState();
        chatLogEl.innerHTML = messages.map(createMessageMarkup).join('') || `
            <div class="text-center text-muted py-4">
                아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </div>
        `;
        scrollToBottom();
    }

    // 메시지 추가
    function appendMessage(message) {
        clearEmptyState();
        state.messages.push(message);
        chatLogEl.insertAdjacentHTML('beforeend', createMessageMarkup(message));
        scrollToBottom();
    }


    // 현재 사용자 정보 호출 API
    async function fetchCurrentUser() {
        try {
            const res = await window.customFetch(window.buildApiUrl('/v1/users/me'), { method: 'GET' });
            if (!res.ok) throw new Error('사용자 정보를 불러올 수 없습니다.');
            const payload = await res.json();
            state.currentUser = payload?.data || null;
        } catch (error) {
            console.error('사용자 정보 로딩 실패:', error);
        }
    }

    // 채팅 기록 호출 API
    async function fetchChatHistory() {
        try {
            const res = await window.customFetch(window.buildApiUrl(`/v1/chat/history/${roomId}`), { method: 'GET' });
            if (!res.ok) throw new Error('채팅 기록을 불러오지 못했습니다.');
            const payload = await res.json();
            const messages = Array.isArray(payload?.data) ? payload.data : [];
            state.messages = messages;
            renderMessages(state.messages);
        } catch (error) {
            console.error(error);
            chatLogEl.innerHTML = `
                <div class="text-center text-danger py-4">
                    채팅 기록을 불러오는 중 문제가 발생했습니다.
                </div>
            `;
        }
    }

    // 웹소켓 연결
    function connectSocket() {
        if (state.stompClient?.connected) return;

        const socket = new SockJS(window.buildApiUrl('/v1/connect'), null, {
            withCredentials: true,
            transportOptions: {
                xhrPolling: { withCredentials: true },
                xhrStreaming: { withCredentials: true },
            },
        });
        const stompClient = Stomp.over(socket);
        stompClient.debug = null;
        socket.onclose = (event) => {
            console.warn('SockJS connection closed', {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean,
            });
        };
        stompClient.onStompError = (frame) => {
            console.error('STOMP error from server:', frame.headers?.message || 'Unknown error', frame.body);
        };
        stompClient.onWebSocketClose = (evt) => {
            console.warn('STOMP websocket closed', evt);
        };

        const headers = { ...getAccessHeader() };

        
        stompClient.connect(headers, () => {
            state.socket = socket;
            state.stompClient = stompClient;
            state.reconnectAttempts = 0;

            state.subscription = stompClient.subscribe(SUBSCRIBE_DESTINATION, (frame) => {
                try {
                    const body = JSON.parse(frame.body);
                    appendMessage(body);
                } catch (err) {
                    console.error('수신 메시지 파싱 실패:', err);
                }
            }, getAccessHeader());
        }, (error) => {
            console.error('웹소켓 연결 오류:', error);
        });
    }

    function performSocketDisconnect() {
        if (state.subscription) {
            try {
                state.subscription.unsubscribe({ destination: SUBSCRIBE_DESTINATION, ...getAccessHeader() });
            } catch (error) {
                console.error('구독 해제 실패:', error);
            } finally {
                state.subscription = null;
            }
        }

        if (state.stompClient && state.stompClient.connected) {
            state.stompClient.disconnect();
        }
        if (state.socket) {
            state.socket.close();
        }
        state.stompClient = null;
        state.socket = null;
    }

    async function markMessagesRead({ keepalive = false } = {}) {
        if (!state.roomId) return;
        try {
            const res = await window.customFetch(
                window.buildApiUrl(`/v1/chat/room/${state.roomId}/read`),
                { method: 'POST', keepalive }
            );
            if (!res.ok) throw new Error('메시지 읽음 처리 실패');
        } catch (error) {
            console.error('메시지 읽음 처리 중 오류:', error);
        }
    }

    function cleanupRoomConnection({ keepalive = false } = {}) {
        if (state.cleanupPromise) return state.cleanupPromise;

        state.cleanupPromise = (async () => {
            await markMessagesRead({ keepalive });
            performSocketDisconnect();
        })().finally(() => {
            state.cleanupPromise = null;
        });

        return state.cleanupPromise;
    }


    // 전송 버튼 상태 업데이트
    function updateSendButtonState() {
        if (!sendBtn || !messageInputEl) return;
        const hasText = Boolean(messageInputEl.value.trim());
        sendBtn.disabled = !hasText;
    }

    // 메시지 전송
    function sendMessage() {
        const content = messageInputEl.value.trim();
        if (!content) return;

        if (!state.currentUser?.userId) {
            alert('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 이용해주세요.');
            return;
        }

        if (!state.stompClient || !state.stompClient.connected) {
            alert('서버와 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        const payload = {
            roomId: Number(state.roomId),
            message: content,
            senderId: state.currentUser.userId,
        };

        try {
            state.stompClient.send(PUBLISH_DESTINATION, getAccessHeader(), JSON.stringify(payload));
            messageInputEl.value = '';
            updateSendButtonState();
        } catch (error) {
            console.error('메시지 전송 실패:', error);
        }
    }

    function attachEvents() {
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        if (goMyChatListBtn) {
            goMyChatListBtn.addEventListener('click', () => {
                window.location.href = '/chat/myChatList';
            });
        }

        if (messageInputEl) {
            const handleInput = () => updateSendButtonState();
            messageInputEl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    if (event.isComposing || event.repeat) return; // avoid duplicate sends from IME/repeat
                    event.preventDefault();
                    sendMessage();
                }
            });
            messageInputEl.addEventListener('input', handleInput);
            messageInputEl.addEventListener('keyup', handleInput);
            messageInputEl.addEventListener('change', handleInput);
            messageInputEl.addEventListener('paste', () => {
                setTimeout(updateSendButtonState, 0);
            });
            updateSendButtonState();
        }

        const handleTeardown = (event) => {
            const keepalive = event?.type === 'beforeunload';
            console.log('[chat] teardown triggered:', event?.type, { keepalive });
            cleanupRoomConnection({ keepalive });
        };

        window.addEventListener('beforeunload', handleTeardown);
       //window.addEventListener('pagehide', handleTeardown);
    }

    document.addEventListener('DOMContentLoaded', () => {
        (async () => {
            if (window.authReady) {
                try {
                    await window.authReady;
                } catch {
                    // ignore; protected routes will handle redirect
                }
            }
            attachEvents();
            try {
                await fetchCurrentUser();
                await fetchChatHistory();
                connectSocket();
            } catch (error) {
                console.error('채팅방 초기화 실패:', error);
            }
        })();
    });
})();
    function getAccessHeader() {
        const token = window.getAccessToken && window.getAccessToken();
        return token ? { access: token } : {};
    }
