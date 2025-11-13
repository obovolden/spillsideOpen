// ===================================================================
// SEKSJON 1: KONSTANTER OG GLOBALE VARIABLER
// ===================================================================

// --- DOM-elementer ---
// Hovedspill
const canvas = document.getElementById('tetris-board');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('game-over');

// Sidepaneler
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const levelElement = document.getElementById('level-display');
const linesElement = document.getElementById('lines-display');
const pauseButton = document.getElementById('pause-button');
const pauseMessage = document.getElementById('pause-message');
const restartButton = document.getElementById('restart-button');

// NYTT DOM-ELEMENT (VENSTRE PANEL)
const highscoreListElement = document.getElementById('highscore-list');

// --- Spill-konstanter ---
const ROWS = 20;
const COLS = 12;
const BLOCK_SIZE = 25;
const SIDE_CANVAS_BLOCK_SIZE = 20;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// --- Brikke-definisjoner ---
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

// --- Globale spillvariabler (State) ---
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

// NY GLOBAL VARIABEL
let highscores = []; // Vil inneholde { name: '...', score: ... }

// ===================================================================
// SEKSJON 2: TEGNEFUNKSJONER (RENDERING)
// ===================================================================
/* ... (Ingen endringer i Seksjon 2 - drawBlock, drawSideBlock, etc.) ... */
function drawBlock(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2; 

    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE + BLOCK_SIZE - 1, y * BLOCK_SIZE + 1);
    ctx.lineTo(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1);
    ctx.lineTo(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + BLOCK_SIZE - 1);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE + 1, y * BLOCK_SIZE + BLOCK_SIZE - 1);
    ctx.lineTo(x * BLOCK_SIZE + BLOCK_SIZE - 1, y * BLOCK_SIZE + BLOCK_SIZE - 1);
    ctx.lineTo(x * BLOCK_SIZE + BLOCK_SIZE - 1, y * BLOCK_SIZE + 1);
    ctx.stroke();
}
function drawSideBlock(sideCtx, x, y, color) {
    sideCtx.fillStyle = color;
    sideCtx.fillRect(x * SIDE_CANVAS_BLOCK_SIZE, y * SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE);
    
    sideCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    sideCtx.lineWidth = 1;
    sideCtx.strokeRect(x * SIDE_CANVAS_BLOCK_SIZE, y * SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE);
}
function drawBoard() {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] > 0) {
                drawBlock(c, r, COLORS[board[r][c]]);
            }
        }
    }
}
function drawPiece() {
    if (!activePiece) return;
    activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawBlock(activePiece.x + x, activePiece.y + y, COLORS[value]);
            }
        });
    });
}
function drawGhostPiece() {
    if (!activePiece) return;
    let ghostY = activePiece.y;
    while (isValidMove(activePiece.x, ghostY + 1, activePiece.shape)) {
        ghostY++;
    }
    const color = 'rgba(200, 200, 200, 0.15)';
    activePiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                ctx.fillStyle = color;
                ctx.fillRect((activePiece.x + x) * BLOCK_SIZE, (ghostY + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
}
function drawSidePiece(piece, canvasCtx, canvasElement) {
    canvasCtx.fillStyle = '#111827';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    if (!piece) return;

    const shape = piece.shape;
    const color = COLORS[piece.colorId];
    
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;
    const offsetX = (canvasElement.width / SIDE_CANVAS_BLOCK_SIZE - shapeWidth) / 2;
    const offsetY = (canvasElement.height / SIDE_CANVAS_BLOCK_SIZE - shapeHeight) / 2;

    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                drawSideBlock(canvasCtx, x + offsetX, y + offsetY, color);
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

// ===================================================================
// SEKSJON 3: SPILLOGIKK
// ===================================================================
/* ... (Mesteparten av Seksjon 3 er uendret) ... */
function createEmptyBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
function generateNewPiece() {
    const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1; // 1 til 7
    const shape = SHAPES[typeId];
    return {
        shape: shape,
        colorId: typeId,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0
    };
}
function spawnPiece() {
    activePiece = nextPiece; 
    nextPiece = generateNewPiece();
    canSwap = true; 

    if (!isValidMove(activePiece.x, activePiece.y, activePiece.shape)) {
        gameOver = true;
        showGameOver(); // Endret: Kaller nå den oppdaterte funksjonen
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
            [activePiece, heldPiece] = [heldPiece, activePiece]; // Bytt tilbake
            return; 
        }
    }
    canSwap = false; 
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

    if (isValidMove(activePiece.x, activePiece.y, newShape)) {
        activePiece.shape = newShape;
    } 
    else if (isValidMove(activePiece.x + 1, activePiece.y, newShape)) {
        activePiece.x++;
        activePiece.shape = newShape;
    } else if (isValidMove(activePiece.x - 1, activePiece.y, newShape)) {
        activePiece.x--;
        activePiece.shape = newShape;
    }
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
        let points = linesCleared * 100;
        if (linesCleared === 4) points = 800; 
        
        score += points * level; 
        scoreElement.textContent = score;

        linesClearedTotal += linesCleared;
        
        const linesPerLevel = 10;
        let newLevel = Math.floor(linesClearedTotal / linesPerLevel) + 1;
        let currentLevelLines = linesClearedTotal % linesPerLevel;
        
        linesElement.textContent = `Linjer: ${currentLevelLines} / ${linesPerLevel}`;

        if (newLevel > level) {
            level = newLevel;
            levelElement.textContent = level;
            dropSpeed = Math.max(100, 800 - (level - 1) * 50);
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, dropSpeed);
        }
    }
}

