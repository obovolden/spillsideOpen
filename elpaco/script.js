const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');

const TILE_SIZE = 40;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;

canvas.width = MAP_WIDTH * TILE_SIZE;
canvas.height = MAP_HEIGHT * TILE_SIZE;

// --- Last inn bilder ---
const pacoImage = new Image();
pacoImage.src = 'paco.png';
const redEnemyImage = new Image();
redEnemyImage.src = 'rod.png';
const blueEnemyImage = new Image();
blueEnemyImage.src = 'blo.png';
const chiliImage = new Image(); // Last inn chili-bildet
chiliImage.src = 'chili.png';

// --- Spill-variabler ---
let paco;
let enemies;
let tacos;
let chilis;
let score;
let lastTickTime;
let gameTickInterval = 180;
let isGameOver;

let isPowerUpActive = false;
let powerUpTimer = 0;
const POWER_UP_DURATION = 7000;

const enemySpawnPoints = [
    { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 },
    { x: MAP_WIDTH - 2, y: 1 }
];

// --- KART (NÅ KORREKT) ---
const gameMap = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1],
    [1,0,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,0,1],
    [1,0,1,0,1,1,0,0,0,0,0,0,0,0,1,1,0,1,0,1],
    [1,0,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1], // <-- RETTET (var 1.0)
    [1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,0,1,1,0,1,1,0,1,1,1,0,1],
    [1,2,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// --- Funksjon: Nullstill spillet ---
function resetGame() {
    paco = {
        x: 1, y: 1,
        prevX: 1, prevY: 1,
        size: TILE_SIZE,
        dx: 0, dy: 0, nextDx: 0, nextDy: 0
    };
    enemies = [
        { 
            x: enemySpawnPoints[0].x, y: enemySpawnPoints[0].y, 
            prevX: enemySpawnPoints[0].x, prevY: enemySpawnPoints[0].y, 
            size: TILE_SIZE, image: redEnemyImage, dx: 0, dy: 0, spawnIndex: 0 
        },
        { 
            x: enemySpawnPoints[1].x, y: enemySpawnPoints[1].y, 
            prevX: enemySpawnPoints[1].x, prevY: enemySpawnPoints[1].y, 
            size: TILE_SIZE, image: blueEnemyImage, dx: 0, dy: 0, spawnIndex: 1 
        }
    ];
    tacos = [];
    chilis = [];
    score = 0;
    lastTickTime = 0; 
    isGameOver = false;
    isPowerUpActive = false;
    powerUpTimer = 0;

    createPickups(); 
    updateScore();
    
    gameOverScreen.style.display = 'none'; 
}

// --- Funksjon: Lag "pickups" ---
function createPickups() {
    tacos = [];
    chilis = [];
    for (let row = 0; row < MAP_HEIGHT; row++) {
        for (let col = 0; col < MAP_WIDTH; col++) {
            if (gameMap[row][col] === 0) {
                if (row !== paco.y || col !== paco.x) {
                     tacos.push({ x: col, y: row });
                }
            } else if (gameMap[row][col] === 2) {
                chilis.push({ x: col, y: row });
            }
        }
    }
}

// --- Tegne-funksjoner ---

function drawTacos() { 
    ctx.fillStyle = 'orange';
    tacos.forEach(taco => {
        ctx.fillRect(
            taco.x * TILE_SIZE + (TILE_SIZE * 0.4), 
            taco.y * TILE_SIZE + (TILE_SIZE * 0.4), 
            TILE_SIZE * 0.2, 
            TILE_SIZE * 0.2
        );
    });
}

function drawChilis() { 
    chilis.forEach(chili => {
        if (chiliImage.complete) {
            // Valgfri: fjerne blinkingen hvis du vil
            // if (isPowerUpActive && Math.floor(Date.now() / 150) % 2 === 0) {
            //     ctx.globalAlpha = 0.5;
            // }
            ctx.drawImage(chiliImage, chili.x * TILE_SIZE, chili.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            // ctx.globalAlpha = 1.0;
        } else {
            // Fallback hvis bilde mangler
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(
                chili.x * TILE_SIZE + (TILE_SIZE / 2),
                chili.y * TILE_SIZE + (TILE_SIZE / 2),
                TILE_SIZE * 0.3,
                0, 2 * Math.PI
            );
            ctx.fill();
        }
    });
}

function drawMap() { 
    for (let row = 0; row < MAP_HEIGHT; row++) {
        for (let col = 0; col < MAP_WIDTH; col++) {
            if (gameMap[row][col] === 1) {
                ctx.fillStyle = '#3498db';
                ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
}

function drawPaco(progress) { 
    const drawX = (paco.prevX * (1 - progress) + paco.x * progress) * TILE_SIZE;
    const drawY = (paco.prevY * (1 - progress) + paco.y * progress) * TILE_SIZE;

    if (pacoImage.complete) {
        ctx.drawImage(pacoImage, drawX, drawY, paco.size, paco.size);
    } else {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(drawX, drawY, paco.size, paco.size);
    }
}

function drawEnemies(progress) { 
    enemies.forEach(enemy => {
        const drawX = (enemy.prevX * (1 - progress) + enemy.x * progress) * TILE_SIZE;
        const drawY = (enemy.prevY * (1 - progress) + enemy.y * progress) * TILE_SIZE;

        let drawImage = enemy.image;
        if (isPowerUpActive) {
            ctx.globalAlpha = (Math.floor(Date.now() / 150) % 2 === 0) ? 0.7 : 1.0;
        }
        
        if (drawImage.complete) {
            ctx.drawImage(drawImage, drawX, drawY, enemy.size, enemy.size);
        } else {
            ctx.fillStyle = (enemy.image === redEnemyImage) ? 'red' : 'cyan';
            ctx.fillRect(drawX, drawY, enemy.size, enemy.size);
        }
        ctx.globalAlpha = 1.0;
    });
}

// --- Spill-logikk funksjoner ---

function updateScore() { 
    scoreElement.innerText = score;
}

function checkTacoCollision() { 
    for (let i = tacos.length - 1; i >= 0; i--) {
        const taco = tacos[i];
        if (taco.x === paco.x && taco.y === paco.y) {
            tacos.splice(i, 1);
            score += 10;
            updateScore();
        }
    }
}

function checkChiliCollision() { 
    for (let i = chilis.length - 1; i >= 0; i--) {
        const chili = chilis[i];
        if (chili.x === paco.x && chili.y === paco.y) {
            chilis.splice(i, 1);
            isPowerUpActive = true;
            powerUpTimer = POWER_UP_DURATION;
            score += 50;
            updateScore();
        }
    }
}

function showGameOver() {
    isGameOver = true;
    gameOverScreen.style.display = 'flex';
}

function checkEnemyCollision() { 
    if (isGameOver) return;
    enemies.forEach(enemy => {
        if (enemy.x === paco.x && enemy.y === paco.y) {
            if (isPowerUpActive) {
                score += 100;
                updateScore();
                const spawn = enemySpawnPoints[enemy.spawnIndex];
                enemy.x = spawn.x;
                enemy.y = spawn.y;
                enemy.prevX = spawn.x;
                enemy.prevY = spawn.y;
                enemy.dx = 0;
                enemy.dy = 0;
            } else {
                showGameOver();
            }
        }
    });
}

function movePaco() { 
    if (isGameOver) return;

    paco.prevX = paco.x;
    paco.prevY = paco.y;

    let nextX = paco.x + paco.nextDx;
    let nextY = paco.y + paco.nextDy;
    if (paco.nextDx !== 0 || paco.nextDy !== 0) {
        if (gameMap[nextY] && gameMap[nextY][nextX] !== 1) {
            paco.dx = paco.nextDx;
            paco.dy = paco.nextDy;
            paco.nextDx = 0;
            paco.nextDy = 0;
        }
    }
    let currentNewX = paco.x + paco.dx;
    let currentNewY = paco.y + paco.dy;
    if (gameMap[currentNewY] && gameMap[currentNewY][currentNewX] !== 1) {
        paco.x = currentNewX;
        paco.y = currentNewY;
    } else {
        paco.dx = 0;
        paco.dy = 0;
    }
}

function moveEnemies() { 
    if (isGameOver) return;
    enemies.forEach(enemy => {
        enemy.prevX = enemy.x;
        enemy.prevY = enemy.y;

        const getValidMoves = (x, y) => {
            const moves = []; 
            if (gameMap[y - 1] && gameMap[y - 1][x] !== 1) moves.push({ dx: 0, dy: -1 });
            if (gameMap[y + 1] && gameMap[y + 1][x] !== 1) moves.push({ dx: 0, dy: 1 });
            if (gameMap[y] && gameMap[y][x - 1] !== 1) moves.push({ dx: -1, dy: 0 });
            if (gameMap[y] && gameMap[y][x + 1] !== 1) moves.push({ dx: 1, dy: 0 });
            return moves;
        };
        const validMoves = getValidMoves(enemy.x, enemy.y);
        if (validMoves.length === 0) return;

        const diffX = (isPowerUpActive) ? (enemy.x - paco.x) : (paco.x - enemy.x);
        const diffY = (isPowerUpActive) ? (enemy.y - paco.y) : (paco.y - enemy.y);
        
        let preferredMove = null;
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0) preferredMove = { dx: 1, dy: 0 };
            else preferredMove = { dx: -1, dy: 0 };
        } else {
            if (diffY > 0) preferredMove = { dx: 0, dy: 1 };
            else preferredMove = { dx: 0, dy: -1 };
        }
        let chosenMove = validMoves.find(move => move.dx === preferredMove.dx && move.dy === preferredMove.dy);
        const isTryingToReverse = (chosenMove && (chosenMove.dx === -enemy.dx && chosenMove.dy === -enemy.dy));
        if (validMoves.length > 1 && isTryingToReverse && (enemy.dx !== 0 || enemy.dy !== 0)) {
            const nonReversingMoves = validMoves.filter(move => !(move.dx === -enemy.dx && move.dy === -enemy.dy));
            chosenMove = nonReversingMoves[Math.floor(Math.random() * nonReversingMoves.length)];
        } else if (!chosenMove) {
            let possibleMoves = validMoves;
            if (validMoves.length > 1 && (enemy.dx !== 0 || enemy.dy !== 0)) {
                possibleMoves = validMoves.filter(move => !(move.dx === -enemy.dx && move.dy === -enemy.dy));
            }
            if (possibleMoves.length > 0) {
                chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            } else {
                chosenMove = validMoves[0];
            }
        }
        if (chosenMove) {
            enemy.x += chosenMove.dx;
            enemy.y += chosenMove.dy;
            enemy.dx = chosenMove.dx;
            enemy.dy = chosenMove.dy;
        } else {
            enemy.dx = 0;
            enemy.dy = 0;
        }
    });
}

// --- KONTROLLER ---
document.addEventListener('keydown', e => {
    if (e.code === 'Space' && isGameOver) {
        resetGame();
        return;
    }
    if (isGameOver) return; 
    
    switch (e.key.toLowerCase()) {
        case 'w': 
            paco.nextDy = -1; 
            paco.nextDx = 0; 
            break;
        case 's': 
            paco.nextDy = 1; 
            paco.nextDx = 0; 
            break;
        case 'a': 
            paco.nextDx = -1; 
            paco.nextDy = 0; 
            break;
        case 'd': 
            paco.nextDx = 1; 
            paco.nextDy = 0; 
            break;
    }
});

// --- HOVEDSPILL-LOOP ---
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    const delta = currentTime - (lastTickTime || currentTime);

    if (!isGameOver) {
        if (isPowerUpActive) {
            powerUpTimer -= delta;
            if (powerUpTimer <= 0) {
                isPowerUpActive = false;
                powerUpTimer = 0;
            }
        }
        
        if (!lastTickTime || delta > gameTickInterval) {
            if (!lastTickTime) lastTickTime = currentTime;
            else lastTickTime = currentTime - (delta % gameTickInterval);
            
            movePaco();
            checkTacoCollision();
            checkChiliCollision();
            moveEnemies();
            checkEnemyCollision();
        }
    }

    let progress = 0;
    if (lastTickTime > 0 && !isGameOver) {
        progress = (currentTime - lastTickTime) / gameTickInterval; 
        progress = Math.min(1, progress); 
    } else if (isGameOver) {
        progress = 1; 
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawTacos();
    drawChilis(); // <-- RETTET: Skal ikke sende 'progress'
    drawPaco(progress);
    drawEnemies(progress);
}

// --- Oppstart ---
let imagesLoaded = 0;
const totalImages = 4; // 4 bilder: paco, rod, blo, chili
function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        resetGame(); // Start spillet
        requestAnimationFrame(gameLoop);
    }
}
pacoImage.onload = imageLoaded;
redEnemyImage.onload = imageLoaded;
blueEnemyImage.onload = imageLoaded;
chiliImage.onload = imageLoaded; // Vent på chili

// Sikkerhetsnett hvis bilder allerede er i cache
if (pacoImage.complete && redEnemyImage.complete && blueEnemyImage.complete && chiliImage.complete && imagesLoaded < totalImages) {
    imagesLoaded = totalImages; 
    resetGame();
    requestAnimationFrame(gameLoop);
}