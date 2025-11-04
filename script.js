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
        currentPlayer: 1,
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

    // =================================================================
    // ★★★ ここからが修正箇所です ★★★
    // =================================================================
    function setupQuestionFormat() {
        gameState.questionType = textQRadio.checked ? 'text' : 'image';
        
        // 問題文入力欄は常に表示
        textQuestionSetup.style.display = 'block';

        // 画像アップロード欄だけ表示を切り替える
        if (gameState.questionType === 'image') {
            imageQuestionSetup.style.display = 'block';
            updateImageUploader();
        } else {
            imageQuestionSetup.style.display = 'none';
        }
    }
    // =================================================================
    // ★★★ 修正箇所はここまでです ★★★
    // =================================================================

    
    // --- 画像アップロード処理 (変更なし) ---
    function updateImageUploader() {
        imageUploadArea.innerHTML = '';
        gameState.imageFiles = Array(gameState.totalQuestions).fill(null);
        for (let i = 0; i < gameState.totalQuestions; i++) {
            imageUploadArea.insertAdjacentHTML('beforeend', `
                <div class="image-uploader">
                    <label>画像 ${i + 1}: </label>
                    <input type="file" class="image-input" data-index="${i}" accept="image/*" style="display:none;">
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

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                gameState.imageFiles[index] = dataUrl;
                document.getElementById(`thumb-${index}`).src = dataUrl;
            };
            reader.onerror = () => {
                alert("ファイルの読み込みに失敗しました。");
            };
            reader.readAsDataURL(file);
        }
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


    // =================================================================
    // ★★★ ここからが修正箇所です ★★★
    // =================================================================
    function initializeGame() {
        gameState.timeLeft = gameState.timeLimit;
        gameState.currentPlayer = 1;
        gameState.correctCount = 0;
        gameState.isReversed = false;
        
        calculatePlayerPositions();
        moveBomb(1, false);

        // ★常に問題文を表示するように変更
        questionDisplay.textContent = gameState.questionText;

        if (gameState.questionType === 'text') {
            playerTrack.style.display = 'flex';
            imageGrid.style.display = 'none';
        } else { // 画像問題
            playerTrack.style.display = 'none';
            imageGrid.style.display = 'grid';
            setupImageGrid();
            gameState.imageCorrectStatus = Array(gameState.totalQuestions).fill(false);
        }

        updateTimerDisplay();
        startTimer();
        document.addEventListener('keydown', handleKeyPress);
    }
    // =================================================================
    // ★★★ 修正箇所はここまでです ★★★
    // =================================================================


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
        playerPositions = [null]; 
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
        gameState.correctCount++;

        if (gameState.isReversed) {
            if (gameState.currentPlayer > 1) {
                gameState.currentPlayer--;
            }
        } else {
            if (gameState.currentPlayer < 5) {
                gameState.currentPlayer++;
            }
        }
        correctAudio.play();
        moveBomb(gameState.currentPlayer);
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
            moveBomb(gameState.currentPlayer, false);
            gameState.isReversed = true;
            bomb.style.transform = `translateX(${playerPositions[gameState.currentPlayer]}px) scaleX(-1)`;
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
