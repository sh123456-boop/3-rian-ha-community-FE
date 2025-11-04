// 게시물 상세 페이지
// 필요 로직
// 1. path에서 postId 추출하는 메서드
// 2. fetch로 post관련 정보 가져오는 메서드
// 3. post관련 정보를 렌더링 하는 메서드
// 4. 작성자 확인 후 수정/삭제 버튼 표시 메서드
// 5. 게시글 삭제 메서드 
// 6. 게시글 좋아요 메서드 

document.addEventListener('DOMContentLoaded', () => {

    const likeButton = document.getElementById('like-post-btn');
    let isLiked = false; // 현재 사용자의 좋아요 상태를 저장하는 변수


    // 1. path에서 postId 추출하는 메서드
    const getPostIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/');
        return pathParts.pop() || pathParts.pop(); // URL 끝에 '/'가 있어도 안전하게 ID 추출
    };
    const postId = getPostIdFromUrl();

    //  좋아요 버튼의 UI(스타일)를 업데이트하는 함수
    const updateLikeButtonUI = () => {
        const likeText = likeButton.querySelector('.like-text');

        if (isLiked) {
            // 좋아요를 누른 상태
            likeButton.classList.remove('btn-outline-danger');
            likeButton.classList.add('btn-danger'); // 버튼을 채워진 빨간색으로 변경
            likeText.textContent = '좋아요 취소';
        } else {
            // 좋아요를 누르지 않은 상태
            likeButton.classList.remove('btn-danger');
            likeButton.classList.add('btn-outline-danger'); // 버튼을 테두리만 있는 스타일로 변경
            likeText.textContent = '좋아요';
        }
    };
    

    // 3. post관련 정보를 렌더링 하는 메서드
    const renderPostDetails = (post) => {
        // 기본 정보 렌더링
        document.getElementById('post-title').textContent = post.title;
        document.getElementById('author-nickname').textContent = post.nickname;
        document.getElementById('post-updated-at').textContent = new Date(post.updatedAt).toLocaleString('ko-KR');
        document.getElementById('post-content').textContent = post.content;

        // 통계 정보 렌더링
        document.getElementById('view-count').textContent = `👁️ ${post.viewCount}`;
        document.getElementById('like-count').textContent = `❤️ ${post.likeCount}`;
        document.getElementById('comment-count').textContent = `💬 ${post.commentCount}`;

        // 프로필 이미지 렌더링 (없을 경우 기본 이미지)
        const profileImg = document.getElementById('author-profile-image');
        profileImg.src = post.authorProfileImageUrl || '/img/default-profile.png';
        
        // 이미지 캐러셀(슬라이드 쇼) 렌더링
        if (post.images && post.images.length > 0) {
            const carouselContainer = document.getElementById('image-carousel-container');
            const indicatorsContainer = document.getElementById('carousel-indicators');
            const innerContainer = document.getElementById('carousel-inner');
            const prevControl = carouselContainer.querySelector('.carousel-control-prev');
            const nextControl = carouselContainer.querySelector('.carousel-control-next');

            // 이전 내용이 남지 않도록 초기화
            indicatorsContainer.innerHTML = '';
            innerContainer.innerHTML = '';
            indicatorsContainer.style.display = '';

            // DTO의 'order' 순서대로 이미지 정렬
            post.images.sort((a, b) => a.order - b.order);
            const hasMultipleImages = post.images.length > 1;

            post.images.forEach((image, index) => {
                // 하단 점(indicator) 추가
                if (hasMultipleImages) {
                    const indicator = `<button type="button" data-bs-target="#post-image-carousel" data-bs-slide-to="${index}" class="${index === 0 ? 'active' : ''}"></button>`;
                    indicatorsContainer.insertAdjacentHTML('beforeend', indicator);
                }

                // 이미지 슬라이드 추가
                const item = `
                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                        <img src="${image.imageUrl}" class="d-block w-100" alt="게시글 이미지 ${index + 1}">
                    </div>`;
                innerContainer.insertAdjacentHTML('beforeend', item);
            });

            if (!hasMultipleImages) {
                if (prevControl) prevControl.style.display = 'none';
                if (nextControl) nextControl.style.display = 'none';
                indicatorsContainer.style.display = 'none';
            } else {
                if (prevControl) prevControl.style.display = '';
                if (nextControl) nextControl.style.display = '';
                indicatorsContainer.style.display = '';
            }

            carouselContainer.style.display = 'block'; // 이미지가 있을 때만 캐러셀을 보이게 함 
        }

        // [추가된 로직] 서버에서 받은 좋아요 상태를 전역 변수에 저장
            // (PostResponseDto에 'likedByUser' 필드가 추가되었다고 가정)
            isLiked = post.likedByUser || false;
            updateLikeButtonUI(); // 좋아요 상태에 따라 버튼 UI 업데이트
    };

    // 2. fetch로 post관련 정보 가져오는 메서드
    const fetchAndRenderPost = async () => {
        
        if (!postId || isNaN(postId)) {
            alert('유효하지 않은 게시글 ID입니다.');
            window.location.href = '/posts';
            return;
        }

        try {
            const apiUrl = window.buildApiUrl(`/v1/posts/${postId}`);
            
            // customFetch를 사용하여 API 요청
            const response = await customFetch(apiUrl, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('게시물을 불러오는 데 실패했습니다.');
            }

            const ApiResponse = await response.json();
            const post = ApiResponse.data; // PostResponseDto
            renderPostDetails(post); // 데이터로 화면 그리기

            // 작성자 확인 로직 호출 
            // (post 객체에 authorId 필드가 있다고 가정, 실제 필드명에 맞게 수정 필요)
            await setupActionButtons(post.userId);

        } catch (error) {
            console.error('게시물 로딩 중 에러 발생:', error);
            document.getElementById('post-container').innerHTML = 
                `<p class="text-danger text-center p-5">${error.message}</p>`;
        }
    };

    // 4. 작성자 확인 후 수정/삭제 버튼 표시 메서드
    const setupActionButtons = async (postAuthorId) => {
        try {
            // 현재 로그인한 유저 정보를 가져옵니다.
            const userResponse = await customFetch(window.buildApiUrl('/v1/users/me'), { method: 'GET', credentials: 'include' });
            if (!userResponse.ok) return; // 로그인 상태가 아니면 버튼을 보여주지 않음

            const ApiResponse = await userResponse.json();
            const currentUser = ApiResponse.data;

            // 게시글 작성자 ID와 현재 유저 ID를 비교합니다.
            // (currentUser 객체에 userId 필드가 있다고 가정, 실제 필드명에 맞게 수정 필요)
            if (currentUser.userId === postAuthorId) {
                const editBtn = document.getElementById('edit-post-btn');
                const deleteBtn = document.getElementById('delete-post-btn');

                // 수정 버튼: 수정 페이지로 이동하는 링크 설정 및 버튼 보이기
                editBtn.href = `/posts/${postId}/update`; // 수정 페이지 경로
                editBtn.style.display = 'inline-block';

                // 삭제 버튼: 보이기
                deleteBtn.style.display = 'inline-block';

            }
        } catch (error) {
            console.error("작성자 확인 중 오류:", error);
        }
    };

    // 5. 게시글 삭제 메서드 
    const handleDeletePost = async () => {
        
        try {
            const response = await customFetch(window.buildApiUrl(`/v1/posts/${postId}`), {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                alert('게시글이 성공적으로 삭제되었습니다.');
                window.location.href = '/posts'; // 게시글 목록 페이지로 이동
            } else {
                const ApiResponse = await response.json();
                const errorData = ApiResponse.data;
                throw new Error(errorData.message || '게시글 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('게시글 삭제 중 오류:', error);
            alert(error.message);
        }
    };

    
    // 6. 게시글 좋아요 메서드 
    const toggleLikePost = async () => {
        likeButton.disabled = true; // 연속 클릭 방지
        const likeCountElement = document.getElementById('like-count');
        let currentLikes = parseInt(likeCountElement.textContent.split(' ')[1] || '0');

        try {
            // 현재 좋아요 상태에 따라 요청 메서드와 URL 결정
            const method = isLiked ? 'DELETE' : 'POST';
            const response = await customFetch(window.buildApiUrl(`/v1/posts/${postId}/like`), {
                method: method,
                credentials: 'include'
            });

            if (response.ok) {
                if (isLiked) {
                    // 좋아요 취소 성공
                    likeCountElement.textContent = `❤️ ${currentLikes - 1}`;
                } else {
                    // 좋아요 추가 성공
                    likeCountElement.textContent = `❤️ ${currentLikes + 1}`;
                }
                // 좋아요 상태를 반전시킴
                isLiked = !isLiked;
                updateLikeButtonUI(); // 변경된 상태에 맞게 버튼 UI 업데이트

            } else {
                const errorData = await response.json().catch(() => ({ 
                    message: '요청 처리에 실패했습니다. 로그인 상태를 확인해주세요.' 
                }));
                throw new Error(errorData.message);
            }
        } catch (error) {
            console.error('좋아요 처리 중 오류:', error);
            alert(error.message);
        } finally {
            likeButton.disabled = false; // 버튼 다시 활성화
        }
    };

    // --- 스크립트 실행 ---
    fetchAndRenderPost();


    const confirmDeleteButton = document.getElementById('confirm-delete-btn');
    if (confirmDeleteButton) {
        confirmDeleteButton.addEventListener('click', handleDeletePost);
    }

    // [수정된 로직] 좋아요 버튼에 토글 함수 연결
    if (likeButton) {
        likeButton.addEventListener('click', toggleLikePost);
    }

});
