// 회원가입
// 필요 로직
// 1. input값에 대한 유효성 검사
// 2. fetch로 회원가입 요청
// 3. 성공시 응답값을 알려주고 login 페이지로 이동
// 4. 실패시 서버로부터 받은 메세지를 alert

//  DOM 요소 선택
const signupButton = document.getElementById('signup-button');
const signupEmailInput = document.getElementById('signup-email');
const signupNicknameInput = document.getElementById('signup-nickname');
const signupPasswordInput = document.getElementById('signup-password');
const signupPasswordCheckInput = document.getElementById('signup-password-check');
const checkNicknameButton = document.getElementById('check-nickname-button');

// 유효성 검사 메시지 요소
const emailValidation = document.getElementById('email-validation');
const nicknameValidation = document.getElementById('nickname-validation');
const passwordValidation = document.getElementById('password-validation');
const passwordCheckValidation = document.getElementById('password-check-validation');

// 상태 변수
let isNicknameChecked = false;
let lastCheckedNickname = '';

// 이메일 형식 검사를 위한 정규 표현식
const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>?/]).+$/;
const nicknameRegex = /^(?!.*[\u3131-\u318E])[A-Za-z0-9가-힣]+$/;

// 이메일 유효성 검사
function validateEmail() {
    const email = signupEmailInput.value;
    if (!email) {
        showError(emailValidation, '이메일을 입력해주세요.', signupEmailInput);
        return false;
    }
    if (email.length > 254) {
        showError(emailValidation, '이메일은 254자 이하여야 합니다.', signupEmailInput);
        return false;
    }
    if (!emailRegex.test(email)) {
        showError(emailValidation, '올바른 이메일 형식이 아닙니다.', signupEmailInput);
        return false;
    }
    showSuccess(emailValidation, signupEmailInput);
    return true;
}

// 닉네임 유효성 검사
function validateNickname() {
    const nickname = signupNicknameInput.value;
    if (!nickname) {
        showError(nicknameValidation, '닉네임을 입력해주세요.', signupNicknameInput);
        return false;
    }
    if (nickname.length < 2 || nickname.length > 10) {
        showError(nicknameValidation, '닉네임은 2~10자 사이여야 합니다.', signupNicknameInput);
        return false;
    }
    if (!nicknameRegex.test(nickname)) {
        showError(nicknameValidation, '닉네임은 완성형 한글, 영문, 숫자만 사용할 수 있습니다.', signupNicknameInput);
        return false;
    }
    if (!isNicknameChecked || lastCheckedNickname !== nickname) {
        showError(nicknameValidation, '닉네임 중복 확인이 필요합니다.', signupNicknameInput);
        return false;
    }
    return true;
}

// 닉네임 중복 검사
async function checkNickname() {
    const nickname = signupNicknameInput.value.trim();
    
    if (nickname.length < 2 || nickname.length > 10) {
        showError(nicknameValidation, '닉네임은 2~10자 사이여야 합니다.', signupNicknameInput);
        return;
    }
    if (!nicknameRegex.test(nickname)) {
        showError(nicknameValidation, '닉네임은 완성형 한글, 영문, 숫자만 사용할 수 있습니다.', signupNicknameInput);
        return;
    }

    try {
        const apiUrl = window.buildApiUrl(`/v1/users/me/nickname?nickname=${encodeURIComponent(nickname)}`);
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) throw new Error('중복 확인 요청 실패');

        const ApiResponse = await response.json();
        const isAvailable = ApiResponse.data;
        
        if (isAvailable) {
            showSuccess(nicknameValidation, signupNicknameInput, '사용 가능한 닉네임입니다.');
            isNicknameChecked = true;
            lastCheckedNickname = nickname;
        } else {
            showError(nicknameValidation, '이미 사용 중인 닉네임입니다.', signupNicknameInput);
            isNicknameChecked = false;
        }
    } catch (error) {
        console.error('닉네임 중복 확인 중 오류:', error);
        showError(nicknameValidation, '중복 확인 중 오류가 발생했습니다.', signupNicknameInput);
        isNicknameChecked = false;
    }
}

