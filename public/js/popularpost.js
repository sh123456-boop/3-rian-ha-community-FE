// /js/popularpost.js
// 필요 로직
// 1. fetch를 통해 일일/주간 인기 게시글 dto를 가져오는 메서드
// 2. dto를 카드로 변환하는 메서드 

document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        
        fetchAndRenderPosts('http://localhost:8080/v1/post-ranking/day', '#daily-posts-container'),
        fetchAndRenderPosts('http://localhost:8080/v1/post-ranking/week', '#weekly-posts-container')
    ]).catch(error => {
        console.error("인기 게시물 로딩 중 오류가 발생했습니다.", error);
    });
});

// 1. fetch를 통해 일일/주간 인기 게시글 dto를 가져오는 메서드
async function fetchAndRenderPosts(apiUrl, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    try {
        const response = await customFetch(apiUrl);

        if (!response.ok) {
            throw new Error(`서버 응답 실패: ${response.status}`);
        }

        const apiResponse = await response.json(); 

        const posts = apiResponse.data.posts;

        if (posts && posts.length > 0) {
            const allCardsHtml = posts.map(post => createPostCard(post)).join('');
            container.innerHTML = allCardsHtml;
        } else {
            container.innerHTML = '<p class="text-center text-muted p-3">인기 게시물이 아직 없습니다.</p>';
        }

    } catch (error) {
        console.error(`${apiUrl} 요청 중 오류 발생:`, error);
        container.innerHTML = '<div class="alert alert-danger" role="alert">게시물을 불러오는 데 실패했습니다.</div>';
    }
}

// 2. dto를 카드로 변환하는 메서드
function createPostCard(post) {
    const formattedDate = new Date(post.createdAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    });

    return `
        <div class="post-card-wrapper">
            <article class="post-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1 pe-3">
                        <h3 class="title text-truncate">${post.title}</h3>
                        <div class="meta">
                            <span>${post.authorNickname}</span>
                            <span>·</span>
                            <span>${formattedDate}</span>
                        </div>
                    </div>
                    <div class="stats text-nowrap">
                        <span title="조회수"><i class="fa-regular fa-eye"></i>${post.viewCount}</span>
                        <span title="좋아요"><i class="fa-regular fa-heart"></i>${post.likeCount}</span>
                        <span title="댓글"><i class="fa-regular fa-comment"></i>${post.commentCount}</span>
                    </div>
                </div>
                <a href="/v1/posts/${post.postId}" class="link-overlay"></a>
            </article>
        </div>
    `;
}
