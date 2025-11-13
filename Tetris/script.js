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
const linesElement = document.getElementById('lines-display'); // NYTT ELEMENT
const pauseButton = document.getElementById('pause-button');
const pauseMessage = document.getElementById('pause-message');
const restartButton = document.getElementById('restart-button'); // NYTT ELEMENT

// --- Spill-konstanter ---
const ROWS = 20; // Antall rader
const COLS = 12; // Antall kolonner
const BLOCK_SIZE = 25; // Størrelse på hver blokk i piksler
const SIDE_CANVAS_BLOCK_SIZE = 20; // Mindre blokker for sidepaneler

// Setter canvas-størrelsen basert på konstantene
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

// ===================================================================
// SEKSJON 2: TEGNEFUNKSJONER (RENDERING)
// ===================================================================

/**
 * Tegner en enkelt blokk på hovedbrettet.
 */
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

/**
 * Tegner en enkelt blokk på et sidepanel-canvas.
 */
function drawSideBlock(sideCtx, x, y, color) {
    sideCtx.fillStyle = color;
    sideCtx.fillRect(x * SIDE_CANVAS_BLOCK_SIZE, y * SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE);
    
    sideCtx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    sideCtx.lineWidth = 1;
    sideCtx.strokeRect(x * SIDE_CANVAS_BLOCK_SIZE, y * SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE, SIDE_CANVAS_BLOCK_SIZE);
}

/**
 * Tegner hele spillbrettet (de låste brikkene).
 */
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

/**
 * Tegner den aktive brikken som faller.
 */
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

/**
 * Tegner "spøkelsesbrikken" (hvor brikken vil lande).
 */
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

/**
 * Tegner brikken i "Neste" eller "Hold"-boksene.
 */
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

/**
 * Hovedtegnefunksjon: Tømmer og tegner alt på nytt.
 */
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

/**
 * Oppretter et tomt, internt spillbrett (array).
 */
function createEmptyBoard() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

/**
 * Genererer en ny, tilfeldig Tetris-brikke.
 */
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

/**
 * Tar "neste" brikke og gjør den aktiv. Sjekker for game over.
 */
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

/**
 * Bytter den aktive brikken med brikken i "Hold".
 */
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

/**
 * Sjekker om en brikke er på en gyldig posisjon (innenfor brettet, ikke kolliderer).
 */
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

/**
 * Låser den aktive brikken til brettet.
 */
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

/**
 * Roterer den aktive brikken 90 grader med klokken.
 * Inkluderer enkel "wall kick" (sidelengs flytt hvis rotasjon feiler).
 */
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

/**
 * Sjekker etter, fjerner, og gir poeng for fulle linjer.
 * Håndterer også nivå-oppgang og økt hastighet.
 */
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
        // Poengsystem (enkelt)
        let points = linesCleared * 100; // FIKS: Definerte 'points'
        if (linesCleared === 4) points = 800; 
        
        score += points * level; 
        scoreElement.textContent = score;

        // Oppdater nivå
        linesClearedTotal += linesCleared;
        
        const linesPerLevel = 10;
        let newLevel = Math.floor(linesClearedTotal / linesPerLevel) + 1;
        
        // Beregn linjer for denne level'en
        let currentLevelLines = linesClearedTotal % linesPerLevel;
        
        // Oppdater UI
        linesElement.textContent = `Linjer: ${currentLevelLines} / ${linesPerLevel}`; // FIKS: Brukte linesPerLevel

        if (newLevel > level) {
            level = newLevel;
            levelElement.textContent = level;
            
            // Øk farten (minimum 100ms)
            dropSpeed = Math.max(100, 800 - (level - 1) * 50); // FIKS: La til manglende logikk
                
            // Restart intervallet med ny hastighet
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, dropSpeed);
        }
    }
}

/**
 * Viser Game Over-skjermen.
 */
function showGameOver() {
    gameOverElement.style.display = 'block';
}

/**
 * Hoved spill-loop funksjon (ett "tick").
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
    draw(); // FIKS: La til manglende draw()
}

// ===================================================================
// SEKSJON 4: KONTROLLER OG SPILLSTYRING
// ===================================================================

/**
 * Pauser eller fortsetter spillet.
 */
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

/**
 * Håndterer tastetrykk fra brukeren.
 */
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

    // FIKS: Fjernet duplikat 'spawnPiece()'
    nextPiece = generateNewPiece(); // Lag den FØRSTE neste brikken
    spawnPiece(); // Flytter "next" til "active" og lager en ny "next"

    // Oppdater UI
    scoreElement.textContent = '0';
    levelElement.textContent = '1';
    linesElement.textContent = 'Linjer: 0 / 10'; // NY LINJE
    gameOverElement.style.display = 'none';
    pauseMessage.style.display = 'none'; 
    pauseButton.textContent = 'Pause'; 
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, dropSpeed);
    
    draw(); 
}

// ===================================================================
// SEKSJON 5: INITIALISERING (EVENT LISTENERS)
// ===================================================================

document.addEventListener('keydown', handleKeyDown);
pauseButton.addEventListener('click', togglePause);
restartButton.addEventListener('click', startGame); // NY LINJE

// Start selve spillet
startGame();