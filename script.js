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

    // 設定関連
    const q5Radio = document.getElementById('q5');
    const textQRadio = document.getElementById('text-q');
    const textQuestionSetup = document.getElementById('text-question-setup');
    const imageQuestionSetup = document.getElementById('image-question-setup');
    const questionTextInput = document.getElementById('question-text-input');
    const imageUploadArea = document.getElementById('image-upload-area');

    // トリミングモーダル関連
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropConfirmBtn = document.getElementById('crop-confirm-btn');
    let cropper;
    let currentCropIndex;

    // 音声
    const correctAudio = new Audio('./assets/audio/correct.mp3');
    const incorrectAudio = new Audio('./assets/audio/incorrect.mp3');

    // ゲーム状態
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

    // --- 設定画面のロジック ---
    document.querySelectorAll('input[name="question-type"]').forEach(radio => {
        radio.addEventListener('change', setupQuestionCount);
    });
    document.querySelectorAll('input[name="format-type"]').forEach(radio => {
        radio.addEventListener('change', setupQuestionFormat);
    });

    function setupQuestionCount() {
        gameState.totalQuestions = q5Radio.checked ? 5 : 10;
        gameState.timeLimit = q5Radio.checked ? 30 : 60;
        if (gameState.questionType === 'image') updateImageUploader();
    }

    function setupQuestionFormat() {
        gameState.questionType = textQRadio.checked ? 'text' : 'image';
        if (gameState.questionType === 'text') {
            textQuestionSetup.style.display = 'block';
            imageQuestionSetup.style.display = 'none';
        } else {
            textQuestionSetup.style.display = 'none';
            imageQuestionSetup.style.display = 'block';
            updateImageUploader();
        }
    }

    function updateImageUploader() {
        imageUploadArea.innerHTML = '';
        gameState.imageFiles = Array(gameState.totalQuestions).fill(null);
        for (let i = 0; i < gameState.totalQuestions; i++) {
            const uploader = document.createElement('div');
            uploader.className = 'image-uploader';
            uploader.innerHTML = `<label for="img-upload-${i + 1}">画像 ${i + 1}: </label>
                                <input type="file" id="img-upload-${i + 1}" accept="image/*">
                                <img class="thumbnail-preview" id="thumb-${i + 1}" src="">`;
            imageUploadArea.appendChild(uploader);

            document.getElementById(`img-upload-${i + 1}`).addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    currentCropIndex = i;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        imageToCrop.src = event.target.result;
                        cropModal.classList.add('show');
                        if (cropper) {
                            cropper.destroy();
                        }
                        cropper = new Cropper(imageToCrop, {
                            aspectRatio: 4 / 3, // アスペクト比を4:3に固定
                            viewMode: 1,
                        });
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }
    }
    
    // トリミング決定ボタンの処理
    cropConfirmBtn.addEventListener('click', () => {
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas();
            const dataUrl = croppedCanvas.toDataURL();
            gameState.imageFiles[currentCropIndex] = dataUrl;
            document.getElementById(`thumb-${currentCropIndex + 1}`).src = dataUrl;
            
            cropper.destroy();
            cropper = null;
            cropModal.classList.remove('show');
        }
    });

    // 初期設定
    setupQuestionCount();
    setupQuestionFormat();

    // --- ゲーム開始 ---
    startGameBtn.addEventListener('click', () => {
        gameState.questionText = questionTextInput.value;
        if (gameState.questionType === 'image' && gameState.imageFiles.some(f => f === null)) {
            alert('すべての画像を設定してください。');
            return;
        }
        settingsModal.classList.remove('show');
        initializeGame();
    });

    // --- ゲーム初期化 ---
    function initializeGame() {
        // (中略: この部分は変更なし)
        gameState.timeLeft = gameState.timeLimit;
        gameState.currentPlayer = 0;
        gameState.correctCount = 0;
        gameState.isReversed = false;
        
        calculatePlayerPositions();
        moveBomb(0, false);
        bomb.style.transform = `translateX(${playerPositions[0]}px) scaleX(1)`;

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

    // --- タイマー ---
    // (中略: この部分は変更なし)
    function startTimer() {
        gameState.timer = setInterval(() => {
            gameState.timeLeft--;
            updateTimerDisplay();
            if (gameState.timeLeft <= 0) {
                gameOver();
            }
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

    // --- キー入力処理 (不正解処理を修正) ---
    function handleKeyPress(e) {
        if (gameState.questionType === 'text') {
            if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') && !gameState.isReversed) {
                handleCorrect();
            }
            if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') && gameState.isReversed) {
                handleCorrect();
            }
        } else {
            const keyNum = e.key === '0' ? 10 : parseInt(e.key);
            if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= gameState.totalQuestions) {
                handleImageCorrect(keyNum);
            }
        }
        
        // ★修正点: 不正解の場合は音を鳴らすだけにする
        if (e.key === ' ') {
            e.preventDefault();
            incorrectAudio.play();
        }
    }

    // --- 正解・不正解処理 ---
    // (中略: この部分は変更なし)
    let playerPositions = [];

    function calculatePlayerPositions() {
        playerPositions = [0];
        const playerBoxes = document.querySelectorAll('.player-box');
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
        if (gameState.correctCount === gameState.totalQuestions) {
            gameClear();
        }
    }

    // --- ゲーム終了処理 (引数を削除) ---
    function gameClear() {
        stopTimer();
        document.removeEventListener('keydown', handleKeyPress);
        resultText.textContent = "GAME CLEAR";
        explosionImg.style.display = 'none';
        resultOverlay.classList.add('show');
    }

    // ★修正点: isMistake引数を削除
    function gameOver() {
        stopTimer();
        document.removeEventListener('keydown', handleKeyPress);
        incorrectAudio.play(); // タイマー切れの時の音
        resultText.textContent = "GAME OVER";
        explosionImg.style.display = 'block';
        resultOverlay.classList.add('show');
    }

    window.addEventListener('resize', calculatePlayerPositions);
});
