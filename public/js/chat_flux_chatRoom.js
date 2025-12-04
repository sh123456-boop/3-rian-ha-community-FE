 (() => {
      const chatLogEl = document.getElementById('chat-log');
      const emptyStateEl = document.getElementById('chat-log-empty');
      const messageInputEl = document.getElementById('message-input');
      const sendBtn = document.getElementById('send-btn');
      const autoAnswerBtn = document.getElementById('auto-answer-btn');
      const llmAnswerContainer = document.getElementById('llm-answer-container');
      const llmAnswerTextEl = document.getElementById('llm-answer-text');
      const llmAnswerCloseBtn = document.getElementById('llm-answer-close');
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

      const state = {
          roomId,
          messages: [],
          currentUser: null,
          socket: null,
          reconnectAttempts: 0,
          roomName: roomNameParam || '',
          cleanupPromise: null,
          llmAnswer: '',
      };

      function extractMessageText(raw = '') {
          if (typeof raw !== 'string') return '';
          const trimmed = raw.trim();
          const match = trimmed.match(/^[^:]*:\s*(.*)$/); // `[닉네임] : 내용` 또는 `닉네임: 내용`
          if (match && match[1]) return match[1].trim();
          return trimmed;
      }

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

      function formatTimestamp(value) {
          if (!value) return '';
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) return '';
          return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute:'2-digit' });
      }

      function clearEmptyState() {
          if (emptyStateEl) emptyStateEl.remove();
      }

      function scrollToBottom() {
          requestAnimationFrame(() => {
              chatLogEl.scrollTop = chatLogEl.scrollHeight;
          });
      }

      function createMessageMarkup(message) {
          const isSelf = state.currentUser && message.senderId ===state.currentUser.userId;
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
          chatLogEl.insertAdjacentHTML('beforeend',createMessageMarkup(message));
          scrollToBottom();
      }

      function setLlmAnswer(answer) {
          state.llmAnswer = extractMessageText(answer);
          if (!llmAnswerContainer || !llmAnswerTextEl) return;
          if (!state.llmAnswer) {
              llmAnswerContainer.classList.add('d-none');
              llmAnswerTextEl.textContent = '';
              return;
          }
          llmAnswerTextEl.textContent = state.llmAnswer;
          llmAnswerContainer.classList.remove('d-none');
      }

      function clearLlmAnswer() {
          setLlmAnswer('');
      }

      function handleLlmAnswerClick() {
          if (!state.llmAnswer || !messageInputEl) return;
          messageInputEl.value = state.llmAnswer;
          messageInputEl.focus();
          updateSendButtonState();
      }

      async function requestLlmAnswer() {
          if (!autoAnswerBtn) return;
          const originalLabel = autoAnswerBtn.textContent;
          autoAnswerBtn.disabled = true;
          autoAnswerBtn.textContent = '생성 중...';
          try {
              const url = window.buildApiUrl(`/v1/chat/llm?roomId=${encodeURIComponent(roomId)}`);
              const res = await window.customFetch(url, { method: 'POST' });
              if (!res.ok) throw new Error('자동 응답 생성에 실패했습니다.');
              const payload = await res.json();
              const answer = payload?.data?.answer;
              if (!answer) throw new Error('응답이 비어 있습니다.');
              setLlmAnswer(answer);
          } catch (error) {
              console.error('자동 답변 요청 실패:', error);
              alert('자동 답변을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
              setLlmAnswer('');
          } finally {
              autoAnswerBtn.disabled = false;
              autoAnswerBtn.textContent = originalLabel;
          }
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

      function buildWsUrl() {
          const base = window.buildApiUrl('/v1/chat/connect'); // http(s) -> ws(s)
          const token =
              (window.getAccessToken && window.getAccessToken()) ||
              localStorage.getItem('accessToken') ||
              '';
          const url = base.replace(/^http/, 'ws');
          const qp = new URLSearchParams({ roomId });
          if (token) qp.set('access', token); // 헤더 대신 쿼리스트링으로 전송
          return `${url}?${qp.toString()}`;
      }

      function connectSocket() {
          if (state.socket && state.socket.readyState === WebSocket.OPEN) return;

          const socket = new WebSocket(buildWsUrl());
          state.socket = socket;

          socket.onopen = () => {
              socket.send(JSON.stringify({ type: 'subscribe', roomId: Number(roomId) }));
              state.reconnectAttempts = 0;
          };

          socket.onmessage = (event) => {
              try {
                  const body = JSON.parse(event.data);
                  appendMessage(body);
              } catch (err) {
                  console.error('수신 메시지 파싱 실패:', err);
              }
          };

          socket.onclose = (evt) => {
              console.warn('웹소켓 종료', evt);
              state.socket = null;
          };

          socket.onerror = (err) => {
              console.error('웹소켓 오류', err);
          };
      }

      function performSocketDisconnect() {
          if (state.socket) {
              if (state.socket.readyState === WebSocket.OPEN) {
                  state.socket.send(JSON.stringify({ type: 'unsubscribe', roomId: Number(roomId) }));
              }
              state.socket.close();
          }
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

      function updateSendButtonState() {
          if (!sendBtn || !messageInputEl) return;
          const hasText = Boolean(messageInputEl.value.trim());
          sendBtn.disabled = !hasText;
      }

      function sendMessage() {
          const content = messageInputEl.value.trim();
          if (!content) return;

          if (!state.currentUser?.userId) {
              alert('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 이용해주세요.');
              return;
          }

          if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
              alert('서버와 연결되지 않았습니다. 잠시 후 다시 시도해주세요.');
              return;
          }

          const payload = {
              type: 'chat',
              roomId: Number(state.roomId),
              message: content,
              senderId: state.currentUser.userId,
          };

          try {
              state.socket.send(JSON.stringify(payload));
              messageInputEl.value = '';
              clearLlmAnswer();
              updateSendButtonState();
          } catch (error) {
              console.error('메시지 전송 실패:', error);
          }
      }

      function attachEvents() {
          if (sendBtn) sendBtn.addEventListener('click', sendMessage);

          if (autoAnswerBtn) autoAnswerBtn.addEventListener('click', requestLlmAnswer);

          if (llmAnswerContainer) {
              llmAnswerContainer.addEventListener('click', handleLlmAnswerClick);
              llmAnswerContainer.addEventListener('keydown', (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleLlmAnswerClick();
                  }
              });
          }

          if (llmAnswerCloseBtn) {
              llmAnswerCloseBtn.addEventListener('click', (event) => {
                  event.stopPropagation();
                  clearLlmAnswer();
              });
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
                      if (event.isComposing || event.repeat) return;
                      event.preventDefault();
                      sendMessage();
                  }
              });
              messageInputEl.addEventListener('input', handleInput);
              messageInputEl.addEventListener('keyup', handleInput);
              messageInputEl.addEventListener('change', handleInput);
              messageInputEl.addEventListener('paste', () => setTimeout(updateSendButtonState, 0));
              updateSendButtonState();
          }

          const handleTeardown = (event) => {
              const keepalive = event?.type === 'beforeunload';
              console.log('[chat] teardown triggered:', event?.type, { keepalive });
              cleanupRoomConnection({ keepalive });
          };

          window.addEventListener('beforeunload', handleTeardown);
          // window.addEventListener('pagehide', handleTeardown);
      }

      document.addEventListener('DOMContentLoaded', () => {
          (async () => {
              if (window.authReady) {
                  try {
                      await window.authReady;
                  } catch {
                      // ignore
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
