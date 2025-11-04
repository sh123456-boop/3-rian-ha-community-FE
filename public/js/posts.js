// 인피니티 스크롤 post 메인 페이지
// 필요 로직
// 1. fetch로 post에 대한 정보를 가져오는 메서드
// 2. 가져온 post를 html(카드형태)로 변환해주는 메서드
// 3. 스크롤 위치에 따라 1번 메서드를 호출하는 메서드

// DOM 

let isLoading = false;
let hasNextPage = true;
let currentSortMode = 'latest'; // 'latest' 또는 'popular' 상태를 저장할 변수

//  페이지네이션을 위한 변수들
let lastPostId = null;
let lastViewCount = null; 

const postsContainer = document.getElementById('posts-container');
const loadingSpinner = document.getElementById('loading-spinner');
// 새로 추가된 버튼 요소
const latestBtn = document.getElementById('latest-btn');
const popularBtn = document.getElementById('popular-btn');


// -----------------------------------------------------------------------------
// ## 핵심 기능 함수 정의
// -----------------------------------------------------------------------------

// 스크롤바가 있는지 확인하는 함수 
const hasScrollbar = () => {
    return document.documentElement.scrollHeight > document.documentElement.clientHeight;
};


// 1. fetch로 post에 대한 정보를 가져오는 메서드 (기존 fetchPosts를 리팩토링)
const fetchAndRenderPosts = async () => {
    if (isLoading || !hasNextPage) return;

    isLoading = true;
    loadingSpinner.style.display = 'block';

    try {
        let apiUrl;
        //  현재 정렬 모드(currentSortMode)에 따라 API URL과 파라미터를 동적으로 생성
        if (currentSortMode === 'latest') {
            apiUrl = window.buildApiUrl('/v1/posts');
            if (lastPostId) {
                apiUrl += `?lastPostId=${lastPostId}`;
            }
        } else { // 'popular' 모드
            apiUrl = window.buildApiUrl('/v1/posts/popular');
            if (lastPostId && lastViewCount !== null) {
                apiUrl += `?lastViewCount=${lastViewCount}&lastPostId=${lastPostId}`;
            }
        }
        
        const response = await customFetch(apiUrl, { method: 'GET', credentials: "include" });
        if (!response.ok) throw new Error('데이터를 불러오는 데 실패했습니다.');

        const ApiResponse = await response.json();
        const responseData = ApiResponse.data;
        const posts = responseData.posts;
        hasNextPage = responseData.hasNext;

        if (posts.length > 0) {
            posts.forEach(post => {
                const postCardHtml = createPostCard(post);
                postsContainer.insertAdjacentHTML('beforeend', postCardHtml);
            });
            
            //  마지막 게시물의 정보를 다음 요청을 위해 저장
            const lastPost = posts[posts.length - 1];
            lastPostId = lastPost.postId;
            if (currentSortMode === 'popular') {
                lastViewCount = lastPost.viewCount; // 인기순일 때는 조회수도 저장
            }
        } else {
            hasNextPage = false;
        }

        if (!hasNextPage) {
            loadingSpinner.innerHTML = '<p class="text-muted">마지막 게시물입니다.</p>';
        }

    } catch (error) {
        console.error('포스트 로딩 중 에러 발생:', error);
        loadingSpinner.innerHTML = '<p class="text-danger">게시물을 불러올 수 없습니다.</p>';
        hasNextPage = false;
    } finally {
        isLoading = false;
        if (hasNextPage) {
            loadingSpinner.style.display = 'none';
        }
    }
};

// 2. 카드 생성 메서드 
const createPostCard = (post) => {
    const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR');
    const profileImage = post.authorProfileImageUrl || '/img/default-profile.png';
    return `
        <div class="col-12 col-md-6">
            <a href="/posts/${post.postId}" class="text-decoration-none text-reset">
                <article class="card post-card h-100">
                    <div class="card-body">
                        <h3 class="card-title">${post.title}</h3>
                        <div class="post-author">
                            <img src="${profileImage}" alt="${post.authorNickname}님의 프로필 이미지">
                            <span class="name">${post.authorNickname}</span>
                        </div>
                        <div class="post-meta">
                            <span>${formattedDate}</span>
                            <div class="post-stats">
                                <span>👁️ ${post.viewCount}</span>
                                <span>❤️ ${post.likeCount}</span>
                                <span>💬 ${post.commentCount}</span>
                            </div>
                        </div>
                    </div>
                </article>
            </a>
        </div>
    `;
};


// 정렬 모드를 변경하고 게시물 목록을 새로고침하는 함수
const switchSortMode = async (newMode) => {
    // 이미 활성화된 모드를 다시 클릭하면 아무것도 하지 않음
    if (currentSortMode === newMode && postsContainer.innerHTML !== '') return;

    currentSortMode = newMode;

    // 1. 기존 게시물 내용 비우기
    postsContainer.innerHTML = '';
    
    // 2. 페이지네이션 상태 초기화
    isLoading = false;
    hasNextPage = true;
    lastPostId = null;
    lastViewCount = null;

    // 3. 로딩 스피너 초기화 (마지막 메시지가 남아있을 수 있으므로)
    loadingSpinner.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div>';

    // 4. 버튼 활성/비활성 UI 업데이트
    if (newMode === 'latest') {
        latestBtn.classList.add('active');
        popularBtn.classList.remove('active');
    } else {
        popularBtn.classList.add('active');
        latestBtn.classList.remove('active');
    }

    // 5. 변경된 모드로 첫 페이지 데이터 불러오기
    await fetchAndRenderPosts();
    
    // 6. 스크롤바가 없을 경우 채우기 (기존 로직과 동일)
    while (hasNextPage && !hasScrollbar() && !isLoading) {
        await fetchAndRenderPosts();
    }
};


// -----------------------------------------------------------------------------
// ## 이벤트 리스너 연결 및 초기화
// -----------------------------------------------------------------------------

// 3. 스크롤 이벤트 리스너
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200) {
        fetchAndRenderPosts(); // 리팩토링된 함수를 호출
    }
});


// 4. 최초 실행 및 버튼 클릭 이벤트
document.addEventListener('DOMContentLoaded', () => {
    // 👇 새로 추가된 버튼에 이벤트 리스너 연결
    latestBtn.addEventListener('click', () => switchSortMode('latest'));
    popularBtn.addEventListener('click', () => switchSortMode('popular'));
    // Wait for auth initialization so reissue (if needed) is single-flight
    (async () => {
        if (window.authReady) {
            try {
                await window.authReady;
            } catch (e) {
                // ignore - authReady may redirect on failure
            }
        }

        // 👇 페이지 첫 로드 시 '최신순'으로 시작
        switchSortMode('latest');
    })();
});
