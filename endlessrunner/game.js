// --- 1. Oppsett av lerret (Canvas) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1200;
canvas.height = 600;

// --- 2. Spillvariabler ---
const gravity = 0.7;
const groundHeight = 50;
let gameSpeed = 5;
let isGameOver = false;

// Bakgrunn
let bgSpeed = 2;
let bgX1 = 0;
let bgX2 = canvas.width;

// Poeng og tid
let totalGameTime = 0;
let goldCoins = 0;
let lastFrameTime = Date.now();

// Mynt-spawning
let coins = [];
let coinSpawnTimer = 0;
let coinSpawnInterval = 2 + (Math.random() * 3);

// --- 3. Last inn bilder ---
const playerImg = new Image();
playerImg.src = 'ridder.png';

const obstacleImg = new Image();
obstacleImg.src = 'fiende.png';

const backgroundImg = new Image();
backgroundImg.src = 'bakgrunn.png';

const goldCoinImg = new Image();
goldCoinImg.src = 'gullmynt.png';

// --- 4. Spilleren (Din gylne ridder) ---
const player = {
    x: 100,
    y: canvas.height - groundHeight,
    width: 40,
    height: 60,
    velocityY: 0,
    isJumping: false,
    jumpsMade: 0,
    maxJumps: 2
};

// --- 5. Hinderet (Din blå ridder) ---
const obstacle = {
    x: canvas.width + 50,
    y: canvas.height - groundHeight - 60,
    width: 40,
    height: 60,
};

// Plattformen
const platform = {
    x: canvas.width + 300,
    y: canvas.height - 250,
    width: 150,
    height: 20,
    color: '#8B4513'
};

// --- 6. Funksjoner for å tegne ---

function drawBackground() {
    ctx.drawImage(backgroundImg, bgX1, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, bgX2, 0, canvas.width, canvas.height);
}

function drawGround() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
}

function drawPlayer() {
    ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
}

