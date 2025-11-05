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
    const restartBtn = document.getElementById('restart-btn');

    // 音声 (変更なし)
    const CORRECT_SOUND_SRC = './assets/audio/correct.mp3';
    const INCORRECT_SOUND_SRC = './assets/audio/incorrect.mp3';
    function playSound(src) {
        new Audio(src).play();
    }
    
    // ゲームの初期状態を定数として定義 (変更なし)
    const defaultGameState = {
        totalQuestions: 5,
        timeLimit: 30,
        questionType: 'text',
        questionText: '',
        questionSlots: [],
        timer: null,
        timeLeft: 30,
        currentPlayer: 1,
        correctCount: 0,
        isReversed: false,
        imageCorrectStatus: []
    };
    let gameState = { ...defaultGameState };

    // --- 設定画面 (変更なし) ---
    document.querySelectorAll('input[name="question-type"]').forEach(radio => radio.addEventListener('change', setupQuestionCount));
    document.querySelectorAll('input[name="format-type"]').forEach(radio => radio.addEventListener('change', setupQuestionFormat));

    function setupQuestionCount() {
        gameState.totalQuestions = q5Radio.checked ? 5 : 10;
        gameState.timeLimit = q5Radio.checked ? 30 : 60;
        if (gameState.questionType === 'image') updateImageUploader();
    }

    function setupQuestionFormat() {
        gameState.questionType = textQRadio.checked ? 'text' : 'image';
        textQuestionSetup.style.display = 'block';
        if (gameState.questionType === 'image') {
            imageQuestionSetup.style.display = 'block';
            updateImageUploader();
        } else {
            imageQuestionSetup.style.display = 'none';
        }
    }
    
    // --- 画像/テキストアップロード処理 (変更なし) ---
    function updateImageUploader() {
        imageUploadArea.innerHTML = '';
        gameState.questionSlots = [];
        for (let i = 0; i < gameState.totalQuestions; i++) {
            gameState.questionSlots[i] = { type: 'image', data: null };
            const slotContainer = document.createElement('div');
            slotContainer.className = 'image-uploader';
            slotContainer.innerHTML = `
                <div class="slot-config" data-index="${i}">
                    <strong>問題 ${i + 1}:</strong>
                    <div class="slot-type-selector">
                        <input type="radio" id="type-img-${i}" name="q-type-${i}" value="image" checked> <label for="type-img-${i}">画像</label>
                        <input type="radio" id="type-txt-${i}" name="q-type-${i}" value="text"> <label for="type-txt-${i}">テキスト</label>
                    </div>
                    <div class="slot-input-area">
                        <div class="image-input-area">
                            <input type="file" class="image-input" accept="image/*" style="display:none;">
                            <button type="button" class="select-btn">ファイルを選択</button>
                            <img class="thumbnail-preview" src="">
                        </div>
                        <div class="text-input-area" style="display:none;">
                            <textarea class="text-input-slot" rows="3" placeholder="テキストを入力（改行も可能です）"></textarea>
                        </div>
                    </div>
                </div>
            `;
            imageUploadArea.appendChild(slotContainer);
        }
    }

    imageUploadArea.addEventListener('change', (e) => {
        const target = e.target;
        const slotConfig = target.closest('.slot-config');
        if (!slotConfig) return;
        const index = parseInt(slotConfig.dataset.index, 10);
        if (target.matches('input[type="radio"]')) {
            const type = target.value;
            gameState.questionSlots[index].type = type;
            gameState.questionSlots[index].data = null;
            const imageArea = slotConfig.querySelector('.image-input-area');
            const textArea = slotConfig.querySelector('.text-input-area');
            imageArea.style.display = (type === 'image') ? 'block' : 'none';
            textArea.style.display = (type === 'text') ? 'block' : 'none';
            slotConfig.querySelector('.thumbnail-preview').src = '';
            slotConfig.querySelector('.text-input-slot').value = '';
        }
        else if (target.matches('.image-input')) {
            const file = target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                gameState.questionSlots[index].data = event.target.result;
                slotConfig.querySelector('.thumbnail-preview').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    imageUploadArea.addEventListener('input', (e) => {
        if (e.target.matches('.text-input-slot')) {
            const slotConfig = e.target.closest('.slot-config');
            const index = parseInt(slotConfig.dataset.index, 10);
            gameState.questionSlots[index].data = e.target.value;
        }
    });

    imageUploadArea.addEventListener('click', (e) => {
        if (e.target.matches('.select-btn')) {
            e.target.closest('.image-input-area').querySelector('.image-input').click();
        }
    });

    // --- ゲーム開始から終了までのロジック ---
    setupQuestionCount();
    setupQuestionFormat();

    startGameBtn.addEventListener('click', () => {
        gameState.questionText = questionTextInput.value;
        if (gameState.questionType === 'image') {
            const allSlotsFilled = gameState.questionSlots.every(slot => slot.data);
            if (!allSlotsFilled) {
                alert('すべての問題の内容（画像またはテキスト）を設定してください。');
                return;
            }
        }
        settingsModal.classList.remove('show');
        initializeGame();
    });
    
    // =================================================================
    // ★★★ ここからが修正箇所です (処理順序の変更) ★★★
    // =================================================================
    function initializeGame() {
        // 1. ゲーム状態をリセット
        gameState.timeLeft = gameState.timeLimit;
        gameState.currentPlayer = 1;
        gameState.correctCount = 0;
        gameState.isReversed = false;
        
        // 2. 問題文と画面レイアウトを先に設定する
        questionDisplay.textContent = gameState.questionText;
        if (gameState.questionType === 'text') {
            playerTrack.style.display = 'flex'; // ★先に表示する
            imageGrid.style.display = 'none';
        } else {
            playerTrack.style.display = 'none';
            imageGrid.style.display = 'grid'; // ★先に表示する
            setupImageGrid();
            gameState.imageCorrectStatus = Array(gameState.totalQuestions).fill(false);
        }

        // 3. 画面が表示されてから、位置を計算する
        calculatePlayerPositions();

        // 4. 爆弾を初期位置に配置
        moveBomb(1, false);

        // 5. ゲームを開始
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
        gameState.questionSlots.forEach((slot, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            let contentHtml = '';
            if (slot.type === 'image') {
                contentHtml = `<img src="${slot.data}" class="question-image">`;
            } else {
                const formattedText = (slot.data || '').replace(/\n/g, '<br>');
                contentHtml = `<div class="text-item-content">${formattedText}</div>`;
            }
            item.innerHTML = `
                ${contentHtml}
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
            playSound(INCORRECT_SOUND_SRC);
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
        // playerIndexが不正な値(nullやundefined)の場合、動かさない
        if(!playerPositions[playerIndex]) return;
        
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
            if (gameState.currentPlayer > 1) gameState.currentPlayer--;
        } else {
            if (gameState.currentPlayer < 5) gameState.currentPlayer++;
        }
        playSound(CORRECT_SOUND_SRC);
        moveBomb(gameState.currentPlayer);
        checkGameStatus();
    }

    function handleImageCorrect(num) {
        if (gameState.imageCorrectStatus[num - 1]) return;
        gameState.imageCorrectStatus[num - 1] = true;
        playSound(CORRECT_SOUND_SRC);
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
        playSound(INCORRECT_SOUND_SRC);
        resultText.textContent = "GAME OVER";
        explosionImg.style.display = 'block';
        resultOverlay.classList.add('show');
    }

    window.addEventListener('resize', calculatePlayerPositions);

    function resetGame() {
        resultOverlay.classList.remove('show');
        settingsModal.classList.add('show');
        gameState = { ...defaultGameState };
        q5Radio.checked = true;
        textQRadio.checked = true;
        questionTextInput.value = '';
        setupQuestionFormat();
        playerTrack.style.display = 'none';
        imageGrid.style.display = 'none';
    }
    restartBtn.addEventListener('click', resetGame);
});
