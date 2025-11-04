// 게시글 상세 페이지 - 댓글 기능 (Scroll Event 방식)
// 필요 로직
// 1. 댓글 등록 버튼 클릭시 Fetch로 http post 요청 보내기(댓글 저장)
// 2. fetch로 댓글 데이터 가져오기 (인피니티 스크롤)
// 3. 스크롤 위치에 따라 2번 메서드 호출하기
// 4. 가져온 댓글 데이터 html card로 만들기
// 5. 현재 로그인한 유저 정보 가져오기
// 6. 댓글 작성자와 현재 유저 비교하여 수정/삭제 버튼 표시하기
// 7. fetch로 댓글 삭제하기
// 8. 댓글 수정 버튼 클릭 시 수정 UI로 변경하기
// 9. fetch로 댓글 수정하기

document.addEventListener('DOMContentLoaded', async () => {

    // -----------------------------------------------------------------------------
    // ## 전역 변수 및 DOM 요소 설정
    // -----------------------------------------------------------------------------

    const postId = window.location.pathname.split('/v1/posts/')[1];

    let isLoadingComments = false;
    let hasNextCommentPage = true;
    let lastCommentId = null;

    const commentForm = document.getElementById('comment-form');
    const commentContentInput = document.getElementById('comment-content-input');
    const commentsListContainer = document.getElementById('comments-list-container');
    const commentLoadingSpinner = document.getElementById('comment-loading-spinner');
    const commentValidation = document.getElementById('comment-validation');
    const commentCounter = document.getElementById('comment-counter');
    const commentSubmitBtn = document.getElementById('comment-submit-btn');

    // 유효성 검사 상태
    let isCommentValid = false;
    let isCommentTouched = false;

    // ## 댓글 수정/삭제 관련 변수 및 DOM 요소
    let currentUserId = null; 
    let commentIdToDelete = null; 
    let currentlyEditingCard = null; 
    const confirmCommentDeleteBtn = document.getElementById('confirm-comment-delete-btn');
    const commentDeleteModal = new bootstrap.Modal(document.getElementById('comment-delete-confirm-modal'));
    
    // 스크롤바 유무를 확인하는 헬퍼 함수
    const hasScrollbar = () => {
        return document.documentElement.scrollHeight > document.documentElement.clientHeight;
    };


    // -----------------------------------------------------------------------------
    // ## 핵심 기능 함수 정의
    // -----------------------------------------------------------------------------

    // 유효성 검사 함수들
    const validateComment = (showValidation = true) => {
        const content = commentContentInput.value.trim();
        
        if (!isCommentTouched && !showValidation) {
            return true;
        }

        if (!content) {
            if (showValidation) {
                showError('댓글 내용을 입력해주세요.');
            }
            isCommentValid = false;
            updateSubmitButton();
            return false;
        }

        if (content.length > 1000) {
            if (showValidation) {
                showError('댓글은 1000자를 초과할 수 없습니다.');
                commentContentInput.value = content.slice(0, 1000);
            }
            isCommentValid = false;
            updateSubmitButton();
            return false;
        }

        if (showValidation) {
            hideMessage();
        }
        isCommentValid = true;
        updateSubmitButton();
        return true;
    };

    const showError = (message) => {
        commentValidation.textContent = message;
        commentValidation.style.display = 'block';
        commentValidation.style.color = 'red';
        commentContentInput.classList.add('input-error');
        commentContentInput.classList.remove('input-success');
    };

    const hideMessage = () => {
        commentValidation.style.display = 'none';
        commentContentInput.classList.remove('input-error');
        commentContentInput.classList.add('input-success');
    };

    const updateSubmitButton = () => {
        commentSubmitBtn.disabled = !isCommentValid;
        if (!isCommentValid) {
            commentSubmitBtn.classList.remove('btn-outline-primary');
            commentSubmitBtn.classList.add('btn-secondary');
        } else {
            commentSubmitBtn.classList.remove('btn-secondary');
            commentSubmitBtn.classList.add('btn-outline-primary');
        }
    };

    const updateCommentCounter = () => {
        const length = commentContentInput.value.length;
        commentCounter.textContent = `${length}/1000자`;
        if (length > 1000) {
            commentCounter.style.color = 'red';
        } else {
            commentCounter.style.color = '';
        }
    };

    // 1. 댓글 등록 버튼 클릭시 Fetch로 http post 요청 보내기(댓글 저장)
    const handleCommentSubmit = async (event) => {
        event.preventDefault();
        const content = commentContentInput.value.trim();
        
        if (!validateComment()) {
            return;
        }
        try {
            const response = await customFetch(window.buildApiUrl(`/v1/posts/${postId}/comments`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contents: content })
            });
            if (!response.ok) throw new Error('댓글 등록에 실패했습니다.');
            commentContentInput.value = '';
            commentsListContainer.innerHTML = '';
            lastCommentId = null;
            hasNextCommentPage = true;
            await fetchAndRenderComments();
            while (hasNextCommentPage && !hasScrollbar() && !isLoadingComments) {
                await fetchAndRenderComments();
            }
        } catch (error) {
            console.error(error);
            alert('댓글 등록 중 오류가 발생했습니다.');
        }
    };

    // 2. fetch로 댓글 데이터 가져오기 (인피니티 스크롤)
    const fetchAndRenderComments = async () => {
        if (isLoadingComments || !hasNextCommentPage) return;
        isLoadingComments = true;
        commentLoadingSpinner.style.display = 'block';
        try {
            let apiUrl = window.buildApiUrl(`/v1/posts/${postId}/comments`);
            if (lastCommentId) apiUrl += `?lastCommentId=${lastCommentId}`;
            const response = await customFetch(apiUrl, { method: 'GET', credentials: 'include' });
            if (!response.ok) throw new Error('댓글을 불러오는 데 실패했습니다.');
            const responseApi = await response.json();
            const responseData = responseApi.data;
            const { comments, hasNext } = responseData;
            hasNextCommentPage = hasNext;
            if (comments.length > 0) {
                comments.forEach(comment => {
                    const commentHtml = createCommentCard(comment, currentUserId);
                    commentsListContainer.insertAdjacentHTML('beforeend', commentHtml);
                });
                lastCommentId = comments[comments.length - 1].id;
            }
            if (!hasNextCommentPage) {
                commentLoadingSpinner.innerHTML = '<div class="empty-state">마지막 댓글입니다.</div>';
            }
        } catch (error) {
            console.error(error);
            commentLoadingSpinner.innerHTML = '<div class="error-state">댓글을 불러오는 중 오류가 발생했습니다.</div>';
            hasNextCommentPage = false;
        } finally {
            isLoadingComments = false;
            if (hasNextCommentPage) commentLoadingSpinner.style.display = 'none';
        }
    };

    // 4. 가져온 댓글 데이터 html card로 만들기
    const createCommentCard = (comment, currentUserId) => {
        const formattedDate = new Date(comment.createdAt).toLocaleString('ko-KR');
        const isAuthor = currentUserId === comment.userId;
        // 6. 댓글 작성자와 현재 유저 비교하여 수정/삭제 버튼 표시하기
        const actionsButtons = isAuthor ? `
            <button class="btn btn-sm btn-outline-secondary comment-edit-btn" data-comment-id="${comment.id}">수정</button>
            <button class="btn btn-sm btn-outline-danger comment-delete-btn" data-comment-id="${comment.id}">삭제</button>
        ` : '';
        return `
            <div class="card comment-card" data-comment-id="${comment.id}">
                <div class="card-body p-0">
                    <div class="comment-header">
                        <div class="comment-author">
                            <img src="${comment.authorProfileImageUrl || '/img/default-profile.png'}" class="rounded-circle" width="36" height="36" alt="댓글 작성자">
                            <span class="name">${comment.authorNickname}</span>
                        </div>
                        <div class="comment-actions">
                           ${actionsButtons}
                        </div>
                    </div>
                    <p class="card-text comment-body">${comment.contents}</p>
                    <div class="comment-footer">${formattedDate}</div>
                </div>
            </div>
        `;
    };

    // 5. 현재 로그인한 유저 정보 가져오기
    const fetchCurrentUser = async () => {
        try {
            const response = await customFetch(window.buildApiUrl('/v1/users/me'), { method: 'GET', credentials: 'include' });
            if (response.ok) {
                const responseApi = await response.json();
                const user = responseApi.data;
                currentUserId = user.userId;
            } else {
                currentUserId = null;
            }
        } catch (error) {
            console.error("사용자 정보를 가져오는 중 오류 발생:", error);
            currentUserId = null;
        }
    };

    // 8. fetch로 댓글 삭제하기
    const handleConfirmDelete = async () => {
        if (!commentIdToDelete) return;
        try {
            const response = await customFetch(window.buildApiUrl(`/v1/comments/${commentIdToDelete}`), {
                method: 'DELETE',
                credentials: 'include'
            });
            if (response.ok) {
                document.querySelector(`.card[data-comment-id="${commentIdToDelete}"]`).remove();
                alert('댓글이 성공적으로 삭제되었습니다.');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || '댓글 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('댓글 삭제 중 오류:', error);
            alert(error.message);
        } finally {
            commentIdToDelete = null;
            commentDeleteModal.hide();
        }
    };
    
    // 9. 댓글 수정 버튼 클릭 시 수정 UI로 변경하기
    const switchToEditMode = (editButton) => {
        if (currentlyEditingCard) {
            cancelEditMode();
        }
        const commentCard = editButton.closest('.card');
        currentlyEditingCard = commentCard;
        const contentP = commentCard.querySelector('.card-text');
        const actionsDiv = commentCard.querySelector('.comment-actions');
        const originalContent = contentP.textContent;
        const editFormHtml = `
            <div class="comment-edit-form mt-3">
                <textarea class="form-control mb-2 comment-edit-textarea" rows="3">${originalContent}</textarea>
                <div id="edit-comment-validation" class="validation-message" style="display: none;"></div>
                <div id="edit-comment-counter" class="text-muted small mb-2">${originalContent.length}/1000자</div>
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-outline-secondary comment-cancel-btn">취소</button>
                    <button class="btn btn-sm btn-primary comment-save-btn">저장</button>
                </div>
            </div>
        `;
        contentP.style.display = 'none';
        actionsDiv.style.display = 'none';
        contentP.insertAdjacentHTML('afterend', editFormHtml);
    };

    const cancelEditMode = () => {
        if (!currentlyEditingCard) return;
        const contentP = currentlyEditingCard.querySelector('.card-text');
        const actionsDiv = currentlyEditingCard.querySelector('.comment-actions');
        const editForm = currentlyEditingCard.querySelector('.comment-edit-form');
        if (editForm) editForm.remove();
        contentP.style.display = 'block';
        actionsDiv.style.display = 'block';
        currentlyEditingCard = null;
    };

    // 수정 중인 댓글 유효성 검사
    const validateEditingComment = (textarea, validationDiv) => {
        const content = textarea.value.trim();
        
        if (!content) {
            showEditError(validationDiv, '댓글 내용을 입력해주세요.', textarea);
            return false;
        }

        if (content.length > 1000) {
            showEditError(validationDiv, '댓글은 1000자를 초과할 수 없습니다.', textarea);
            textarea.value = content.slice(0, 1000);
            return false;
        }

        hideEditMessage(validationDiv, textarea);
        return true;
    };

    const showEditError = (validationDiv, message, textarea) => {
        validationDiv.textContent = message;
        validationDiv.style.display = 'block';
        validationDiv.style.color = 'red';
        textarea.classList.add('input-error');
        textarea.classList.remove('input-success');
    };

    const hideEditMessage = (validationDiv, textarea) => {
        validationDiv.style.display = 'none';
        textarea.classList.remove('input-error');
        textarea.classList.add('input-success');
    };

    const updateEditCounter = (textarea, counterDiv) => {
        const length = textarea.value.length;
        counterDiv.textContent = `${length}/1000자`;
        if (length > 1000) {
            counterDiv.style.color = 'red';
        } else {
            counterDiv.style.color = '';
        }
    };

    // 10. fetch로 댓글 수정하기
    const handleConfirmUpdate = async (saveButton) => {
        const commentCard = saveButton.closest('.card');
        const commentId = commentCard.dataset.commentId;
        const textarea = commentCard.querySelector('.comment-edit-textarea');
        const validationDiv = commentCard.querySelector('#edit-comment-validation');
        const newContent = textarea.value.trim();
        
        if (!validateEditingComment(textarea, validationDiv)) {
            return;
        }
        try {
            const response = await customFetch(window.buildApiUrl(`/v1/comments/${commentId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ contents: newContent })
            });
            if (response.ok) {
                commentCard.querySelector('.card-text').textContent = newContent;
                cancelEditMode();
                alert('댓글이 성공적으로 수정되었습니다.');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || '댓글 수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('댓글 수정 중 오류:', error);
            alert(error.message);
        }
    };

    // -----------------------------------------------------------------------------
    // ## 이벤트 리스너 연결 및 초기화
    // -----------------------------------------------------------------------------

    commentForm.addEventListener('submit', handleCommentSubmit);

    // 댓글 입력 이벤트 리스너
    commentContentInput.addEventListener('blur', () => {
        isCommentTouched = true;
        validateComment(true);
    });

    commentContentInput.addEventListener('focus', () => {
        if (!isCommentTouched) {
            commentValidation.style.display = 'none';
            return;
        }
        validateComment(true);
    });

    commentContentInput.addEventListener('input', () => {
        if (!isCommentTouched) isCommentTouched = true;
        const text = commentContentInput.value;
        if (text.length > 1000) {
            commentContentInput.value = text.slice(0, 1000);
        }
        updateCommentCounter();
        validateComment(true);
    });

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
            fetchAndRenderComments();
        }
    });

    // 삭제 모달의 '삭제' 버튼 이벤트
    if (confirmCommentDeleteBtn) {
        confirmCommentDeleteBtn.addEventListener('click', handleConfirmDelete);
    }
    
    /**
     * 이벤트 위임을 사용하여 댓글 목록 내의 모든 버튼 클릭을 처리
     */
    commentsListContainer.addEventListener('click', (event) => {
        const target = event.target;
        
        // 삭제 버튼 클릭 시
        if (target.classList.contains('comment-delete-btn')) {
            const commentId = target.dataset.commentId;
            if (commentId) {
                commentIdToDelete = commentId; // 삭제할 ID 저장
                commentDeleteModal.show(); // 모달 띄우기
            }
        }
        
        // 수정 버튼 클릭 시
        if (target.classList.contains('comment-edit-btn')) {
            switchToEditMode(target);
        }
        
        // (수정 중) 취소 버튼 클릭 시
        if (target.classList.contains('comment-cancel-btn')) {
            cancelEditMode();
        }

        // (수정 중) 저장 버튼 클릭 시
        if (target.classList.contains('comment-save-btn')) {
            handleConfirmUpdate(target);
        }
    });

    // 수정 중인 댓글 textarea 이벤트 리스너 (이벤트 위임)
    commentsListContainer.addEventListener('input', (event) => {
        if (event.target.classList.contains('comment-edit-textarea')) {
            const textarea = event.target;
            const commentCard = textarea.closest('.card');
            const validationDiv = commentCard.querySelector('#edit-comment-validation');
            const counterDiv = commentCard.querySelector('#edit-comment-counter');
            
            const text = textarea.value;
            if (text.length > 1000) {
                textarea.value = text.slice(0, 1000);
            }
            
            updateEditCounter(textarea, counterDiv);
            validateEditingComment(textarea, validationDiv);
        }
    });

    // 페이지 첫 로드 시 실행 로직
    await fetchCurrentUser();
    await fetchAndRenderComments();
    while (hasNextCommentPage && !hasScrollbar() && !isLoadingComments) {
        console.log("댓글 영역이 화면을 채우지 못해 추가 데이터를 로드합니다.");
        await fetchAndRenderComments();
    }
});
