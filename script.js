document.addEventListener('DOMContentLoaded', () => {
    // DOM要素
    const settingsModal = document.getElementById('settings-modal');
    const startGameBtn = document.getElementById('start-game-btn');
    const questionDisplay = document.getElementById('question-display');
    const timerDisplay = document.getElementById('timer');
    const playerTrack = document.getElementById('player-track');
    const bomb = document.getElementById('bomb');
    const resultOverlay = document.getElementById('result-overlay');
    const resultText = document.getElementById('result-text');
    const explosionImg = document.getElementById('explosion-img');
    const imageGrid = document.getElementById('image-grid');
    const q5Radio = document.getElementById('q5');
    const textQRadio = document.getElementById('text-q');
    const textQuestionSetup = document.getElementById('text-question-setup');
    const imageQuestionSetup = document.getElementById('image-question-setup');
    const questionTextInput = document.getElementById('question-text-input');
    const imageUploadArea = document.getElementById('image-upload-area');
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropConfirmBtn = document.getElementById('crop-confirm-btn');

    // 音声
    const correctAudio = new Audio('./assets/audio/correct.mp3');
    const incorrectAudio = new Audio('./assets/audio/incorrect.mp3');

    // グローバル変数
    let cropper;
    let currentCropIndex;
    let gameState = {
        totalQuestions: 5,
        timeLimit: 30,
        questionType: 'text',
        questionText: '',
        imageFiles: [],
        timer: null,
        timeLeft: 30,
        currentPlayer: 0,
        correctCount: 0,
        isReversed: false,
        imageCorrectStatus: []
    };

    // --- 設定画面 ---
    document.querySelectorAll('input[name="question-type"]').forEach(radio => radio.addEventListener('change', setupQuestionCount));
    document.querySelectorAll('input[name="format-type"]').forEach(radio => radio.addEventListener('change', setupQuestionFormat));

    function setupQuestionCount() {
        gameState.totalQuestions = q5Radio.checked ? 5 : 10;
        gameState.timeLimit = q5Radio.checked ? 30 : 60;
        if (gameState.questionType === 'image') updateImageUploader();
    }

    function setupQuestionFormat() {
        gameState.questionType = textQRadio.checked ? 'text' : 'image';
        textQuestionSetup.style.display = (gameState.questionType === 'text') ? 'block' : 'none';
        imageQuestionSetup.style.display = (gameState.questionType === 'image') ? 'block' : 'none';
        if (gameState.questionType === 'image') {
            updateImageUploader();
        }
    }
    
    // --- 画像アップロードとトリミング処理 (CMYK対応版) ---

    function updateImageUploader() {
        imageUploadArea.innerHTML = '';
        gameState.imageFiles = Array(gameState.totalQuestions).fill(null);
        for (let i = 0; i < gameState.totalQuestions; i++) {
            imageUploadArea.insertAdjacentHTML('beforeend', `
                <div class="image-uploader">
                    <label>画像 ${i + 1}: </label>
                    <input type="file" class="image-input" data-index="${i}" accept="image/*,.jpg,.jpeg,.png" style="display:none;">
                    <button type="button" class="select-btn" data-index="${i}">ファイルを選択</button>
                    <img class="thumbnail-preview" id="thumb-${i}" src="">
                </div>
            `);
        }
    }

    imageUploadArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('select-btn')) {
            const index = e.target.dataset.index;
            imageUploadArea.querySelector(`.image-input[data-index="${index}"]`).click();
        }
    });

    imageUploadArea.addEventListener('change', async (e) => {
        if (e.target.classList.contains('image-input')) {
            const index = e.target.dataset.index;
            const file = e.target.files[0];
            if (!file) return;

            try {
                const arrayBuffer = await file.arrayBuffer();
                let imageDataUrl;
                const isCmyk = jpegCmyk.isCmyk(arrayBuffer);

                if (isCmyk) {
                    console.log("CMYK画像を検出しました。RGBに変換します。");
                    const rgbData = jpegCmyk.decode(arrayBuffer);
                    imageDataUrl = await createDataUrlFromRgb(rgbData);
                } else {
                    console.log("RGB画像です。");
                    imageDataUrl = await readFileAsDataURL(file);
                }
                prepareCropper(imageDataUrl, index);
            } catch (error) {
                console.error("画像処理中にエラーが発生しました:", error);
                alert("画像の処理に失敗しました。ファイルが破損しているか、非対応の形式の可能性があります。");
            }
        }
    });

    function createDataUrlFromRgb({ width, height, data }) {
        return new Promise(resolve => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(width, height);
            imageData.data.set(data);
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        });
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    }

    function prepareCropper(dataUrl, index) {
        currentCropIndex = index;
        imageToCrop.src = dataUrl;
        cropModal.classList.add('show');
        if (cropper) cropper.destroy();
        imageToCrop.onload = () => {
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 4 / 3, viewMode: 1, background: false, autoCropArea: 1,
            });
            imageToCrop.onload = null;
        };
        imageToCrop.onerror = () => {
            alert("画像の表示に失敗しました。");
            cropModal.classList.remove('show');
            imageToCrop.onerror = null;
        };
    }
    
    cropConfirmBtn.addEventListener('click', () => {
        if (!cropper || !cropper.cropped) return;
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 400, height: 300, imageSmoothingQuality: 'high',
        });
        const dataUrl = croppedCanvas.toDataURL();
        gameState.imageFiles[currentCropIndex] = dataUrl;
        document.getElementById(`thumb-${currentCropIndex}`).src = dataUrl;
        cropper.destroy();
        cropper = null;
        cropModal.classList.remove('show');
    });

    // --- ゲーム開始から終了までのロジック ---
    setupQuestionCount();
    setupQuestionFormat();

    startGameBtn.addEventListener('click', () => {
        gameState.questionText = questionTextInput.value;
        if (gameState.questionType === 'image' && gameState.imageFiles.some(f => f === null)) {
            alert('すべての画像を設定してください。');
            return;
        }
        settingsModal.classList.remove('show');
        initializeGame();
    });

    function initializeGame() {
        gameState.timeLeft = gameState.timeLimit;
        gameState.currentPlayer = 0;
        gameState.correctCount = 0;
        gameState.isReversed = false;
        
        calculatePlayerPositions();
        moveBomb(0, false);

        if (gameState.questionType === 'text') {
            questionDisplay.textContent = gameState.questionText;
            playerTrack.style.display = 'flex';
            imageGrid.style.display = 'none';
        } else {
            questionDisplay.textContent = '';
            playerTrack.style.display = 'none';
            imageGrid.style.display = 'grid';
            setupImageGrid();
            gameState.imageCorrectStatus = Array(gameState.totalQuestions).fill(false);
        }

        updateTimerDisplay();
        startTimer();
        document.addEventListener('keydown', handleKeyPress);
    }

    function setupImageGrid() {
        imageGrid.innerHTML = '';
        imageGrid.className = `image-grid q${gameState.totalQuestions}`;
        gameState.imageFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `
                <img src="${file}" class="question-image">
                <div class="number-tag">${index + 1}</div>
                <div class="correct-mark" id="mark-${index + 1}"></div>
            `;
            imageGrid.appendChild(item);
        });
    }

    function startTimer() {
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            updateTimerDisplay();
            if (gameState.timeLeft <= 0) gameOver();
        }, 1000);
    }

    function stopTimer() {
        clearInterval(gameState.timer);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(gameState.timeLeft / 60).toString().padStart(2, '0');
        const seconds = (gameState.timeLeft % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;
    }

    function handleKeyPress(e) {
        if (gameState.questionType === 'text') {
            if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') && !gameState.isReversed) handleCorrect();
            if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') && gameState.isReversed) handleCorrect();
        } else {
            const keyNum = e.key === '0' ? 10 : parseInt(e.key, 10);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= gameState.totalQuestions) handleImageCorrect(keyNum);
        }
        if (e.key === ' ') {
            e.preventDefault();
            incorrectAudio.play();
        }
    }

    let playerPositions = [];
    function calculatePlayerPositions() {
        playerPositions = [0];
        const playerBoxes = document.querySelectorAll('.player-box');
        if (playerBoxes.length === 0) return;
        const trackRect = playerTrack.getBoundingClientRect();
        const bombWidth = bomb.getBoundingClientRect().width;
        playerBoxes.forEach(box => {
            const boxRect = box.getBoundingClientRect();
            const centerPos = (boxRect.left - trackRect.left) + (boxRect.width / 2) - (bombWidth / 2);
            playerPositions.push(centerPos);
        });
    }

    function moveBomb(playerIndex, animate = true) {
        if (!animate) bomb.style.transition = 'none';
        bomb.style.transform = `translateX(${playerPositions[playerIndex]}px) ${gameState.isReversed ? 'scaleX(-1)' : 'scaleX(1)'}`;
        if (!animate) {
            bomb.offsetHeight; 
            bomb.style.transition = 'transform 0.5s ease-in-out';
        }
    }

    function handleCorrect() {
        if (gameState.isReversed) {
            if (gameState.currentPlayer <= 1) return;
            gameState.currentPlayer--;
        } else {
            if (gameState.currentPlayer >= 5) return;
            gameState.currentPlayer++;
        }
        correctAudio.play();
        moveBomb(gameState.currentPlayer);
        gameState.correctCount++;
        checkGameStatus();
    }



    function handleImageCorrect(num) {
        if (gameState.imageCorrectStatus[num - 1]) return;
        gameState.imageCorrectStatus[num - 1] = true;
        correctAudio.play();
        document.getElementById(`mark-${num}`).classList.add('show');
        gameState.correctCount++;
        checkGameStatus();
    }

    function checkGameStatus() {
        if (gameState.totalQuestions === 10 && gameState.correctCount === 5) {
            stopTimer();
            bomb.style.transition = 'none';
            moveBomb(5, false);
            gameState.isReversed = true;
            bomb.style.transform = `translateX(${playerPositions[5]}px) scaleX(-1)`;
            setTimeout(() => {
                bomb.style.transition = 'transform 0.5s ease-in-out';
                startTimer();
            }, 1500);
        }
        if (gameState.correctCount === gameState.totalQuestions) gameClear();
    }

    function gameClear() {
        stopTimer();
        document.removeEventListener('keydown', handleKeyPress);
        resultText.textContent = "GAME CLEAR";
        explosionImg.style.display = 'none';
        resultOverlay.classList.add('show');
    }

    function gameOver() {
        stopTimer();
        document.removeEventListener('keydown', handleKeyPress);
        incorrectAudio.play();
        resultText.textContent = "GAME OVER";
        explosionImg.style.display = 'block';
        resultOverlay.classList.add('show');
    }

    window.addEventListener('resize', calculatePlayerPositions);
});
