// 로그인 처리
// 필요 로직
// 1. input 값에 대한 유효성 검사(validation)
// 2. fetch를 이용해 서버로 로그인 요청
// 3. 응답값(access token)을 localstorage에 저장
// 4. 로그인 성공시 메인 페이지로 이동

const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const emailValidation = document.getElementById('email-validation');
const passwordValidation = document.getElementById('password-validation');
const naverLoginButton = document.getElementById('naver-login-button');

// 이메일 형식 검사를 위한 정규 표현식
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>?/]).+$/;

// 이메일 유효성 검사 함수
function validateEmail() {
    const email = loginEmailInput.value;
    if (!email) {
        emailValidation.textContent = '이메일을 입력해주세요.';
        emailValidation.style.display = 'block';
        loginEmailInput.classList.add('input-error');
        loginEmailInput.classList.remove('input-success');
        return false;
    }
    if (email.length > 254) {
        emailValidation.textContent = '이메일은 254자 이하여야 합니다.';
        emailValidation.style.display = 'block';
        loginEmailInput.classList.add('input-error');
        loginEmailInput.classList.remove('input-success');
        return false;
    }
    if (!emailRegex.test(email)) {
        emailValidation.textContent = '올바른 이메일 형식이 아닙니다.';
        emailValidation.style.display = 'block';
        loginEmailInput.classList.add('input-error');
        loginEmailInput.classList.remove('input-success');
        return false;
    }
    emailValidation.style.display = 'none';
    loginEmailInput.classList.remove('input-error');
    loginEmailInput.classList.add('input-success');
    return true;
}

// 비밀번호 유효성 검사 함수
function validatePassword() {
    const password = loginPasswordInput.value;
    if (!password) {
        passwordValidation.textContent = '비밀번호를 입력해주세요.';
        passwordValidation.style.display = 'block';
        loginPasswordInput.classList.add('input-error');
        loginPasswordInput.classList.remove('input-success');
        return false;
    }
    if (password.length < 8 || password.length > 20) {
        passwordValidation.textContent = '비밀번호는 8~20자 사이여야 합니다.';
        passwordValidation.style.display = 'block';
        loginPasswordInput.classList.add('input-error');
        loginPasswordInput.classList.remove('input-success');
        return false;
    }
    if (!passwordRegex.test(password)) {
        passwordValidation.textContent = '비밀번호는 영문자, 숫자, 특수문자를 최소 1개 이상 포함해야 합니다.';
        passwordValidation.style.display = 'block';
        loginPasswordInput.classList.add('input-error');
        loginPasswordInput.classList.remove('input-success');
        return false;
    }
    passwordValidation.style.display = 'none';
    loginPasswordInput.classList.remove('input-error');
    loginPasswordInput.classList.add('input-success');
    return true;
}

// 이벤트 리스너 추가
loginEmailInput.addEventListener('blur', validateEmail);
loginPasswordInput.addEventListener('blur', validatePassword);

if (naverLoginButton) {
    naverLoginButton.addEventListener('click', () => {
        // 네이버 소셜 로그인 페이지로 이동
        window.location.href = window.buildApiUrl('/oauth2/authorization/naver');
    });
}


loginButton.addEventListener('click', () => {
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    // 1. input 값에 대한 유효성 검사
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
        return;
    }

    // 2. fetch를 이용해 서버로 로그인 요청
    fetch(window.buildApiUrl('/v1/auth/login'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    })

    // 3. 응답값(access token)을 localstorage에 저장
    .then(response => {
        
        const accessToken = response.headers.get('access');
        
        if (accessToken) {
            alert('로그인 성공!');
            
            localStorage.setItem('accessToken', accessToken); 
            // 4. 로그인 성공시 메인 페이지로 이동
            window.location.href = '/posts'; 
        } else {
            // 로그인 실패 시, 서버가 보내주는 에러 메시지 처리
            return response.json().then(errorData => {
                 alert('로그인 실패: ' + (errorData.message || '이메일 또는 비밀번호를 확인하세요.'));
            });
        }
    })
    .catch(error => console.error('로그인 처리 중 에러 발생:', error));
});


// 회원가입으로 이동
signupButton.addEventListener('click', () =>{
    window.location.href = '/join';
});

function handleOAuthRedirectTokens() {
    try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
            window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
        );

        const accessTokenFromOAuth = searchParams.get('access') || hashParams.get('access');
        const refreshTokenFromOAuth = searchParams.get('refresh') || hashParams.get('refresh');

        if (!accessTokenFromOAuth) {
            return;
        }

        localStorage.setItem('accessToken', accessTokenFromOAuth);

        if (refreshTokenFromOAuth) {
            // 새로고침 시에도 페이지 접근이 가능하도록 refresh 토큰을 쿠키에 보관
            document.cookie = `refresh=${refreshTokenFromOAuth}; path=/`;
        }

        // URL에서 토큰 관련 파라미터 제거
        searchParams.delete('access');
        searchParams.delete('refresh');
        hashParams.delete('access');
        hashParams.delete('refresh');

        const sanitizedSearch = searchParams.toString();
        const sanitizedHash = hashParams.toString();
        const newUrl = `${window.location.pathname}${sanitizedSearch ? `?${sanitizedSearch}` : ''}${sanitizedHash ? `#${sanitizedHash}` : ''}`;
        window.history.replaceState({}, document.title, newUrl);

        alert('로그인 성공!');
        window.location.href = '/posts';
    } catch (error) {
        console.error('OAuth 토큰 처리 중 오류가 발생했습니다.', error);
    }
}

handleOAuthRedirectTokens();
