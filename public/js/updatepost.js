// 게시글 수정 페이지
// 필요 로직
// 1. 원래의 post 정보를 가져오는 메서드
// 2. 이미지를 올렸을 때 presigned url을 가져오는 메서드 (fetch post)
// 3. 변경된 값을 최종 저장하는 메서드 (fetch put)
// 4. presigned url에 새로운 이미지를 put 하는 메서드 (fetch put)


// 게시글 수정 페이지
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
    let imageFiles = []; // { s3_key, previewUrl, isNew, file? } 형태의 객체를 담을 배열
    
    // 유효성 검사 상태
    let isTitleValid = false;
    let isContentValid = false;
    let isImagesValid = true; // 이미지는 필수가 아니므로 기본값 true
    let isTitleTouched = false;
    let isContentTouched = false;
    
    // URL에서 postId 추출
    const getPostIdFromUrl = () => {
        const pathParts = window.location.pathname.split('/');
        pathParts.pop(); // 'update' 제거
        return pathParts.pop();
    };
    const postId = getPostIdFromUrl();


    // 1. 원래의 post 정보를 가져오는 메서드
    const loadPostData = async () => {
        if (!postId || isNaN(postId)) {
            alert('유효하지 않은 게시글 ID입니다.');
            window.location.href = '/v1/posts';
            return;
        }

        try {
            const response = await customFetch(window.buildApiUrl(`/v1/posts/${postId}`), {
                method: 'GET',
                credentials: 'include'
            });
            if (!response.ok) throw new Error('게시글 정보를 불러오는 데 실패했습니다.');

            const ApiResponse = await response.json();
            const post = ApiResponse.data;
            // PostResponseDto

            // 폼에 기존 데이터 채우기
            titleInput.value = post.title;
            contentInput.value = post.content;
            
            // 초기값을 유효하다고 설정
            isTitleValid = true;
            isContentValid = true;
            updateContentCounter();

            // 기존 이미지 정보를 imageFiles 배열에 저장
            if (post.images && post.images.length > 0) {
                post.images.sort((a, b) => a.order - b.order);
                imageFiles = post.images.map(img => ({
                    
                    s3_key: img.s3_key, 
                    previewUrl: img.imageUrl,
                    isNew: false // 기존 이미지임을 표시
                }));
            }

            renderImagePreviews();

        } catch (error) {
            console.error('게시물 데이터 로딩 중 오류:', error);
            alert(error.message);
        }
    };


    // 유효성 검사 함수들
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
                titleInput.value = title.slice(0, 100);
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
        // 터치된 필드만 유효성 검사
        const titleValid = isTitleTouched ? isTitleValid : true;
        const contentValid = isContentTouched ? isContentValid : true;
        const isFormValid = titleValid && contentValid && isImagesValid;
        
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

    // 3. 변경된 값을 최종 저장하는 메서드 (fetch put)
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        
        // 터치된 필드만 유효성 검사
        const titleCheck = isTitleTouched ? validateTitle() : true;
        const contentCheck = isContentTouched ? validateContent() : true;
        
        if (!titleCheck || !contentCheck || !validateImages()) {
            alert('입력 형식을 확인해주세요.');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = '수정 중...';

        try {
            // 4. presigned url에 새로운 이미지를 put 하는 메서드
            const newImagesToUpload = imageFiles.filter(img => img.isNew);
            const uploadPromises = newImagesToUpload.map(imgData => {
                return fetch(imgData.presignedUrl, {
                    method: 'PUT',
                    body: imgData.file,
                    headers: { 'Content-Type': imgData.file.type }
                });
            });

            await Promise.all(uploadPromises);
            console.log('새로 추가된 이미지 S3 업로드 성공!');

            // PostCreateRequestDto 형식에 맞춰 최종 데이터 구성
            const postData = {
                title: titleInput.value,
                content: contentInput.value,
                images: imageFiles.map((img, index) => ({
                    s3_key: img.s3_key, // 이제 이 값은 기존/신규 이미지 모두에 존재합니다.
                    order: index
                }))
            };

            // 서버에 PUT 요청
            const response = await customFetch(window.buildApiUrl(`/v1/posts/${postId}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(postData)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.message || '게시물 수정에 실패했습니다.');
            }
            
            alert('게시물이 성공적으로 수정되었습니다.');
            window.location.href = `/v1/posts/${postId}`;

        } catch (error) {
            console.error('게시물 수정 중 오류:', error);
            alert(error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = '수정 완료';
        }
    };

  

    // 2. 이미지를 올렸을 때 presigned url을 가져오는 메서드 (fetch post)
    const getPresignedUrlFromServer = async (filename) => {
        try {
            const response = await customFetch(window.buildApiUrl('/v1/posts/presignedUrl'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fileName: filename }),
            });
            if (!response.ok) throw new Error('Presigned URL 요청 실패');
            const ApiResponse = await response.json();
            const data = ApiResponse.data;
            return { s3_key: data.s3_key, presignedUrl: data.preSignedUrl };
        } catch (error) {
            console.error('Presigned URL 요청 중 오류:', error);
            throw error;
        }
    };

    // 새 파일 선택 시 처리 함수
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
                    previewUrl: URL.createObjectURL(file),
                    isNew: true
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
    
    // 이미지 미리보기 렌더링 함수
    const renderImagePreviews = () => {
        imagePreviewContainer.innerHTML = '';
        imageFiles.forEach((imgData) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.dataset.s3Key = imgData.s3_key;
            previewItem.innerHTML = `
                <img src="${imgData.previewUrl}" alt="이미지 미리보기">
                <button type="button" class="btn-delete-image" data-s3-key="${imgData.s3_key}">×</button>
            `;
            imagePreviewContainer.appendChild(previewItem);
        });
    };
    
    // 이미지 삭제 버튼 클릭 시 처리 함수
    const handleImageDelete = (event) => {
        if (!event.target.classList.contains('btn-delete-image')) return;
        const s3KeyToDelete = event.target.dataset.s3Key;
        imageFiles = imageFiles.filter(img => img.s3_key !== s3KeyToDelete);
        renderImagePreviews();
    };

    // --- 이벤트 리스너 및 SortableJS 초기화 ---
    imageUploadInput.addEventListener('change', handleFileSelect);
    postForm.addEventListener('submit', handleFormSubmit);
    imagePreviewContainer.addEventListener('click', handleImageDelete);

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

    // --- 스크립트 실행 시작점 ---
    loadPostData();
});
