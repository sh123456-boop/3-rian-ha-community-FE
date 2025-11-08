(() => {
    const chatLogEl = document.getElementById('chat-log');
    const emptyStateEl = document.getElementById('chat-log-empty');
    const messageInputEl = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const roomNameEl = document.getElementById('chat-room-name');

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('roomId');

    if (!chatLogEl || !roomId) {
        alert('채팅방 정보를 확인할 수 없습니다.');
        window.location.href = '/chat/myChatList';
        return;
    }

    const SUBSCRIBE_DESTINATION = window.buildApiUrl(`/v1/topic/${roomId}`);
    const PUBLISH_DESTINATION = window.buildApiUrl(`/v1/publish/${roomId}`);

    const state = {
        roomId,
        messages: [],
        currentUser: null,
        stompClient: null,
        socket: null,
        reconnectAttempts: 0,
    };

    function escapeHtml(text = '') {
        return text.replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[ch] || ch));
    }

    function formatTimestamp(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
    }

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

    function createMessageMarkup(message) {
        const isSelf = state.currentUser && message.senderId === state.currentUser.userId;
        const nickname = message.nickName || message.nickname || `사용자 ${message.senderId ?? ''}`;
        const senderLabel = isSelf ? '나' : nickname;
        const meta = formatTimestamp(message.createdAt);
        const content = escapeHtml(message.message || '');
        return `
            <div class="message-group${isSelf ? ' self' : ''}">
                <div class="message-sender">${escapeHtml(senderLabel)}</div>
                <div class="message-bubble">${content}</div>
                <div class="message-meta">${meta}</div>
            </div>
        `;
    }

    function renderMessages(messages) {
        clearEmptyState();
        chatLogEl.innerHTML = messages.map(createMessageMarkup).join('') || `
            <div class="text-center text-muted py-4">
                아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </div>
        `;
        scrollToBottom();
    }

    function appendMessage(message) {
        clearEmptyState();
        state.messages.push(message);
        chatLogEl.insertAdjacentHTML('beforeend', createMessageMarkup(message));
        scrollToBottom();
    }

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

    function scheduleReconnect() {
        const maxAttempts = 5;
        if (state.reconnectAttempts >= maxAttempts) {
            console.error('웹소켓 재연결에 실패했습니다.');
            return;
        }
        const delay = Math.min(1000 * 2 ** state.reconnectAttempts, 10000);
        state.reconnectAttempts += 1;
        setTimeout(connectSocket, delay);
    }

    function connectSocket() {
        if (state.stompClient?.connected) return;

        const socket = new SockJS(window.buildApiUrl('/v1/connect'));
        const stompClient = Stomp.over(socket);
        stompClient.debug = null;

        const headers = {};
        const accessToken = window.getAccessToken && window.getAccessToken();
        if (accessToken) headers.access = accessToken;

        stompClient.connect(headers, () => {
            state.socket = socket;
            state.stompClient = stompClient;
            state.reconnectAttempts = 0;

            stompClient.subscribe(SUBSCRIBE_DESTINATION, (frame) => {
                try {
                    const body = JSON.parse(frame.body);
                    appendMessage(body);
                } catch (err) {
                    console.error('수신 메시지 파싱 실패:', err);
                }
            });
        }, (error) => {
            console.error('웹소켓 연결 오류:', error);
            scheduleReconnect();
        });
    }

    function disconnectSocket() {
        if (state.stompClient && state.stompClient.connected) {
            state.stompClient.disconnect();
        }
        if (state.socket) {
            state.socket.close();
        }
        state.stompClient = null;
        state.socket = null;
    }

    function updateSendButtonState() {
        if (!sendBtn || !messageInputEl) return;
        const hasText = Boolean(messageInputEl.value.trim());
        sendBtn.disabled = !hasText;
    }

    function sendMessage() {
        const content = messageInputEl.value.trim();
        if (!content) return;

        if (!state.stompClient || !state.stompClient.connected) {
            alert('서버와 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        const payload = {
            roomId: Number(state.roomId),
            message: content,
        };

        try {
            state.stompClient.send(PUBLISH_DESTINATION, {}, JSON.stringify(payload));
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

        if (messageInputEl) {
            const handleInput = () => updateSendButtonState();
            messageInputEl.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
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

        window.addEventListener('beforeunload', () => {
            disconnectSocket();
        });
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
            await fetchCurrentUser();
            await fetchChatHistory();
            connectSocket();
            attachEvents();
        })();
    });
})();
