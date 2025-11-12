// --- 1. Oppsett av lerret (Canvas) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 600;

// --- NYE HTML-elementer for Highscore ---
const gameOverScreen = document.getElementById('game-over-screen');
const finalGoldText = document.getElementById('final-gold');
const usernameInput = document.getElementById('username-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const highscoreList = document.getElementById('highscore-list');

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
let lastFrameTime = 0; // Settes når spillet starter

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

// --- 4. Spilleren ---
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

// --- 5. Hinderet og Plattformen ---
const obstacle = {
    x: canvas.width + 50,
    y: canvas.height - groundHeight - 60,
    width: 40,
    height: 60,
};
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


// --- 8. Kollisjon og Game Over ---

function checkCollision() {
    const playerBox = { x: player.x, y: player.y, width: player.width, height: player.height };
    const obstacleBox = { x: obstacle.x, y: obstacle.y, width: obstacle.width, height: obstacle.height };
    
    if (playerBox.x < obstacleBox.x + obstacleBox.width &&
        playerBox.x + playerBox.width > obstacleBox.x &&
        playerBox.y < obstacleBox.y + obstacleBox.height &&
        playerBox.y + playerBox.height > obstacleBox.y) {
        
        triggerGameOver(); // Kaller ny funksjon
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

// NY FUNKSJON: Viser Game Over-skjermen
function triggerGameOver() {
    isGameOver = true;
    finalGoldText.textContent = goldCoins; // Oppdater poengsum
    gameOverScreen.style.display = 'flex'; // Vis skjermen
}


// --- 9. Håndtere spiller-input ---

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

canvas.addEventListener('touchstart', function(e) {
    e.preventDefault(); 
    
    if (!isGameOver) {
        doJump(); // Hopp hvis spillet er i gang
    }
}, { passive: false });


// --- 10. NYTT: Highscore-logikk (med 'fetch') ---

// Viser listen som hentes fra serveren
function displayHighscores(scores) {
    highscoreList.innerHTML = ''; // Tøm listen
    
    if (scores.length === 0) {
         highscoreList.innerHTML = '<li>Ingen scores ennå!</li>';
         return;
    }
    
    scores.forEach(score => {
        const li = document.createElement('li');
        li.textContent = `${score.name} - ${score.score}G`;
        highscoreList.appendChild(li);
    });
}

// Henter scores fra serveren din (GET request)
async function loadHighscores() {
    try {
        // VIKTIG: Bytt ut 'get_highscores.php' hvis filen heter noe annet
        const response = await fetch('get_highscores.php'); 
        
        if (!response.ok) {
            throw new Error('Nettverksfeil ved henting av scores');
        }
        const scores = await response.json();
        
        // PHP-skriptet sorterer allerede, så vi trenger ikke .sort() her
        
        displayHighscores(scores);
        
    } catch (error) {
        console.error('Kunne ikke laste highscores:', error);
        highscoreList.innerHTML = '<li>Kunne ikke laste...</li>';
    }
}

// Sender ny score til serveren din (POST request)
async function saveHighscore(name, score) {
    const newScore = { name: name, score: score };
    
    try {
        // VIKTIG: Bytt ut 'save_highscore.php' hvis filen heter noe annet
        const response = await fetch('save_highscore.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newScore),
        });
        
        if (!response.ok) {
            throw new Error('Kunne ikke lagre score');
        }
        
    } catch (error) {
        console.error('Feil ved lagring av highscore:', error);
    }
}

// NY LYTTER: Håndterer lagring og omstart
saveScoreBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim() || 'Anonym Ridder';
    
    // Deaktiver knappen for å hindre doble klikk
    saveScoreBtn.disabled = true;
    saveScoreBtn.textContent = 'Lagrer...';
    
    // Vent til lagringen er fullført
    await saveHighscore(username, goldCoins);
    
    // Når lagringen er ferdig, start spillet på nytt
    document.location.reload();
});


// --- 11. Hovedspill-løkken (Game Loop) ---
function gameLoop() {
    // Stopp løkken hvis spillet er over
    if (isGameOver) {
        return; 
    }
    
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    
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

// --- 12. Start spillet! ---
let imagesLoaded = 0;
const totalImages = 4;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // Alt er lastet, start spillet
        lastFrameTime = Date.now();
        gameLoop();
        
        // NYTT: Last inn highscores med en gang
        loadHighscores(); 
    }
}

playerImg.onload = imageLoaded;
obstacleImg.onload = imageLoaded;
backgroundImg.onload = imageLoaded;
goldCoinImg.onload = imageLoaded;

// Sikkerhetsnett hvis bilder allerede er i cache
if (playerImg.complete && obstacleImg.complete && backgroundImg.complete && goldCoinImg.complete && lastFrameTime === 0) {
    imageLoaded();
}