/**
 * Viser Game Over-skjermen.
 * MODIFISERT: Kaller nå checkAndSaveHighscore.
 */
function showGameOver() {
    gameOverElement.style.display = 'block';
    // Kaller highscore-sjekken når spillet er over
    checkAndSaveHighscore(score);
}

/**
 * Hoved spill-loop funksjon.
 */
function gameLoop() {
    if (gameOver || isPaused) return;

    if (isValidMove(activePiece.x, activePiece.y + 1, activePiece.shape)) {
        activePiece.y++;
    } else {
        lockPiece();
        clearLines();
        if (!gameOver) { 
            spawnPiece();
        }
    }
    draw();
}

// ===================================================================
// SEKSJON 4: KONTROLLER OG SPILLSTYRING
// ===================================================================

/* ... (togglePause og handleKeyDown er uendret) ... */
function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused; 

    if (isPaused) {
        clearInterval(gameInterval); 
        pauseMessage.style.display = 'block'; 
        pauseButton.textContent = 'Fortsett'; 
    } else {
        gameInterval = setInterval(gameLoop, dropSpeed); 
        pauseMessage.style.display = 'none'; 
        pauseButton.textContent = 'Pause'; 
        draw(); 
    }
}
function handleKeyDown(event) {
    if (event.key === 'p' || event.key === 'P') {
        event.preventDefault();
        togglePause();
        return; 
    }
    
    if (gameOver || isPaused) return;

    switch (event.key) {
        case 'ArrowLeft':
            if (isValidMove(activePiece.x - 1, activePiece.y, activePiece.shape)) activePiece.x--;
            break;
        case 'ArrowRight':
            if (isValidMove(activePiece.x + 1, activePiece.y, activePiece.shape)) activePiece.x++;
            break;
        case 'ArrowDown':
            if (isValidMove(activePiece.x, activePiece.y + 1, activePiece.shape)) {
                activePiece.y++;
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, dropSpeed);
            } else {
                gameLoop();
            }
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ': // Mellomrom
            event.preventDefault(); 
            while (isValidMove(activePiece.x, activePiece.y + 1, activePiece.shape)) {
                activePiece.y++;
            }
            gameLoop(); 
            break;
        case 'c':
        case 'C':
            event.preventDefault();
            holdSwap();
            break;
    }
    draw();
}

