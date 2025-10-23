// 비밀번호 변경
// 필요 로직
// 1. 비밀번호 일치 및 유효성 검사
// 2. 비밀번호 수정 fetch 요청

// 비밀번호 수정 페이지 기능
document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------------------------------
    // ## DOM 요소 설정
    // -----------------------------------------------------------------------------
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const updatePasswordButton = document.getElementById('update-password-button');
    const passwordValidation = document.getElementById('password-validation');
    const passwordValidFeedback = document.getElementById('password-valid-feedback');
    const passwordConfirmValidation = document.getElementById('password-confirm-validation');
    const passwordConfirmValidFeedback = document.getElementById('password-confirm-valid-feedback');

    // -----------------------------------------------------------------------------
    // ## 핵심 기능 함수 정의
    // -----------------------------------------------------------------------------

    // 실시간 비밀번호 유효성 검사
    const validatePasswordInput = () => {
        const password = newPasswordInput.value.trim();
        
        if (password.length === 0) {
            newPasswordInput.classList.remove('is-invalid', 'is-valid');
            return false;
        }
        
        if (password.length < 8 || password.length > 20) {
            newPasswordInput.classList.add('is-invalid');
            newPasswordInput.classList.remove('is-valid');
            passwordValidation.textContent = '비밀번호는 8자 이상 20자 이하로 입력해주세요.';
            return false;
        }

        newPasswordInput.classList.add('is-valid');
        newPasswordInput.classList.remove('is-invalid');
        passwordValidFeedback.textContent = '사용 가능한 비밀번호입니다.';
        return true;
    };

    // 실시간 비밀번호 확인 검사
    const validateConfirmPassword = () => {
        const password = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (confirmPassword.length === 0) {
            confirmPasswordInput.classList.remove('is-invalid', 'is-valid');
            return false;
        }

        if (password !== confirmPassword) {
            confirmPasswordInput.classList.add('is-invalid');
            confirmPasswordInput.classList.remove('is-valid');
            passwordConfirmValidation.textContent = '비밀번호가 일치하지 않습니다.';
            return false;
        }

        confirmPasswordInput.classList.add('is-valid');
        confirmPasswordInput.classList.remove('is-invalid');
        passwordConfirmValidFeedback.textContent = '비밀번호가 일치합니다.';
        return true;
    };

    /**
     * '수정하기' 버튼 클릭 시 실행될 메인 함수
     */
    const handlePasswordUpdate = async () => {
        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // 1. 비밀번호 일치 및 유효성 검사
        if (!validatePasswords(newPassword, confirmPassword)) {
            return; // 유효성 검사 실패 시 함수 종료
        }

        // 버튼 비활성화 (중복 클릭 방지)
        updatePasswordButton.disabled = true;
        updatePasswordButton.textContent = '처리 중...';

        try {
            // 2. 비밀번호 수정 fetch 요청
            const response = await customFetch('http://localhost:8080/v1/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    password: newPassword,
                    rePassword: confirmPassword
                })
            });

            if (response.ok) {
                alert('비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
                // TODO: 로그아웃 처리 로직이 필요하다면 추가 (예: localStorage 토큰 삭제)
                localStorage.removeItem('accessToken');
                window.location.href = '/v1/auth/login'; // 로그인 페이지로 이동
            } else {
                // 서버에서 보낸 에러 메시지 처리 (예: 유효성 검사 실패)
                const errorData = await response.json();
                throw new Error(errorData.message || '비밀번호 변경에 실패했습니다.');
            }
        } catch (error) {
            console.error('비밀번호 변경 중 오류:', error);
            alert(error.message);
        } finally {
            // 버튼 다시 활성화
            updatePasswordButton.disabled = false;
            updatePasswordButton.textContent = '수정하기';
        }
    };

    // 비밀번호 일치 및 유효성 검사 (최종 제출 시)
    const validatePasswords = (pw1, pw2) => {
        const isPasswordValid = validatePasswordInput();
        const isConfirmValid = validateConfirmPassword();
        return isPasswordValid && isConfirmValid;
    };

    // -----------------------------------------------------------------------------
    // ## 이벤트 리스너 연결
    // -----------------------------------------------------------------------------
    // 수정하기 버튼 클릭 이벤트
    updatePasswordButton.addEventListener('click', handlePasswordUpdate);
    
    // 실시간 유효성 검사를 위한 blur 이벤트
    newPasswordInput.addEventListener('blur', () => {
        validatePasswordInput();
        if (confirmPasswordInput.value) {
            validateConfirmPassword();
        }
    });

    confirmPasswordInput.addEventListener('blur', validateConfirmPassword);

});