// 게시글 작성
// 필요 로직
// 1. fetch로 http post 요청(게시물 최종 저장)
// 2. fetch로 http get 요청(presignedUrl)
// 3. fetch로 http put 요청(presignedUrl로 이미지 저장)
// 4. 이미지 취소 메서드

document.addEventListener('DOMContentLoaded', () => {

    // DOM 요소 
    const postForm = document.getElementById('post-form');
    const titleInput = document.getElementById('post-title');
    const contentInput = document.getElementById('post-content');
    const imageUploadInput = document.getElementById('image-upload');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const submitBtn = document.getElementById('submit-btn');
    const titleValidation = document.getElementById('title-validation');
    const contentValidation = document.getElementById('content-validation');
    const imageValidation = document.getElementById('image-validation');
    const contentCounter = document.getElementById('content-counter');

    // 상태 변수 
    let imageFiles = [];
    
    // 유효성 검사 상태
    let isTitleValid = false;
    let isContentValid = false;
    let isImagesValid = true; // 이미지는 필수가 아니므로 기본값 true
    let isTitleTouched = false; // 제목 필드 터치 여부
    let isContentTouched = false; // 내용 필드 터치 여부

    // 유효성 검사 함수
    const validateTitle = (showValidation = true) => {
        const title = titleInput.value.trim();
        
        if (!isTitleTouched && !showValidation) {
            return true;
        }

        if (!title) {
            if (showValidation) {
                showError(titleValidation, '제목을 입력해주세요.', titleInput);
            }
            isTitleValid = false;
            updateSubmitButton();
            return false;
        }

        if (title.length > 100) {
            if (showValidation) {
                showError(titleValidation, '제목은 100자를 초과할 수 없습니다.', titleInput);
                titleInput.value = title.slice(0, 100); // 100자로 자르기
            }
            isTitleValid = false;
            updateSubmitButton();
            return false;
        }

        if (showValidation) {
            showSuccess(titleValidation, titleInput);
        }
        isTitleValid = true;
        updateSubmitButton();
        return true;
    };

    const validateContent = (showValidation = true) => {
        const content = contentInput.value.trim();

        if (!isContentTouched && !showValidation) {
            return true;
        }

        if (!content) {
            if (showValidation) {
                showError(contentValidation, '내용을 입력해주세요.', contentInput);
            }
            isContentValid = false;
            updateSubmitButton();
            return false;
        }

        if (content.length > 10000) {
            if (showValidation) {
                showError(contentValidation, '내용은 10000자를 초과할 수 없습니다.', contentInput);
                contentInput.value = content.slice(0, 10000);
            }
            isContentValid = false;
            updateSubmitButton();
            return false;
        }

        if (showValidation) {
            showSuccess(contentValidation, contentInput);
        }
        isContentValid = true;
        updateSubmitButton();
        return true;
    };

    const validateImages = () => {
        if (imageFiles.length > 5) {
            showError(imageValidation, '이미지는 최대 5장까지만 첨부할 수 있습니다.');
            isImagesValid = false;
            updateSubmitButton();
            return false;
        }
        if (imageValidation.style.display === 'block') {
            imageValidation.style.display = 'none';
        }
        isImagesValid = true;
        updateSubmitButton();
        return true;
    };

    // 제출 버튼 상태 업데이트
    const updateSubmitButton = () => {
        const isFormValid = isTitleValid && isContentValid && isImagesValid;
        submitBtn.disabled = !isFormValid;
        if (!isFormValid) {
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-secondary');
        } else {
            submitBtn.classList.remove('btn-secondary');
            submitBtn.classList.add('btn-primary');
        }
    };

    // 오류 메시지 표시 함수
    const showError = (element, message, inputElement = null) => {
        element.textContent = message;
        element.style.display = 'block';
        element.style.color = 'red';
        if (inputElement) {
            inputElement.classList.add('input-error');
            inputElement.classList.remove('input-success');
        }
    };

    // 성공 메시지 표시 함수
    const showSuccess = (element, inputElement = null) => {
        element.style.display = 'none';
        if (inputElement) {
            inputElement.classList.remove('input-error');
            inputElement.classList.add('input-success');
        }
    };

    // 내용 글자수 카운터 업데이트
    const updateContentCounter = () => {
        const length = contentInput.value.length;
        contentCounter.textContent = `${length}/10000자`;
        if (length > 10000) {
            contentCounter.style.color = 'red';
        } else {
            contentCounter.style.color = '';
        }
    };

    // 이벤트 리스너 추가
    // 제목 이벤트 리스너
    titleInput.addEventListener('blur', () => {
        isTitleTouched = true;
        validateTitle(true);
    });

    titleInput.addEventListener('focus', () => {
        if (!isTitleTouched) {
            titleValidation.style.display = 'none';
            return;
        }
        validateTitle(true);
    });

    titleInput.addEventListener('input', (e) => {
        if (!isTitleTouched) isTitleTouched = true;
        const text = e.target.value;
        if (text.length > 100) {
            e.target.value = text.slice(0, 100);
        }
        validateTitle(true);
    });

    // 내용 이벤트 리스너
    contentInput.addEventListener('blur', () => {
        isContentTouched = true;
        validateContent(true);
    });

    contentInput.addEventListener('focus', () => {
        if (!isContentTouched) {
            contentValidation.style.display = 'none';
            return;
        }
        validateContent(true);
    });

    contentInput.addEventListener('input', () => {
        if (!isContentTouched) isContentTouched = true;
        const text = contentInput.value;
        if (text.length > 10000) {
            contentInput.value = text.slice(0, 10000);
        }
        updateContentCounter();
        validateContent(true);
    });

    // 페이지 로드 시 초기 설정
    validateTitle(false);
    validateContent(false);
    validateImages();
    updateSubmitButton();


    // 1. fetch로 http 요청(게시물 최종 저장)
    const handleFormSubmit = async (event) => {
        event.preventDefault();

        // 모든 유효성 검사 실행
        if (!validateTitle() || !validateContent() || !validateImages()) {
            alert('입력 형식을 확인해주세요.');
            return;
        }

        // 제출 버튼 상태 변경
        const originalButtonText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '저장 중...';
        submitBtn.classList.add('btn-secondary');
        submitBtn.classList.remove('btn-primary');

        try {
            // 3. fetch로 http 요청(presignedUrl로 이미지 put 요청)
            const uploadPromises = imageFiles.map(imgData => {
                return fetch(imgData.presignedUrl, {
                    method: 'PUT',
                    body: imgData.file,
                    headers: { 'Content-Type': imgData.file.type }
                });
            });

            const uploadResponses = await Promise.all(uploadPromises);
            uploadResponses.forEach(res => {
                if (!res.ok) throw new Error('S3 이미지 업로드에 실패했습니다.');
            });
            console.log('모든 이미지 S3 업로드 성공!');

            // 백엔드 서버에 post 요청할 data
            const postData = {
                title: titleInput.value,
                content: contentInput.value,
                images: imageFiles.map((img, index) => ({
                    s3_key: img.s3_key,
                    order: index
                }))
            };

            // fetch를 customFetch로 변경
            const response = await customFetch(window.buildApiUrl('/v1/posts'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials : 'include',
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                throw new Error('게시물 저장에 실패했습니다.');
            }
            
            alert('게시물이 성공적으로 작성되었습니다.');
            window.location.href = '/posts';

        } catch (error) {
            console.error('게시물 작성 중 오류:', error);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalButtonText;
            submitBtn.classList.remove('btn-secondary');
            submitBtn.classList.add('btn-primary');
            updateSubmitButton();
        }
    };


    // 2. fetch로 http 요청(presignedUrl get)
    const getPresignedUrlFromServer = async (filename) => {
        try {
            // fetch를 customFetch로 변경
            const response = await customFetch(window.buildApiUrl('/v1/posts/presignedUrl'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fileName: filename }),
            });

            if (!response.ok) {
                throw new Error('Presigned URL 요청에 실패했습니다.');
            }

            const ApiResponse = await response.json();
            const data = ApiResponse.data;
            return { s3_key: data.s3_key, presignedUrl: data.preSignedUrl };

        } catch (error) {
            console.error('Presigned URL 요청 중 오류:', error);
            throw error;
        }
    };
    
    // 4. 이미지 취소 메서드(js에 저장했던 imageFiles값 삭제)
    const handleImageDelete = (event) => {
        if (!event.target.classList.contains('btn-delete-image')) return;
        const s3KeyToDelete = event.target.dataset.s3Key;
        imageFiles = imageFiles.filter(img => img.s3_key !== s3KeyToDelete);
        renderImagePreviews();
    };

    
    
    // -----------------------------------------------------------------------------
    // ## 보조 함수 및 이벤트 리스너
    // -----------------------------------------------------------------------------
    
    // 파일을 선택할 때 presignedUrl을 get하는 함수(2번)를 호출하는 메서드
    const handleFileSelect = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        
        if (imageFiles.length + files.length > 5) {
            showError(imageValidation, '이미지는 최대 5장까지만 첨부할 수 있습니다.');
            imageUploadInput.value = '';
            return;
        }

        // 허용된 파일 형식 검사
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const invalidFiles = files.filter(file => !allowedTypes.includes(file.type));
        if (invalidFiles.length > 0) {
            showError(imageValidation, 'JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.');
            imageUploadInput.value = '';
            return;
        }
        
        for (const file of files) {
            try {
                showError(imageValidation, `'${file.name}' 업로드 중...`);
                imageValidation.style.color = 'blue';
                
                const { s3_key, presignedUrl } = await getPresignedUrlFromServer(file.name);
                imageFiles.push({
                    file,
                    s3_key,
                    presignedUrl,
                    preview: URL.createObjectURL(file)
                });
                
                showSuccess(imageValidation);
            } catch (error) {
                console.error(`'${file.name}' 처리 중 오류 발생.`);
                showError(imageValidation, `'${file.name}' 처리 중 오류가 발생했습니다.`);
            }
        }
        
        renderImagePreviews();
        validateImages();
        imageUploadInput.value = '';
    };

    // imageFiles 배열의 현재 상태를 기반으로 화면에 이미지 미리보기를 그려주는 함수.
    const renderImagePreviews = () => {
        imagePreviewContainer.innerHTML = '';
        imageFiles.forEach((imgData) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.dataset.s3Key = imgData.s3_key;
            previewItem.innerHTML = `
                <img src="${imgData.preview}" alt="이미지 미리보기">
                <button type="button" class="btn-delete-image" data-s3-key="${imgData.s3_key}">×</button>
            `;
            imagePreviewContainer.appendChild(previewItem);
        });
    };

    // 사용자가 이미지 파일을 선택하면 `handleFileSelect` 함수를 실행
    imageUploadInput.addEventListener('change', handleFileSelect);

    // '게시물 작성' 버튼을 클릭하거나 폼에서 Enter 키를 누르면 `handleFormSubmit` 함수를 실행
    postForm.addEventListener('submit', handleFormSubmit);

    // 이미지 미리보기 컨테이너 내에서 클릭 이벤트가 발생하면 `handleImageDelete` 함수를 실행
    imagePreviewContainer.addEventListener('click', handleImageDelete);

    /**
 * 'SortableJS' 라이브러리를 사용하여 이미지 미리보기의 드래그 앤 드롭 기능을 활성화합니다.
 * 사용자가 이미지 순서를 바꾸면 `onEnd` 콜백 함수가 실행됩니다.
 * `onEnd` 콜백은 `imageFiles` 배열의 순서를 실제 DOM의 순서와 동기화하여,
 * 나중에 서버로 전송될 이미지 순서(order)가 올바르게 반영되도록 합니다.
 */
    new Sortable(imagePreviewContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            const s3Key = evt.item.dataset.s3Key;
            const oldIndex = imageFiles.findIndex(img => img.s3_key === s3Key);
            const newIndex = evt.newIndex;
            
            if (oldIndex !== -1) {
                const [movedItem] = imageFiles.splice(oldIndex, 1);
                imageFiles.splice(newIndex, 0, movedItem);
            }
        },
    });
});
