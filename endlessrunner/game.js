// --- 1. Oppsett av lerret (Canvas) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- HTML-elementer ---
const gameOverScreen = document.getElementById('game-over-screen');
const finalGoldText = document.getElementById('final-gold');
const usernameInput = document.getElementById('username-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const highscoreList = document.getElementById('highscore-list');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// --- 2. Spillvariabler ---
const gravity = 0.7;

// Justert bakkehøyde til 110. Dette, kombinert med bilde-offset, plasserer spilleren riktig.
const groundHeight = 110; 

let gameSpeed = 5;
let isGameOver = false;

// Bakgrunn
let bgSpeed = 2;
let bgX1 = 0;
let bgX2 = 0; 

// Poeng og tid
let totalGameTime = 0;
let goldCoins = 0;
let lastFrameTime = 0; 

// Spawning
let coins = [];
let coinSpawnTimer = 0;
let coinSpawnInterval = 2;

let fireballs = [];
let fireballTimer = 0;
let fireballInterval = 3; 

let platforms = [];
let platformTimer = 0;
let platformInterval = 2.5; 

// --- 3. Last inn bilder ---
const playerImg = new Image(); playerImg.src = 'ridder_run.png'; 
const obstacleImg = new Image(); obstacleImg.src = 'fiende.png';
const backgroundImg = new Image(); backgroundImg.src = 'bakgrunn.png';
const goldCoinImg = new Image(); goldCoinImg.src = 'gullmynt.png';
const fireballImg = new Image(); fireballImg.src = 'ildkule.png'; 

// --- 4. Spilleren ---
const player = {
    x: 100,
    y: 0, 
    width: 40,  // LOGISK bredde (hitbox)
    height: 60, // LOGISK høyde (hitbox)
    velocityY: 0,
    isJumping: false, jumpsMade: 0, maxJumps: 2,
    frameX: 0, maxFrames: 8, spriteWidth: 96, spriteHeight: 84, 
    timer: 0, animationSpeed: 5 
};

// --- 5. Hinderet ---
const obstacle = {
    x: 2000, 
    y: 0, 
    width: 40, height: 60,
};

// --- 6. Funksjoner for å tegne ---
function drawBackground() {
    if (bgX2 === 0) bgX2 = canvas.width; 
    ctx.drawImage(backgroundImg, bgX1, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImg, bgX1 + canvas.width, 0, canvas.width, canvas.height);
}
function drawGround() { /* Usynlig hitbox */ }

function drawPlayer() {
    const sx = player.frameX * player.spriteWidth; 
    // Tegner bildet større enn hitboxen, og sentrert over den
    ctx.drawImage(playerImg, sx, 0, player.spriteWidth, player.spriteHeight, 
        player.x - 28, player.y - 24, player.spriteWidth, player.spriteHeight
    );
    
    // DEBUG: Fjern // under for å se den FAKTISKE hitboxen (rød boks)
    // ctx.strokeStyle = "red"; ctx.strokeRect(player.x, player.y, player.width, player.height);
}

function drawObstacle() {
    ctx.drawImage(obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    // DEBUG: 
    // ctx.strokeStyle = "blue"; ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
}

function drawPlatforms() {
    ctx.fillStyle = '#8B4513'; 
    for (const plat of platforms) {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = '#4CAF50'; // Gresskant
        ctx.fillRect(plat.x, plat.y, plat.width, 5);
        ctx.fillStyle = '#8B4513'; 
    }
}

function drawCoins() {
    for (const coin of coins) {
        if (coin.isVisible) ctx.drawImage(goldCoinImg, coin.x, coin.y, coin.width, coin.height);
    }
}
function drawFireballs() {
    for (const fb of fireballs) {
        ctx.drawImage(fireballImg, fb.x, fb.y, fb.width, fb.height);
        // DEBUG:
        // ctx.strokeStyle = "orange"; ctx.strokeRect(fb.x + 10, fb.y + 10, fb.width - 20, fb.height - 20);
    }
}
function drawUI() {
    const totalSeconds = Math.floor(totalGameTime);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedTime = minutes > 0 ? `${minutes}m ${String(seconds).padStart(2,'0')}s` : `${seconds}s`;
    
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = 'gold';
    ctx.textAlign = 'center';
    ctx.fillText(`${goldCoins}G`, canvas.width / 2, 50);
    ctx.textAlign = 'right';
    ctx.fillText(formattedTime, canvas.width - 30, 50);
    ctx.textAlign = 'left';
}

// --- 7. Logikk og Spawning ---

function spawnCoin() {
    let coinY = canvas.height - groundHeight - 40; 
    if (Math.random() < 0.5) { 
        coinY = (canvas.height - groundHeight - 120) - (Math.random() * 100);
    }
    coins.push({ x: canvas.width + 50, y: coinY, width: 30, height: 30, isVisible: true });
}

function spawnFireball() {
    const yMin = canvas.height - groundHeight - 80; 
    const yMax = canvas.height - groundHeight - 250; 
    const yPos = yMin - (Math.random() * (yMin - yMax));
    fireballs.push({ x: canvas.width + 50, y: yPos, width: 70, height: 45, speed: gameSpeed + 3 });
}

function spawnPlatform() {
    // Plattformer spawner mellom 70px og 200px over bakken
    const heightAboveGround = 70 + (Math.random() * 130);
    const platY = canvas.height - groundHeight - heightAboveGround;
    const platW = 150 + (Math.random() * 100);

    const lastPlatform = platforms[platforms.length - 1];
    let spawnX = canvas.width + 50;
    if (lastPlatform) {
        spawnX = Math.max(spawnX, lastPlatform.x + lastPlatform.width + 200); 
    }

    platforms.push({ x: spawnX, y: platY, width: platW, height: 20 });
}

function updateBackground() {
    bgX1 -= bgSpeed;
    if (bgX1 <= -canvas.width) { bgX1 = 0; }
}

function updatePlayer() {
    player.velocityY += gravity;
    player.y += player.velocityY;
    
    // 1. Bakke-kollisjon
    if (player.y > canvas.height - groundHeight - player.height) {
        player.y = canvas.height - groundHeight - player.height;
        player.velocityY = 0;
        player.isJumping = false;
        player.jumpsMade = 0;
    }

    // 2. Plattform-kollisjon (One-Way)
    // Vi sjekker kun hvis vi faller nedover
    if (player.velocityY > 0) {
        for (const plat of platforms) {
            // Er vi innenfor bredden til plattformen?
            const overlapsX = player.x + 10 < plat.x + plat.width && 
                              player.x + player.width - 10 > plat.x;
            
            // Var vi over plattformen i forrige frame?
            const prevBottom = (player.y + player.height) - player.velocityY;
            const isFallingThrough = (player.y + player.height) >= plat.y;
            
            // Treffsone: Toppen av plattformen + 15px nedover
            if (overlapsX && prevBottom <= plat.y && isFallingThrough) {
                player.y = plat.y - player.height; 
                player.velocityY = 0;
                player.isJumping = false;
                player.jumpsMade = 0; 
            }
        }
    }

    // Animasjon
    if (player.isJumping) { player.frameX = 1; } 
    else {
        player.timer++;
        if (player.timer % player.animationSpeed === 0) {
            player.frameX = (player.frameX < player.maxFrames - 1) ? player.frameX + 1 : 0;
        }
    }
}

function updateObstacle() {
    // ENDRET: Løftet fienden OPP med 25 px (-25) så den står oppå gresset
    obstacle.y = canvas.height - groundHeight - obstacle.height - 25; 
    
    obstacle.x -= gameSpeed;
    if (obstacle.x + obstacle.width < 0) {
        obstacle.x = canvas.width + Math.random() * (canvas.width / 2);
    }
}

function updatePlatforms() {
    for (let i = platforms.length - 1; i >= 0; i--) {
        platforms[i].x -= gameSpeed;
        if (platforms[i].x + platforms[i].width < 0) platforms.splice(i, 1);
    }
}
function updateCoins() {
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].x -= gameSpeed;
        if (!coins[i].isVisible || coins[i].x + coins[i].width < 0) coins.splice(i, 1);
    }
}
function updateFireballs() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
        fireballs[i].x -= fireballs[i].speed; 
        if (fireballs[i].x + fireballs[i].width < 0) fireballs.splice(i, 1);
    }
}

