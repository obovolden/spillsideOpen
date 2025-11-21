// ===================================================================
// SIKKER OPPSTART (Venter til HTML er ferdig lastet)
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("Spillet laster...");
    initGame();
});

function initGame() {
    // ===================================================================
    // SEKSJON 1: KONSTANTER OG ELEMENTER
    // ===================================================================

    const canvas = document.getElementById('tetris-board');
    if (!canvas) {
        console.error("Fant ikke canvas! Sjekk index.html");
        return;
    }
    const ctx = canvas.getContext('2d');
    
    const scoreElement = document.getElementById('score');
    const gameOverElement = document.getElementById('game-over');

    // Sidepaneler
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas ? nextCanvas.getContext('2d') : null;
    const holdCanvas = document.getElementById('hold-canvas');
    const holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
    
    const levelElement = document.getElementById('level-display');
    const linesElement = document.getElementById('lines-display');
    const pauseButton = document.getElementById('pause-button');
    const pauseMessage = document.getElementById('pause-message');
    const restartButton = document.getElementById('restart-button');

    // Mobil knapper (Henter dem trygt)
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnDown = document.getElementById('btn-down');
    const btnRotate = document.getElementById('btn-rotate');
    const btnDrop = document.getElementById('btn-drop');

    // Highscore elementer
    const highscoreListElement = document.getElementById('highscore-list');
    const modalElement = document.getElementById('highscore-modal');
    const nameInput = document.getElementById('player-name-input');
    const saveButton = document.getElementById('save-score-button');

// Spill-konstanter
    const ROWS = 25; // Endret fra 20 (Høyere brett)
    const COLS = 14; // Endret fra 12 (Bredere brett)
    const BLOCK_SIZE = 25;
    const SIDE_CANVAS_BLOCK_SIZE = 20;

    // Sett størrelse
    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;

    const COLORS = [null, '#00EFFF', '#2F3FFF', '#FFAF00', '#FFFF00', '#00FF00', '#AF00FF', '#FF0000'];
    const SHAPES = [
        [],
        [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
        [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
        [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
        [[4, 4], [4, 4]], // O
        [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S
        [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
        [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
    ];

    // State variabler
    let board = [];
    let score = 0;
    let level = 1;
    let linesClearedTotal = 0;
    let gameOver = false;

    let activePiece = null;
    let nextPiece = null;
    let heldPiece = null;
    let canSwap = true;

    let gameInterval = null;
    let dropSpeed = 800;
    let isPaused = false;

    let highscores = []; 
    let pendingScore = 0;

    // ===================================================================
    // SEKSJON 2: FUNKSJONER
    // ===================================================================

    function drawBlock(targetCtx, x, y, color, size) {
        targetCtx.fillStyle = color;
        targetCtx.fillRect(x * size, y * size, size, size);
        
        targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        targetCtx.lineWidth = 2; 
        targetCtx.strokeRect(x * size, y * size, size, size);
    }

    function drawBoard() {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] > 0) drawBlock(ctx, c, r, COLORS[board[r][c]], BLOCK_SIZE);
            }
        }
    }

    function drawPiece() {
        if (!activePiece) return;
        activePiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) drawBlock(ctx, activePiece.x + x, activePiece.y + y, COLORS[value], BLOCK_SIZE);
            });
        });
    }

    function drawGhostPiece() {
        if (!activePiece) return;
        let ghostY = activePiece.y;
        while (isValidMove(activePiece.x, ghostY + 1, activePiece.shape)) ghostY++;
        const color = 'rgba(200, 200, 200, 0.15)';
        
        ctx.fillStyle = color;
        activePiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    ctx.fillRect((activePiece.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }

    function drawSidePiece(piece, context, element) {
        if (!context || !element) return;
        context.fillStyle = '#111827';
        context.fillRect(0, 0, element.width, element.height);
        
        if (!piece) return;
        const shape = piece.shape;
        const color = COLORS[piece.colorId];
        const offsetX = (element.width / SIDE_CANVAS_BLOCK_SIZE - shape[0].length) / 2;
        const offsetY = (element.height / SIDE_CANVAS_BLOCK_SIZE - shape.length) / 2;
        
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    // Forenklet tegning for sidepaneler
                    context.fillStyle = color;
                    context.fillRect((x + offsetX) * SIDE_CANVAS_BLOCK_SIZE, (y + offsetY) * SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE);
                    context.strokeRect((x + offsetX) * SIDE_CANVAS_BLOCK_SIZE, (y + offsetY) * SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE);
                }
            });
        });
    }

    function draw() {
        if (gameOver || isPaused) return; 
        drawBoard();
        drawGhostPiece();
        drawPiece();
        drawSidePiece(nextPiece, nextCtx, nextCanvas);
        drawSidePiece(heldPiece, holdCtx, holdCanvas);
    }

    function createEmptyBoard() {
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    }

    function generateNewPiece() {
        const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
        const shape = SHAPES[typeId];
        return { shape: shape, colorId: typeId, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
    }

    function spawnPiece() {
        activePiece = nextPiece; 
        nextPiece = generateNewPiece();
        canSwap = true; 

        if (!isValidMove(activePiece.x, activePiece.y, activePiece.shape)) {
            gameOver = true;
            showGameOver(); 
            clearInterval(gameInterval); 
        }
    }

    function holdSwap() {
        if (!canSwap) return; 
        if (heldPiece === null) {
            heldPiece = activePiece;
            spawnPiece();
        } else {
            [activePiece, heldPiece] = [heldPiece, activePiece];
            activePiece.x = Math.floor(COLS / 2) - Math.floor(activePiece.shape[0].length / 2);
            activePiece.y = 0;
            if (!isValidMove(activePiece.x, activePiece.y, activePiece.shape)) {
                [activePiece, heldPiece] = [heldPiece, activePiece];
                return; 
            }
        }
        canSwap = false; 
        draw();
    }

    function isValidMove(x, y, shape) {
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] > 0) { 
                    let newX = x + c;
                    let newY = y + r;
                    if (newX < 0 || newX >= COLS || newY >= ROWS) return false;
                    if (newY < 0) continue; 
                    if (board[newY][newX] > 0) return false;
                }
            }
        }
        return true;
    }

    function lockPiece() {
        activePiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    if (activePiece.y + y < 0) {
                        gameOver = true; 
                    } else {
                        board[activePiece.y + y][activePiece.x + x] = value;
                    }
                }
            });
        });
    }

    function rotatePiece() {
        const N = activePiece.shape.length;
        let newShape = Array.from({ length: N }, () => Array(N).fill(0));
        for (let r = 0; r < N; r++) {
            for (let c = 0; c < N; c++) {
                newShape[c][N - 1 - r] = activePiece.shape[r][c];
            }
        }
        if (isValidMove(activePiece.x, activePiece.y, newShape)) activePiece.shape = newShape;
        else if (isValidMove(activePiece.x + 1, activePiece.y, newShape)) { activePiece.x++; activePiece.shape = newShape; }
        else if (isValidMove(activePiece.x - 1, activePiece.y, newShape)) { activePiece.x--; activePiece.shape = newShape; }
    }

    function clearLines() {
        let linesCleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (board[r].every(cell => cell > 0)) {
                board.splice(r, 1); 
                board.unshift(Array(COLS).fill(0)); 
                linesCleared++;
                r++;
            }
        }

        if (linesCleared > 0) {
            const basePoints = [0, 100, 300, 500, 800];
            let points = basePoints[linesCleared] || (linesCleared * 200);
            
            // Boost: 1.5x poeng
            score += Math.floor(points * level * 1.5); 
            if(scoreElement) scoreElement.textContent = score;
            
            linesClearedTotal += linesCleared;
            const linesPerLevel = 10;
            let newLevel = Math.floor(linesClearedTotal / linesPerLevel) + 1;
            let currentLevelLines = linesClearedTotal % linesPerLevel;
            
            if(linesElement) linesElement.textContent = `Linjer: ${currentLevelLines} / ${linesPerLevel}`;
            
            if (newLevel > level) {
                level = newLevel;
                if(levelElement) levelElement.textContent = level;
                dropSpeed = Math.max(100, 800 - (level - 1) * 50);
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, dropSpeed);
            }
        }
    }

    function showGameOver() {
        if(gameOverElement) gameOverElement.style.display = 'block';
        checkAndSaveHighscore(score);
    }

    function gameLoop() {
        if (gameOver || isPaused) return;

        if (isValidMove(activePiece.x, activePiece.y + 1, activePiece.shape)) {
            activePiece.y++;
        } else {
            lockPiece();
            clearLines();
            if (gameOver) {
                showGameOver();
                clearInterval(gameInterval);
            } else {
                spawnPiece();
            }
        }
        draw();
    }

    // ===================================================================
    // SEKSJON 3: KONTROLLER
    // ===================================================================

    function moveLeft() { if (!gameOver && !isPaused && isValidMove(activePiece.x - 1, activePiece.y, activePiece.shape)) { activePiece.x--; draw(); } }
    function moveRight() { if (!gameOver && !isPaused && isValidMove(activePiece.x + 1, activePiece.y, activePiece.shape)) { activePiece.x++; draw(); } }
    function performRotate() { if (!gameOver && !isPaused) { rotatePiece(); draw(); } }
    function moveDown() { 
        if (!gameOver && !isPaused && isValidMove(activePiece.x, activePiece.y + 1, activePiece.shape)) {
            activePiece.y++;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, dropSpeed);
            draw();
        }
    }
    function hardDrop() {
        if (gameOver || isPaused) return;
        while (isValidMove(activePiece.x, activePiece.y + 1, activePiece.shape)) {
            activePiece.y++;
        }
        gameLoop(); 
        draw();
    }
    
    function togglePause() {
        if (gameOver) return;
        isPaused = !isPaused; 
        if (isPaused) {
            clearInterval(gameInterval); 
            if(pauseMessage) pauseMessage.style.display = 'block'; 
            if(pauseButton) pauseButton.textContent = 'Fortsett'; 
        } else {
            gameInterval = setInterval(gameLoop, dropSpeed); 
            if(pauseMessage) pauseMessage.style.display = 'none'; 
            if(pauseButton) pauseButton.textContent = 'Pause'; 
            draw(); 
        }
    }

    function handleKeyDown(event) {
        // Sjekk om modal er åpen (hvis den eksisterer)
        if (modalElement && !modalElement.classList.contains('hidden')) {
            if (event.target === nameInput && event.key === ' ') event.preventDefault();
            return;
        }

        if (event.key === 'p' || event.key === 'P') { event.preventDefault(); togglePause(); return; }
        if (gameOver || isPaused) return;

        switch (event.key) {
            case 'ArrowLeft': case 'a': case 'A': moveLeft(); break;
            case 'ArrowRight': case 'd': case 'D': moveRight(); break;
            case 'ArrowDown': case 's': case 'S': moveDown(); break;
            case 'ArrowUp': case 'w': case 'W': performRotate(); break;
            case ' ': event.preventDefault(); hardDrop(); break;
            case 'c': case 'C': event.preventDefault(); holdSwap(); break;
        }
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyDown);
    if(pauseButton) pauseButton.addEventListener('click', togglePause);
    if(restartButton) restartButton.addEventListener('click', startGame);
    if(saveButton) saveButton.addEventListener('click', saveCurrentHighscore);

    // Mobil Touch Logic
    function addTouchListener(btn, action) {
        if(!btn) return; // Hopper over hvis knappen mangler i HTML
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); action(); }, {passive: false});
        btn.addEventListener('click', (e) => { action(); });
    }
    
    addTouchListener(btnLeft, moveLeft);
    addTouchListener(btnRight, moveRight);
    addTouchListener(btnDown, moveDown);
    addTouchListener(btnRotate, performRotate);
    addTouchListener(btnDrop, hardDrop);

    // Highscore Input Logic
    if(nameInput) {
        nameInput.addEventListener('keydown', function(event) {
            if (event.key === ' ') { event.preventDefault(); return false; }
            if (event.key === 'Enter') saveCurrentHighscore();
        });
        nameInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\s/g, '');
        });
    }

    // ===================================================================
    // SEKSJON 4: HIGHSCORE LOGIKK
    // ===================================================================

    async function loadHighscores() {
        try {
            // Prøv å laste highscores. Hvis det feiler (f.eks. ingen server), ignorerer vi det.
            const response = await fetch('api/get_scores.php'); 
            if(response.ok) {
                highscores = await response.json();
                displayHighscores();
            }
        } catch (error) {
            console.log("Highscores ikke tilgjengelig (kjører du lokalt?)");
        }
    }

    function displayHighscores() {
        if(!highscoreListElement) return;
        highscoreListElement.innerHTML = '';
        const top10 = highscores.sort((a, b) => b.score - a.score).slice(0, 10); 
        top10.forEach((scoreItem, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${index + 1}. ${scoreItem.name}</span><strong>${scoreItem.score}</strong>`;
            highscoreListElement.appendChild(li);
        });
    }

    function checkAndSaveHighscore(newScore) {
        // Hvis vi ikke har modal-elementer, gjør vi ingenting
        if(!modalElement || !nameInput) return;

        let lowestScore = 0;
        if (highscores.length >= 10) lowestScore = highscores[highscores.length - 1].score;

        // Vis modal hvis vi har slått minste score, eller listen ikke er full
        if (highscores.length < 10 || newScore > lowestScore) {
            pendingScore = newScore;
            nameInput.value = '';
            modalElement.classList.remove('hidden'); 
            setTimeout(() => nameInput.focus(), 100); // Liten forsinkelse for fokus
        }
    }

    async function saveCurrentHighscore() {
        if(!nameInput) return;
        let name = nameInput.value.replace(/\s/g, '').toUpperCase();
        
        if (name && name.length > 0) {
            try {
                await fetch('api/save_score.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name: name.substring(0, 6), score: pendingScore })
                });
                if(modalElement) modalElement.classList.add('hidden');
                pendingScore = 0;
                loadHighscores();
            } catch (error) {
                alert("Kunne ikke lagre (mangler database-tilkobling?)");
                if(modalElement) modalElement.classList.add('hidden');
            }
        } else {
            alert("Skriv inn navn!");
        }
    }

    function startGame() {
        createEmptyBoard();
        score = 0;
        level = 1;
        linesClearedTotal = 0;
        gameOver = false;
        heldPiece = null;
        canSwap = true;
        dropSpeed = 800;
        isPaused = false; 

        if(scoreElement) scoreElement.textContent = '0';
        if(levelElement) levelElement.textContent = '1';
        if(linesElement) linesElement.textContent = 'Linjer: 0 / 10';
        if(gameOverElement) gameOverElement.style.display = 'none';
        if(pauseMessage) pauseMessage.style.display = 'none'; 
        if(pauseButton) pauseButton.textContent = 'Pause'; 
        
        if(modalElement) modalElement.classList.add('hidden');

        nextPiece = generateNewPiece();
        spawnPiece();
        
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, dropSpeed);
        
        loadHighscores();
        draw(); 
    }

    // Start selve spillet
    startGame();
}