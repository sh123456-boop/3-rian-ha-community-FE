// 모든 페이지에서 공통으로 사용될 헤더를 동적으로 로드
// 필요 로직
// 1. header.html 로드
// 2. 사용자 프로필 이미지 get 요청(fetch)
// 3. 서버에 로그아웃 요청 (fetch)

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth initialization (api.js may attempt a refresh and populate access token)
    if (window.authReady) {
        try {
            await window.authReady;
        } catch (e) {
            // ignore - authReady rejects when reissue fails and redirect happens
        }
    }

    // 1. header.html 로드
    const loadHeader = async () => {
        try {
            const response = await fetch('/includes/header.html'); // header.html 경로
            if (!response.ok) throw new Error('헤더를 불러오는 데 실패했습니다.');
            
            const headerHtml = await response.text();
            document.getElementById('header-placeholder').innerHTML = headerHtml;
        } catch (error) {
            console.error(error);
            document.getElementById('header-placeholder').innerHTML = '<p class="text-danger">헤더 로딩 실패</p>';
        }
    };

    await loadHeader();

    const headerProfileImage = document.getElementById('header-profile-image');
    const logoutButton = document.getElementById('logout-button');

    


    const accessToken = (window.getAccessToken && window.getAccessToken()) || localStorage.getItem('accessToken');

    if (accessToken && headerProfileImage) {
        try {
            // 2. 사용자 프로필 이미지 get 요청(fetch)
            const response = await customFetch(window.buildApiUrl('/v1/users/me'), {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                const ApiResponse = await response.json();
                const userInfo = ApiResponse.data;
                // 응답 DTO의 'profileUrl' 필드를 사용해 이미지를 업데이트
                if (userInfo.profileUrl) {
                    headerProfileImage.src = userInfo.profileUrl;
                }
            }
        } catch (error) {
            console.error('헤더 프로필 이미지 로딩 중 오류:', error);
        }
    }

    // 3. 서버에 로그아웃 요청 (fetch)
    if (logoutButton) {
        logoutButton.addEventListener('click', async (event) => {
            event.preventDefault(); 
            
            if (confirm('로그아웃 하시겠습니까?')) {
                try {
                    const response = await customFetch(window.buildApiUrl('/v1/auth/logout'), {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (!response.ok) {
                        throw new Error('로그아웃에 실패했습니다.');
                    }
                    
                    // 요청 성공 후 로컬 스토리지 정리 및 페이지 이동
                    localStorage.removeItem('accessToken');
                    alert('로그아웃 되었습니다.');
                    window.location.href = '/v1/auth/login';

                } catch (error) {
                    console.error('로그아웃 처리 중 오류:', error);
                    alert('로그아웃 처리 중 문제가 발생했습니다.');
                    // 에러가 발생하더라도 로컬 토큰은 삭제하고 로그인 페이지로 보내는 것이 안전(사용자 경험 측면)
                    localStorage.removeItem('accessToken');
                    window.location.href = '/v1/auth/login';
                }
            }
        });
    }
});