// --- 8. Kollisjon (SMARTERE HITBOXER) ---
function checkCollision() {
    // Lager en MINDRE boks for spilleren for å være snillere
    const pBox = { 
        x: player.x + 15,       // Flytt inn fra venstre
        y: player.y + 10,       // Flytt ned fra toppen
        width: player.width - 30, // Gjør smalere
        height: player.height - 15 // Gjør lavere
    };
    
    // Fiende: Også litt mindre boks
    const oBox = { 
        x: obstacle.x + 10, 
        y: obstacle.y + 10, 
        width: obstacle.width - 20, 
        height: obstacle.height - 10 
    };
    
    if (rectIntersect(pBox, oBox)) triggerGameOver();
    
    // Ildkuler: Mye mindre boks (bildet har mye luft)
    for (const fb of fireballs) {
        const fbBox = { 
            x: fb.x + 15, 
            y: fb.y + 15, 
            width: fb.width - 30, 
            height: fb.height - 30 
        };
        if (rectIntersect(pBox, fbBox)) triggerGameOver();
    }
    
    // Mynter er snille, de beholder full størrelse (lettere å plukke opp)
    for (const coin of coins) {
        if (coin.isVisible && rectIntersect(pBox, coin)) {
            goldCoins++; coin.isVisible = false;
        }
    }
}

function rectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.width || r2.x + r2.width < r1.x || r2.y > r1.y + r1.height || r2.y + r2.height < r1.y);
}
function triggerGameOver() {
    isGameOver = true;
    finalGoldText.textContent = goldCoins;
    gameOverScreen.style.display = 'flex';
}

// --- 9. Input og Fullskjerm ---
function doJump() {
    if (isGameOver) return;
    if (player.jumpsMade < player.maxJumps) {
        player.velocityY = -18; player.isJumping = true; player.jumpsMade++;
    }
}
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') doJump();
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); if (!isGameOver) doJump();
}, { passive: false });

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
});

// --- 10. Resize og Highscore ---
function resizeGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (typeof player !== 'undefined') {
        player.y = canvas.height - groundHeight - player.height;
    }
}
window.addEventListener('resize', resizeGame);

function displayHighscores(scores) {
    highscoreList.innerHTML = ''; 
    if (scores.length === 0) { highscoreList.innerHTML = '<li>Ingen scores ennå!</li>'; return; }
    scores.slice(0, 5).forEach(score => {
        const li = document.createElement('li'); li.textContent = `${score.name}: ${score.score}G`;
        highscoreList.appendChild(li);
    });
}
async function loadHighscores() {
    try {
        const response = await fetch('api/get_highscores.php'); 
        if (response.ok) { displayHighscores(await response.json()); }
    } catch (e) { console.error(e); }
}
saveScoreBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim() || 'Anonym';
    saveScoreBtn.disabled = true; saveScoreBtn.textContent = 'Lagrer...';
    try {
        await fetch('api/save_highscore.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: username, score: goldCoins })
        });
    } catch(e) { console.error(e); }
    document.location.reload();
});

// --- 11. Game Loop ---
function gameLoop() {
    if (isGameOver) return;
    const now = Date.now();
    const deltaTime = (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    totalGameTime += deltaTime;

    coinSpawnTimer += deltaTime;
    if (coinSpawnTimer > coinSpawnInterval) {
        spawnCoin(); coinSpawnTimer = 0; coinSpawnInterval = 2 + (Math.random() * 3);
    }
    fireballTimer += deltaTime;
    if (fireballTimer > fireballInterval) {
        spawnFireball(); fireballTimer = 0; fireballInterval = 2 + (Math.random() * 3);
    }
    platformTimer += deltaTime;
    if (platformTimer > platformInterval) {
        spawnPlatform();
        platformTimer = 0;
        platformInterval = 1.5 + (Math.random() * 1.5); 
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground(); 
    drawPlatforms(); 
    drawCoins(); 
    drawFireballs(); 
    drawPlayer(); 
    drawObstacle(); 
    drawUI();
    
    updatePlayer(); 
    updateObstacle(); 
    updatePlatforms(); 
    updateCoins(); 
    updateFireballs(); 
    updateBackground(); 
    checkCollision();
    
    requestAnimationFrame(gameLoop);
}

// --- 12. Start spillet (SIKKER VERSJON) ---
let imagesLoaded = 0;
const totalImages = 5; 
let gameRunning = false;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        startGame();
    }
}

function startGame() {
    if (gameRunning) return; 
    gameRunning = true;
    console.log("Starter spillet!");
    resizeGame(); 
    lastFrameTime = Date.now();
    gameLoop();
    loadHighscores(); 
}

playerImg.onload = imageLoaded; playerImg.onerror = () => console.error("FEIL: ridder_run.png");
obstacleImg.onload = imageLoaded; obstacleImg.onerror = () => console.error("FEIL: fiende.png");
backgroundImg.onload = imageLoaded; backgroundImg.onerror = () => console.error("FEIL: bakgrunn.png");
goldCoinImg.onload = imageLoaded; goldCoinImg.onerror = () => console.error("FEIL: gullmynt.png");
fireballImg.onload = imageLoaded; fireballImg.onerror = () => console.error("FEIL: ildkule.png");

setTimeout(() => {
    if (!gameRunning) {
        console.warn("Tvangsstarter...");
        startGame();
    }
}, 1000);