function drawObstacle() {
    // Dette er linjen jeg fikset i forrige runde (var 'obstacle.type')
    ctx.drawImage(obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
}

function drawPlatform() {
    ctx.fillStyle = platform.color;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
}

function drawCoins() {
    for (const coin of coins) {
        if (coin.isVisible) {
            ctx.drawImage(goldCoinImg, coin.x, coin.y, coin.width, coin.height);
        }
    }
}

function drawUI() {
    const totalSeconds = Math.floor(totalGameTime);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    let formattedTime;
    if (minutes > 0) {
        formattedTime = `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    } else {
        formattedTime = `${seconds}s`;
    }

    const formattedGold = `${goldCoins}G`;

    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = 'gold';

    ctx.textAlign = 'center';
    ctx.fillText(formattedGold, canvas.width / 2, 40);

    ctx.textAlign = 'right';
    ctx.fillText(formattedTime, canvas.width - 20, 40);
    
    ctx.textAlign = 'left';
}


function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = '50px Arial';
    ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
    
    const totalSeconds = Math.floor(totalGameTime);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    let formattedTime;
    if (minutes > 0) {
        formattedTime = `${minutes} minutter og ${seconds} sekunder`;
    } else {
        formattedTime = `${seconds} sekunder`;
    }

    ctx.font = '24px Arial';
    ctx.fillText(`Tid: ${formattedTime}`, canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText(`Gull: ${goldCoins} mynter`, canvas.width / 2, canvas.height / 2 + 60);
    ctx.fillText('Trykk for å starte på nytt', canvas.width / 2, canvas.height / 2 + 100);
}


// --- 7. Oppdateringsfunksjoner (logikk) ---

function spawnCoin() {
    let coinY = canvas.height - groundHeight - 30;
    if (Math.random() < 0.5) {
        coinY = (canvas.height - groundHeight - 150) - (Math.random() * 250) - 30;
    }
    const newCoin = {
        x: canvas.width + 50,
        y: coinY,
        width: 30,
        height: 30,
        isVisible: true
    };
    coins.push(newCoin);
}

function updateBackground() {
    bgX1 -= bgSpeed;
    bgX2 -= bgSpeed;
    if (bgX1 + canvas.width < 0) { bgX1 = canvas.width - bgSpeed; }
    if (bgX2 + canvas.width < 0) { bgX2 = canvas.width - bgSpeed; }
}

function updatePlayer() {
    player.velocityY += gravity;
    player.y += player.velocityY;

    const isFalling = player.velocityY > 0;
    const playerBottom = player.y + player.height;
    const platformTop = platform.y;
    
    const overlapsX = player.x < platform.x + platform.width && 
                      player.x + player.width > platform.x;
                      
    const wasAbove = (player.y + player.height) - player.velocityY <= platformTop;
    const isBelow = playerBottom >= platformTop;

    if (isFalling && overlapsX && wasAbove && isBelow) {
        player.y = platformTop - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        player.jumpsMade = 0;
    }
    
    if (player.y > canvas.height - groundHeight - player.height) {
        player.y = canvas.height - groundHeight - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        player.jumpsMade = 0;
    }
}

function updateObstacle() {
    obstacle.x -= gameSpeed;
    if (obstacle.x + obstacle.width < 0) {
        obstacle.x = canvas.width + Math.random() * (canvas.width / 2);
    }
}

function updatePlatform() {
    platform.x -= gameSpeed;
    if (platform.x + platform.width < 0) {
        platform.x = canvas.width + Math.random() * (canvas.width / 2);
        platform.width = 100 + (Math.random() * 100);
        platform.y = (canvas.height - groundHeight - 150) - (Math.random() * 250); 
    }
}

function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (coin.isVisible) {
            coin.x -= gameSpeed;
        }
        if (!coin.isVisible || coin.x + coin.width < 0) {
            coins.splice(i, 1);
        }
    }
}

function checkCollision() {
    const playerBox = { x: player.x, y: player.y, width: player.width, height: player.height };
    const obstacleBox = { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height };
    
    if (playerBox.x < obstacleBox.x + obstacleBox.width &&
        playerBox.x + playerBox.width > obstacleBox.x &&
        playerBox.y < obstacleBox.y + obstacleBox.height &&
        playerBox.y + playerBox.height > obstacleBox.y) {
        isGameOver = true;
    }
    
    const playerTop = player.y;
    const platformBottom = platform.y + platform.height;
    const overlapsXPlatform = player.x < platform.x + platform.width && 
                              player.x + player.width > platform.x;

    if (overlapsXPlatform && playerTop < platformBottom && playerTop > platform.y && player.velocityY < 0) {
        player.velocityY = 0;
        player.y = platformBottom;
    }

    for (const coin of coins) {
        if (coin.isVisible) {
            const coinBox = { x: coin.x, y: coin.y, width: coin.width, height: coin.height };
            if (playerBox.x < coinBox.x + coinBox.width &&
                playerBox.x + playerBox.width > coinBox.x &&
                playerBox.y < coinBox.y + coinBox.height &&
                playerBox.y + playerBox.height > coinBox.y) {
                goldCoins++;
                coin.isVisible = false;
            }
        }
    }
}

// --- 8. Håndtere spiller-input (Tastatur OG Touch) ---

function doJump() {
    if (isGameOver) return;

    if (player.jumpsMade < player.maxJumps) {
        player.velocityY = -18;
        player.isJumping = true;
        player.jumpsMade++;
    }
}

function handleKeyJump(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        doJump();
    }
}
document.addEventListener('keydown', handleKeyJump);

canvas.addEventListener('click', function(e) {
    if (isGameOver) {
        e.preventDefault();
        document.location.reload();
    }
});

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); 
    
    if (isGameOver) {
        document.location.reload();
    } else {
        doJump();
    }
}, { passive: false });


// --- 9. Hovedspill-løkken (Game Loop) ---
function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    if (isGameOver) {
        drawGameOver();
        return;
    }
    
    totalGameTime += deltaTime;
    
    coinSpawnTimer += deltaTime;
    if (coinSpawnTimer > coinSpawnInterval) {
        spawnCoin();
        coinSpawnTimer = 0;
        coinSpawnInterval = 2 + (Math.random() * 3);
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();
    drawGround();
    drawPlatform();
    drawCoins();
    drawPlayer();
    drawObstacle();
    drawUI();

    updatePlayer();
    updateObstacle();
    updatePlatform();
    updateCoins();
    updateBackground(); 

    checkCollision();
    
    requestAnimationFrame(gameLoop);
}

// --- 10. Start spillet! ---
let imagesLoaded = 0;
const totalImages = 4;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        lastFrameTime = Date.now();
        gameLoop();
    }
}

playerImg.onload = imageLoaded;
obstacleImg.onload = imageLoaded;
backgroundImg.onload = imageLoaded;
// FIKSET: 'imageL' er endret til 'imageLoaded'
goldCoinImg.onload = imageLoaded;

if (playerImg.complete && obstacleImg.complete && backgroundImg.complete && goldCoinImg.complete) {
    if (lastFrameTime === 0) {
        lastFrameTime = Date.now();
        gameLoop();
    }
}