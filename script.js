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

    // 設定関連 (変更なし)
    const q5Radio = document.getElementById('q5');
    const textQRadio = document.getElementById('text-q');
    const textQuestionSetup = document.getElementById('text-question-setup');
    const imageQuestionSetup = document.getElementById('image-question-setup');
    const questionTextInput = document.getElementById('question-text-input');
    const imageUploadArea = document.getElementById('image-upload-area');

    // トリミングモーダル関連 (変更なし)
    const cropModal = document.getElementById('crop-modal');
    const imageToCrop = document.getElementById('image-to-crop');
    const cropConfirmBtn = document.getElementById('crop-confirm-btn');
    let cropper;
    let currentCropIndex;

    // 音声 (変更なし)
    const correctAudio = new Audio('./assets/audio/correct.mp3');
    const incorrectAudio = new Audio('./assets/audio/incorrect.mp3');

    // ゲーム状態 (変更なし)
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

    // --- 設定画面のロジック --- (変更なし)
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

    // ★★★ここから修正★★★
    function updateImageUploader() {
        imageUploadArea.innerHTML = '';
        gameState.imageFiles = Array(gameState.totalQuestions).fill(null);
        for (let i = 0; i < gameState.totalQuestions; i++) {
            const uploader = document.createElement('div');
            uploader.className = 'image-uploader';
            uploader.innerHTML = `<label for="img-upload-${i + 1}">画像 ${i + 1}: </label>
                                <input type="file" id="img-upload-${i + 1}" accept="image/*" style="display:none;">
                                <button type="button" onclick="document.getElementById('img-upload-${i + 1}').click()">ファイルを選択</button>
                                <img class="thumbnail-preview" id="thumb-${i + 1}" src="">`;
            imageUploadArea.appendChild(uploader);

            document.getElementById(`img-upload-${i + 1}`).addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    currentCropIndex = i; // 現在編集中の画像のインデックスを保存
                    const reader = new FileReader();
                    
                    reader.onload = (event) => {
                        // <img>要素のsrcに画像データをセット
                        imageToCrop.src = event.target.result;
                        
                        // 画像が完全に読み込まれてからCropperを初期化するためのイベントリスナー
                        imageToCrop.onload = () => {
                            cropModal.classList.add('show');
                            
                            // 既存のCropperインスタンスがあれば破棄する
                            if (cropper) {
                                cropper.destroy();
                            }
                            
                            // Cropper.jsを初期化
                            cropper = new Cropper(imageToCrop, {
                                aspectRatio: 4 / 3, // アスペクト比を4:3に固定
                                viewMode: 1, // 切り抜きボックスを画像内に制限
                                background: false,
                            });
                            
                            // onloadイベントは一度きりで良いので削除
                            imageToCrop.onload = null;
                        };
                    };
                    
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
        }
    }
    
    // トリミング決定ボタンの処理
    cropConfirmBtn.addEventListener('click', () => {
        if (cropper) {
            // トリミングされた画像をCanvasとして取得
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 400, // 出力画像の幅
                height: 300 // 出力画像の高さ
            });
            // CanvasをデータURL(base64)に変換
            const dataUrl = croppedCanvas.toDataURL();
            // ゲーム状態で保持する画像データを更新
            gameState.imageFiles[currentCropIndex] = dataUrl;
            // 設定画面のサムネイルも更新
            document.getElementById(`thumb-${currentCropIndex + 1}`).src = dataUrl;
            
            // Cropperインスタンスを破棄
            cropper.destroy();
            cropper = null;
            // モーダルを閉じる
            cropModal.classList.remove('show');
        }
    });
    // ★★★ここまで修正★★★

    // 初期設定 (変更なし)
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

    // --- 以降のコードは変更ありません ---
    // (initializeGame, setupImageGrid, startTimer, stopTimer, updateTimerDisplay, handleKeyPress,
    // calculatePlayerPositions, moveBomb, handleCorrect, handleImageCorrect, checkGameStatus,
    // gameClear, gameOver, resize listener)
    
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
