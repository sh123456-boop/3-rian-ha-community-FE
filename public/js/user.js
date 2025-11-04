// 마이페이지 기능
// 필요 로직
// 1. 사용자 프로필 가져오는 메서드 (fetch get 요청)
// 2. 닉네임 중복 검사 메서드(fetch get 요청)
// 3. 프로필 이미지 presignedURl get 메서드 (fetch post 요청)
// 4. 최종 수정완료 메서드 (fetch post 요청)
// 5. presignedUrl로 프로필 이미지 put 요청 메서드 (fetch put 요청)
// 6. 최종 회원탈퇴 요청 메서드 

document.addEventListener('DOMContentLoaded', () => {

    // -----------------------------------------------------------------------------
    // ## DOM 요소 및 상태 변수 설정
    // -----------------------------------------------------------------------------
    const profileImagePreview = document.getElementById('profile-image-preview');
    const profileImageUpload = document.getElementById('profile-image-upload');
    const userEmailInput = document.getElementById('user-email');
    const userNicknameInput = document.getElementById('user-nickname');
    const checkNicknameButton = document.getElementById('check-nickname-button');
    const updateProfileButton = document.getElementById('update-profile-button');
    const withdrawButton = document.getElementById('withdraw-button');
    const imageValidation = document.getElementById('image-validation');
    const nicknameValidation = document.getElementById('nickname-validation');
    const nicknameRegex = /^(?!.*[\u3131-\u318E])[A-Za-z0-9가-힣]+$/;

    // 모달 관련 DOM 요소
    const withdrawModal = new bootstrap.Modal(document.getElementById('withdraw-modal'));
    const withdrawStep1 = document.getElementById('withdraw-step-1');
    const withdrawStep2 = document.getElementById('withdraw-step-2');
    const withdrawFooter1 = document.getElementById('withdraw-footer-1');
    const withdrawFooter2 = document.getElementById('withdraw-footer-2');
    const confirmWithdrawStep1Btn = document.getElementById('confirm-withdraw-step1');
    const confirmWithdrawFinalBtn = document.getElementById('confirm-withdraw-final');
    const withdrawPasswordInput = document.getElementById('withdraw-password');


    // 상태 관리 변수
    let originalNickname = '';
    let isNicknameChecked = false;
    let newProfileImageData = null;

    // -----------------------------------------------------------------------------
    // ## 핵심 기능 함수 정의
    // -----------------------------------------------------------------------------

    // 1. 사용자 프로필 가져오는 메서드
    const loadUserData = async () => {
        try {
            const response = await customFetch(window.buildApiUrl('/v1/users/me'), { method: 'GET', credentials: 'include' });
            if (!response.ok) throw new Error('사용자 정보 로딩 실패');
            
            const ApiResponse = await response.json();
            const userData = ApiResponse.data;
            userNicknameInput.value = userData.nickname;
            userEmailInput.value = userData.email;
            profileImagePreview.src = userData.profileUrl || '/img/default-profile.png';
            originalNickname = userData.nickname;
            hideFieldMessage(nicknameValidation, userNicknameInput);
        } catch (error) {
            console.error('사용자 정보 로딩 중 오류:', error);
            alert('사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.');
            window.location.href = '/';
        }
    };
    
    // 2. 닉네임 중복 검사 메서드 
    const handleNicknameCheck = async () => {
        const newNickname = userNicknameInput.value.trim();

        if (newNickname === originalNickname) {
            showFieldError(nicknameValidation, '현재 닉네임과 동일합니다.', userNicknameInput);
            isNicknameChecked = false;
            return;
        }
        if (!validateNicknameField()) {
            isNicknameChecked = false;
            return;
        }

        try {
            // 쿼리 파라미터로 닉네임을 전송
            const apiUrl = window.buildApiUrl(`/v1/users/me/nickname?nickname=${encodeURIComponent(newNickname)}`);
            
            const response = await customFetch(apiUrl, {
                method: 'GET',
                credentials: 'include'
                // GET 요청이므로 body와 Content-Type 헤더는 제거
            });
            
            if (!response.ok) throw new Error('중복 확인 요청 실패');

            const ApiResponse = await response.json();
            const isAvailable = ApiResponse.data;
            if (isAvailable) {
                showFieldSuccess(nicknameValidation, userNicknameInput, '사용 가능한 닉네임입니다.');
                isNicknameChecked = true;
            } else {
                showFieldError(nicknameValidation, '이미 사용 중인 닉네임입니다.', userNicknameInput);
                isNicknameChecked = false;
            }
        } catch (error) {
            console.error('닉네임 중복 확인 중 오류:', error);
            showFieldError(nicknameValidation, '중복 확인 중 오류가 발생했습니다.', userNicknameInput);
            isNicknameChecked = false;
        }
    };
    
    const setImageMessage = (message, isError = true) => {
        imageValidation.textContent = message;
        imageValidation.style.display = 'block';
        imageValidation.style.color = isError ? 'red' : 'blue';
    };

    const clearImageMessage = () => {
        imageValidation.style.display = 'none';
    };

    const showFieldError = (element, message, inputElement) => {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = 'red';
        if (inputElement) {
            inputElement.classList.add('input-error');
            inputElement.classList.remove('input-success');
        }
    };

    const showFieldSuccess = (element, inputElement, message = '') => {
        if (message) {
            element.textContent = message;
            element.style.display = 'block';
            element.style.color = 'green';
        } else {
            element.style.display = 'none';
        }
        if (inputElement) {
            inputElement.classList.remove('input-error');
            inputElement.classList.add('input-success');
        }
    };

    const hideFieldMessage = (element, inputElement) => {
        element.style.display = 'none';
        if (inputElement) {
            inputElement.classList.remove('input-error');
            inputElement.classList.remove('input-success');
        }
    };

    const validateNicknameField = () => {
        const nickname = userNicknameInput.value.trim();

        if (!nickname) {
            showFieldError(nicknameValidation, '닉네임을 입력해주세요.', userNicknameInput);
            return false;
        }
        if (nickname.length < 2 || nickname.length > 10) {
            showFieldError(nicknameValidation, '닉네임은 2자 이상 10자 이하로 입력해주세요.', userNicknameInput);
            return false;
        }
        if (!nicknameRegex.test(nickname)) {
            showFieldError(nicknameValidation, '닉네임은 완성형 한글, 영문, 숫자만 사용할 수 있습니다.', userNicknameInput);
            return false;
        }

        hideFieldMessage(nicknameValidation, userNicknameInput);
        return true;
    };

    // 3. 프로필 이미지 presignedURL get 메서드 
    const handleImageSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 형식 검사
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setImageMessage('JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        try {
            setImageMessage('이미지 업로드 중...', false);

            const presignedResponse = await customFetch(window.buildApiUrl('/v1/users/presignedUrl'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fileName: file.name })
            });
            if (!presignedResponse.ok) throw new Error('Presigned URL 요청 실패');
            const ApiResponse = await presignedResponse.json();
            const { s3_key, preSignedUrl } = ApiResponse.data;
            newProfileImageData = { file, s3_key, preSignedUrl };
            profileImagePreview.src = URL.createObjectURL(file);
            clearImageMessage();
        } catch (error) {
            console.error('이미지 처리 중 오류:', error);
            setImageMessage('이미지 처리 중 오류가 발생했습니다.');
            newProfileImageData = null;
            event.target.value = '';
        }
    };

    // 4. 최종 수정완료 메서드
    const handleProfileUpdate = async () => {
        const newNickname = userNicknameInput.value.trim();

        if (newNickname !== originalNickname) {
            if (!isNicknameChecked) {
                if (!validateNicknameField()) {
                    return;
                }
                showFieldError(nicknameValidation, '닉네임 중복 확인을 완료해주세요.', userNicknameInput);
                return;
            }
        }

        updateProfileButton.disabled = true;
        updateProfileButton.textContent = '저장 중...';

        try {
            const updateTasks = [];

            if (newNickname !== originalNickname) {
                updateTasks.push(
                    customFetch(window.buildApiUrl('/v1/users/me/nickname'), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ nickname: newNickname })
                    })
                );
            }
            if (newProfileImageData) {
                await uploadImageToS3(newProfileImageData.preSignedUrl, newProfileImageData.file);
                updateTasks.push(
                    customFetch(window.buildApiUrl('/v1/users/me/image'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ s3_key: newProfileImageData.s3_key })
                    })
                );
            }

            const responses = await Promise.all(updateTasks);
            responses.forEach(res => {
                if (!res.ok) throw new Error('프로필 업데이트 중 일부가 실패했습니다.');
            });
            alert('프로필이 성공적으로 수정되었습니다.');
            window.location.reload();
        } catch (error) {
            console.error('프로필 수정 중 오류:', error);
            alert(error.message || '프로필 수정 중 오류가 발생했습니다.');
        } finally {
            updateProfileButton.disabled = false;
            updateProfileButton.textContent = '수정완료';
        }
    };

    // 5. presignedUrl로 프로필 이미지 put 요청 메서드 
    const uploadImageToS3 = async (url, file) => {
        setImageMessage('프로필 이미지 저장 중...', false);
        const response = await fetch(url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type }
        });
        if (!response.ok) throw new Error('S3 이미지 업로드 실패');
    };

    // 6. 최종 회원탈퇴 요청 메서드 
    const handleWithdrawal = async () => {
        const password = withdrawPasswordInput.value;
        if (!password) {
            alert('비밀번호를 입력해주세요.');
            return;
        }

        try {
            const response = await customFetch(window.buildApiUrl('/v1/users/me'), {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password })
            });

            if (response.status === 200) { // No Content
                alert('회원탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
                localStorage.removeItem('accessToken');
                
                window.location.href = '/';
            } else {
                // 비밀번호가 틀렸거나 다른 에러 발생
                const errorData = await response.json();
                throw new Error(errorData.message || '회원탈퇴에 실패했습니다.');
            }
        } catch (error) {
            console.error('회원탈퇴 처리 중 오류:', error);
            alert(error.message);
        }
    };


    // -----------------------------------------------------------------------------
    // ## 이벤트 리스너 연결
    // -----------------------------------------------------------------------------

    userNicknameInput.addEventListener('input', () => {
        isNicknameChecked = false;
        hideFieldMessage(nicknameValidation, userNicknameInput);
    });

    userNicknameInput.addEventListener('blur', () => {
        const trimmedNickname = userNicknameInput.value.trim();
        if (!trimmedNickname || trimmedNickname === originalNickname) {
            hideFieldMessage(nicknameValidation, userNicknameInput);
            return;
        }
        validateNicknameField();
    });

    checkNicknameButton.addEventListener('click', handleNicknameCheck);
    profileImageUpload.addEventListener('change', handleImageSelect);
    updateProfileButton.addEventListener('click', handleProfileUpdate);
    
    // 모달의 '확인' 버튼 클릭 시, 2단계(비밀번호 입력)로 전환
    confirmWithdrawStep1Btn.addEventListener('click', () => {
        withdrawStep1.style.display = 'none';
        withdrawFooter1.style.display = 'none';
        withdrawStep2.style.display = 'block';
        withdrawFooter2.style.display = 'block';
        withdrawPasswordInput.focus(); // 비밀번호 입력창에 자동 포커스
    });

    // 모달의 '최종 탈퇴' 버튼 클릭 시, 탈퇴 함수 호출
    confirmWithdrawFinalBtn.addEventListener('click', handleWithdrawal);
    
    // 모달이 닫힐 때, 다시 1단계로 리셋
    document.getElementById('withdraw-modal').addEventListener('hidden.bs.modal', () => {
        withdrawPasswordInput.value = '';
        withdrawStep2.style.display = 'none';
        withdrawFooter2.style.display = 'none';
        withdrawStep1.style.display = 'block';
        withdrawFooter1.style.display = 'block';
    });

    // 페이지가 처음 로드될 때 사용자 정보를 불러옵니다.
    loadUserData();
});