// 비밀번호 유효성 검사
function validatePassword() {
    const password = signupPasswordInput.value;
    if (!password) {
        showError(passwordValidation, '비밀번호를 입력해주세요.', signupPasswordInput);
        return false;
    }
    if (password.length < 8 || password.length > 20) {
        showError(passwordValidation, '비밀번호는 8~20자 사이여야 합니다.', signupPasswordInput);
        return false;
    }
    if (!passwordRegex.test(password)) {
        showError(passwordValidation, '비밀번호는 영문자, 숫자, 특수문자를 최소 1개 이상 포함해야 합니다.', signupPasswordInput);
        return false;
    }
    showSuccess(passwordValidation, signupPasswordInput);
    return true;
}

// 비밀번호 확인 검사
function validatePasswordCheck() {
    const password = signupPasswordInput.value;
    const passwordCheck = signupPasswordCheckInput.value;
    if (!passwordCheck) {
        showError(passwordCheckValidation, '비밀번호 확인을 입력해주세요.', signupPasswordCheckInput);
        return false;
    }
    if (password !== passwordCheck) {
        showError(passwordCheckValidation, '비밀번호가 일치하지 않습니다.', signupPasswordCheckInput);
        return false;
    }
    showSuccess(passwordCheckValidation, signupPasswordCheckInput);
    return true;
}

// 오류 메시지 표시 함수
function showError(element, message, inputElement) {
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = 'red';
    inputElement.classList.add('input-error');
    inputElement.classList.remove('input-success');
}

// 성공 메시지 표시 함수
function showSuccess(element, inputElement, message = '') {
    if (message) {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = 'green';
    } else {
        element.style.display = 'none';
    }
    inputElement.classList.remove('input-error');
    inputElement.classList.add('input-success');
}

// 이벤트 리스너 등록
signupEmailInput.addEventListener('blur', validateEmail);
signupNicknameInput.addEventListener('input', () => {
    isNicknameChecked = false;
    if (signupNicknameInput.value !== lastCheckedNickname) {
        showError(nicknameValidation, '닉네임 중복 확인이 필요합니다.', signupNicknameInput);
    }
});
checkNicknameButton.addEventListener('click', checkNickname);
signupPasswordInput.addEventListener('blur', () => {
    validatePassword();
    if (signupPasswordCheckInput.value) validatePasswordCheck();
});
signupPasswordCheckInput.addEventListener('blur', validatePasswordCheck);

signupButton.addEventListener('click', () => {
    //  입력값 가져오기
    const email = signupEmailInput.value;
    const nickname = signupNicknameInput.value;
    const password = signupPasswordInput.value;
    const rePassword = signupPasswordCheckInput.value;
    
    // 이메일 형식 검사를 위한 정규 표현식
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

    // 1. input 값에 대한 유효성 검사
    const isEmailValid = validateEmail();
    const isNicknameValid = validateNickname();
    const isPasswordValid = validatePassword();
    const isPasswordCheckValid = validatePasswordCheck();

    if (!isEmailValid || !isNicknameValid || !isPasswordValid || !isPasswordCheckValid) {
        return;
    }

    // 2. fetch로 회원가입 요청
    fetch(window.buildApiUrl('/v1/auth/join'), { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rePassword,nickname }), 
    })
    .then(response => {
        if (response.ok) {
            // 성공 응답(텍스트)을 그대로 반환
            return response.text();
        } else {
            // 실패했다면, 응답 본문에 담긴 JSON 에러를 파싱
            // 파싱된 에러 객체를 .catch()로 넘기기 위해 Promise.reject()를 사용
            return response.json().then(err => Promise.reject(err));
        }
    })
    // 3. 성공시 응답값을 알려주고 login 페이지로 이동
    .then(successMessage => {
        console.log('서버 응답:', successMessage);
        alert('회원가입 성공!');
        window.location.href = '/v1/auth/login';
    })
    // 4. 실패시 서버로부터 받은 메세지를 alert
    .catch(error => {
        console.error('회원가입 에러:', error);
        // 서버가 보낸 JSON 에러 객체에서 'message'를 꺼내 보여줌.
        // 만약 네트워크 에러 등 다른 문제면 '다시 시도해주세요.'가 나옴.
        alert('회원가입 실패: ' + (error.message || '다시 시도해주세요.'));
    });
});
