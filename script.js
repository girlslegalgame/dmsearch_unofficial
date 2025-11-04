document.addEventListener('DOMContentLoaded', () => {
    // DOM要素 (変更なし)
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

    // 音声 (変更なし)
    const correctAudio = new Audio('./assets/audio/correct.mp3');
    const incorrectAudio = new Audio('./assets/audio/incorrect.mp3');

    // グローバル変数 (変更なし)
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

    // --- 設定画面のロジック (変更なし) ---
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
        textQuestionSetup.style.display = (gameState.questionType === 'text') ? 'block' : 'none';
        imageQuestionSetup.style.display = (gameState.questionType === 'image') ? 'block' : 'none';
        if (gameState.questionType === 'image') {
            updateImageUploader();
        }
    }

    // =================================================================
    // ★★★ ここからが修正箇所です ★★★
    // =================================================================

    function updateImageUploader() {
        imageUploadArea.innerHTML = '';
        gameState.imageFiles = Array(gameState.totalQuestions).fill(null);
        for (let i = 0; i < gameState.totalQuestions; i++) {
            const uploader = document.createElement('div');
            uploader.className = 'image-uploader';
            uploader.innerHTML = `
                <label for="img-upload-${i}">画像 ${i + 1}: </label>
                <input type="file" id="img-upload-${i}" accept="image/*" style="display:none;">
                <button type="button" class="select-btn">ファイルを選択</button>
                <img class="thumbnail-preview" id="thumb-${i}" src="">
            `;
            imageUploadArea.appendChild(uploader);

            // ボタンクリックでinputを発火させる
            uploader.querySelector('.select-btn').addEventListener('click', () => {
                document.getElementById(`img-upload-${i}`).click();
            });

            // ファイルが選択されたときの処理
            document.getElementById(`img-upload-${i}`).addEventListener('change', (e) => {
                handleFileSelect(e, i);
            });
        }
    }

    // ファイル選択後の処理を独立した関数に
    function handleFileSelect(event, index) {
        const file = event.target.files[0];
        if (!file) return;

        currentCropIndex = index;
        const reader = new FileReader();

        reader.onload = (e) => {
            // 既存のCropperインスタンスがあれば破棄
            if (cropper) {
                cropper.destroy();
            }
            // 画像をセットしてモーダル表示
            imageToCrop.src = e.target.result;
            cropModal.classList.add('show');

            // Cropper.jsを初期化
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 4 / 3,
                viewMode: 1,
                background: false,
                autoCropArea: 1,
            });
        };

        reader.readAsDataURL(file);
    }

    // トリミング決定ボタンの処理
    cropConfirmBtn.addEventListener('click', () => {
        if (!cropper) return;

        // トリミング後のCanvasを取得
        const croppedCanvas = cropper.getCroppedCanvas({
            width: 400,
            height: 300,
            imageSmoothingQuality: 'high',
        });

        // データURLに変換して保存
        const dataUrl = croppedCanvas.toDataURL();
        gameState.imageFiles[currentCropIndex] = dataUrl;
        document.getElementById(`thumb-${currentCropIndex}`).src = dataUrl;

        // Cropperインスタンスを破棄し、モーダルを閉じる
        cropper.destroy();
        cropper = null;
        cropModal.classList.remove('show');
    });

    // =================================================================
    // ★★★ 修正箇所はここまでです ★★★
    // =================================================================


    // 初期設定
    setupQuestionCount();
    setupQuestionFormat();

    // --- ゲーム開始 --- (変更なし)
    startGameBtn.addEventListener('click', () => {
        gameState.questionText = questionTextInput.value;
        if (gameState.questionType === 'image' && gameState.imageFiles.some(f => f === null)) {
            alert('すべての画像を設定してください。');
            return;
        }
        settingsModal.classList.remove('show');
        initializeGame();
    });
    
    // --- 以降のゲームロジック (変更なし) ---
    
    function initializeGame() {
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
        if (gameState.correctCount === gameState.totalQuestions) {
            gameClear();
        }
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
