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
    const imageQRadio = document.getElementById('image-q');
    const textQuestionSetup = document.getElementById('text-question-setup');
    const imageQuestionSetup = document.getElementById('image-question-setup');
    const questionTextInput = document.getElementById('question-text-input');
    const imageUploadArea = document.getElementById('image-upload-area');

    // 音声
    const correctAudio = new Audio('./assets/audio/correct.mp3');
    const incorrectAudio = new Audio('./assets/audio/incorrect.mp3');

    // ゲーム状態
    let gameState = {
        totalQuestions: 5,
        timeLimit: 30,
        questionType: 'text', // 'text' or 'image'
        questionText: '',
        imageFiles: [],
        timer: null,
        timeLeft: 30,
        currentPlayer: 0, // 0: start, 1-5: players
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
        updateImageUploader();
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
            uploader.innerHTML = `<label for="img-upload-${i+1}">画像 ${i+1}: </label>
                                <input type="file" id="img-upload-${i+1}" accept="image/*">`;
            imageUploadArea.appendChild(uploader);
            
            document.getElementById(`img-upload-${i+1}`).addEventListener('change', (e) => {
                if(e.target.files[0]) {
                    gameState.imageFiles[i] = URL.createObjectURL(e.target.files[0]);
                }
            });
        }
    }
    
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
        gameState.timeLeft = gameState.timeLimit;
        gameState.currentPlayer = 0;
        gameState.correctCount = 0;
        gameState.isReversed = false;
        
        // プレイヤーの位置を計算
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
    
    // 画像グリッドのセットアップ
    function setupImageGrid() {
        imageGrid.innerHTML = '';
        imageGrid.className = `image-grid q${gameState.totalQuestions}`;

        if(gameState.totalQuestions === 10) {
            imageGrid.style.gridTemplateRows = '1fr 1fr 1fr';
        }

        gameState.imageFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `
                <img src="${file}" class="question-image">
                <div class="number-tag">${index + 1}</div>
                <div class="correct-mark" id="mark-${index+1}"></div>
            `;
            // 10問の最後の行のレイアウト調整
            if (gameState.totalQuestions === 10 && index >= 8) {
                item.style.gridColumn = `span 2`;
            }
            imageGrid.appendChild(item);
        });
    }

    // --- タイマー ---
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

    // --- キー入力処理 ---
    function handleKeyPress(e) {
        if (gameState.questionType === 'text') {
            // 正解: 右矢印 or Dキー
            if ((e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') && !gameState.isReversed) {
                handleCorrect();
            }
            // 正解 (折り返し): 左矢印 or Aキー
            if ((e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') && gameState.isReversed) {
                handleCorrect();
            }
        } else { // 画像問題
             const keyNum = e.key === '0' ? 10 : parseInt(e.key);
             if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= gameState.totalQuestions) {
                 handleImageCorrect(keyNum);
             }
        }
        
        // 不正解: スペースキー
        if (e.key === ' ') {
            e.preventDefault();
            gameOver(true); // 即時ゲームオーバー
        }
    }

    // --- 正解・不正解処理 ---
    let playerPositions = [];

    function calculatePlayerPositions() {
        playerPositions = [0]; // 初期位置
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
        if (!animate) {
            bomb.style.transition = 'none';
        }
        bomb.style.transform = `translateX(${playerPositions[playerIndex]}px) ${gameState.isReversed ? 'scaleX(-1)' : 'scaleX(1)'}`;
        if (!animate) {
            // DOMの再描画を強制して即時反映
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
        if (gameState.imageCorrectStatus[num - 1]) return; // 既に正解済み

        gameState.imageCorrectStatus[num - 1] = true;
        correctAudio.play();
        document.getElementById(`mark-${num}`).classList.add('show');
        gameState.correctCount++;
        
        checkGameStatus();
    }

    function checkGameStatus() {
        // 10問モードの折り返し処理
        if (gameState.totalQuestions === 10 && gameState.correctCount === 5) {
            stopTimer(); // タイマーを一時停止
            bomb.style.transition = 'none'; // 移動アニメーションをなくす
            
            // 爆弾を5人目の位置に固定し、向きを反転
            moveBomb(5, false);
            gameState.isReversed = true;
            bomb.style.transform = `translateX(${playerPositions[5]}px) scaleX(-1)`;

            setTimeout(() => { // 少し間を置いてから再開
                bomb.style.transition = 'transform 0.5s ease-in-out';
                startTimer();
            }, 1500); // 1.5秒待つ
        }

        // クリア判定
        if (gameState.correctCount === gameState.totalQuestions) {
            gameClear();
        }
    }

    // --- ゲーム終了処理 ---
    function gameClear() {
        stopTimer();
        document.removeEventListener('keydown', handleKeyPress);
        resultText.textContent = "GAME CLEAR";
        explosionImg.style.display = 'none';
        resultOverlay.classList.add('show');
    }

    function gameOver(isMistake = false) {
        stopTimer();
        document.removeEventListener('keydown', handleKeyPress);
        incorrectAudio.play();
        resultText.textContent = "GAME OVER";
        explosionImg.style.display = 'block';
        resultOverlay.classList.add('show');
    }

    // ウィンドウリサイズ時にプレイヤー位置を再計算
    window.addEventListener('resize', calculatePlayerPositions);
});