/**
 * Starter (eller restarter) spillet.
 * MODIFISERT: Kaller nå loadHighscores().
 */
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

    nextPiece = generateNewPiece();
    spawnPiece();

    // Oppdater UI
    scoreElement.textContent = '0';
    levelElement.textContent = '1';
    linesElement.textContent = 'Linjer: 0 / 10';
    gameOverElement.style.display = 'none';
    pauseMessage.style.display = 'none'; 
    pauseButton.textContent = 'Pause'; 
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, dropSpeed);
    
    // NYTT KALL: Last inn highscores når spillet starter
    loadHighscores();
    
    draw(); 
}

// ===================================================================
// SEKSJON 5: INITIALISERING (EVENT LISTENERS)
// ===================================================================

document.addEventListener('keydown', handleKeyDown);
pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', startGame);

// Start selve spillet
startGame();


// ===================================================================
// SEKSJON 6: HIGHSCORE-LOGIKK (NY)
// ===================================================================

/**
 * Laster highscores.
 * (Stubbe: erstatt med databasekall)
 */
async function loadHighscores() {
    console.log("Laster highscores...");
    // --- DATABASE-STUBBE (START) ---
    // Her ville du gjort et 'fetch' kall til din database, f.eks:
    // const response = await fetch('/api/highscores');
    // highscores = await response.json();
    
    // For nå bruker vi falsk data:
    highscores = [
        { name: 'TOP', score: 10000 },
        { name: 'MID', score: 5000 },
        { name: 'LOW', score: 1000 }
    ];
    // --- DATABASE-STUBBE (SLUTT) ---

    displayHighscores();
}

/**
 * Viser highscore-listen i HTML.
 */
function displayHighscores() {
    // Tømmer listen først
    highscoreListElement.innerHTML = '';

    // Sorterer og tar de 10 beste
    const top10 = highscores
        .sort((a, b) => b.score - a.score) // Sorter synkende
        .slice(0, 10); // Ta bare de 10 første

    // Lager HTML for hver score
    top10.forEach((scoreItem, index) => {
        const li = document.createElement('li');
        
        // <span> for "1. AAA"
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${index + 1}. ${scoreItem.name}`;
        
        // <strong> for poengsummen
        const scoreStrong = document.createElement('strong');
        scoreStrong.textContent = scoreItem.score;
        
        li.appendChild(nameSpan);
        li.appendChild(scoreStrong);
        highscoreListElement.appendChild(li);
    });
}

/**
 * Sjekker om en ny score er en highscore og lagrer den.
 * (Stubbe: erstatt med databasekall)
 * @param {number} newScore Den nye poengsummen
 */
async function checkAndSaveHighscore(newScore) {
    // Sjekk om listen er full (10) og om den nye scoren er lavere enn den laveste
    const lowestScore = highscores.length < 10 ? 0 : highscores.sort((a, b) => a.score - b.score)[0].score;

    if (newScore > lowestScore) {
        // Ny highscore!
        const name = prompt('Ny highscore! Skriv inn navnet ditt (3 bokstaver):', 'AAA');
        
        if (name && name.trim() !== '') {
            const finalName = name.trim().substring(0, 3).toUpperCase();
            
            // --- DATABASE-STUBBE (START) ---
            // Her ville du gjort et 'fetch' kall for å lagre:
            // await fetch('/api/highscores', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ name: finalName, score: newScore })
            // });
            
            // For demo: bare oppdater den lokale listen og last på nytt
            highscores.push({ name: finalName, score: newScore });
            // --- DATABASE-STUBBE (SLUTT) ---

            // Last listen på nytt (som henter fra DB i en ekte app)
            displayHighscores(); // I en ekte app, ville du kalt loadHighscores()
        }
    }
}