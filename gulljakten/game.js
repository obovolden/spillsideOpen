// --- Oppsett av Canvas ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- UI Elementer ---
const playerHpEl = document.getElementById('player-hp');
const playerGoldEl = document.getElementById('player-gold');
const highscoreListEl = document.getElementById('highscore-list');
const gameOverFormEl = document.getElementById('gameover-form-container');
const usernameInputEl = document.getElementById('username');
const finalScoreEl = document.getElementById('final-score');

// --- Spill-konstanter ---
const GRAVITY = 0.6;
const GROUND_Y = canvas.height - 70;
const JUMP_STRENGTH = -14;

// --- Spillvariabler ---
let player;
let enemies = [];
let items = [];
let keys = {};
let score = 0;
let currentFinalScore = 0; // Lagrer poengsum ved game over

// --- Spill-tilstand ---
let gameRunning = true;
let showingScoreForm = false;

// --- Spawn-kontroll ---
let itemSpawnTimer = 0;
let enemySpawnTimer = 0;
const MAX_ITEMS = 5;
const MAX_ENEMIES = 3;

// --- Spiller-objekt ---
player = {
    x: canvas.width / 2 - 20,
    y: GROUND_Y - 50,
    width: 40,
    height: 60,
    speed: 5,
    velocityY: 0,
    isOnGround: true,
    facingDirection: 'right',
    hp: 10,
    maxHp: 10,
    isAttacking: false,
    isBlocking: false,
    attackTimer: 0,
    hitCooldown: 0
};

// --- Hjelpefunksjon for kollisjon ---
function isColliding(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// --- Spiller-funksjoner ---
function drawPlayer() {
    // (Samme som før)
    ctx.fillStyle = '#4682B4';
    ctx.fillRect(player.x, player.y + 15, player.width, player.height - 15);
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 15, player.width / 3, 0, Math.PI * 2);
    ctx.fillStyle = '#F0D9B5';
    ctx.fill();
    ctx.closePath();

    const armX = player.x + (player.facingDirection === 'right' ? player.width : 0);
    const armY = player.y + 25;
    const shieldWidth = 15;
    const swordSwingRadius = 40;

    if (player.isBlocking) {
        ctx.fillStyle = '#A52A2A';
        const shieldX = player.facingDirection === 'right' ? armX : armX - shieldWidth;
        ctx.fillRect(shieldX, player.y + 15, shieldWidth, player.height - 20);
    } else if (player.isAttacking) {
        ctx.strokeStyle = '#C0C0C0';
        ctx.lineWidth = 5;
        ctx.beginPath();
        let startAngle = player.facingDirection === 'right' ? -Math.PI / 4 : Math.PI + Math.PI / 4;
        let endAngle = player.facingDirection === 'right' ? Math.PI / 2 : Math.PI - Math.PI / 2;
        ctx.arc(armX, armY, swordSwingRadius, startAngle, endAngle, player.facingDirection === 'left');
        ctx.stroke();
    }
    
    if (player.hitCooldown > 0 && Math.floor(player.hitCooldown / 5) % 2 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

function updatePlayer() {
    if (!gameRunning) return; // Ikke gjør noe hvis spillet ikke kjører

    if (keys['a']) {
        player.x -= player.speed;
        player.facingDirection = 'left';
    }
    if (keys['d']) {
        player.x += player.speed;
        player.facingDirection = 'right';
    }
    if ((keys['w'] || keys[' ']) && player.isOnGround) {
        player.velocityY = JUMP_STRENGTH;
        player.isOnGround = false;
    }
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    if (player.y + player.height > GROUND_Y) {
        player.y = GROUND_Y - player.height;
        player.velocityY = 0;
        player.isOnGround = true;
    }
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.attackTimer > 0) player.attackTimer--;
    if (player.hitCooldown > 0) player.hitCooldown--;
    if (player.attackTimer === 0) player.isAttacking = false;
    player.isBlocking = (keys['k'] === true && !player.isAttacking);
}

// --- Fiende-funksjoner ---
function spawnEnemy() {
    enemies.push({
        x: Math.random() < 0.5 ? 50 : canvas.width - 100,
        y: GROUND_Y - 40, width: 40, height: 40, speed: 1, hp: 3,
        direction: Math.random() < 0.5 ? 1 : -1, hitFlashTimer: 0
    });
}
function drawEnemies() {
    for (const enemy of enemies) {
        ctx.fillStyle = '#DC143C';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(enemy.x + 8, enemy.y + 10, 5, 5);
        ctx.fillRect(enemy.x + 27, enemy.y + 10, 5, 5);
        if (enemy.hitFlashTimer > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    }
}
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        enemy.x += enemy.speed * enemy.direction;
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
            enemy.direction *= -1;
        }
        if (enemy.hitFlashTimer > 0) enemy.hitFlashTimer--;
        if (enemy.hp <= 0) {
            enemies.splice(i, 1);
        }
    }
}

// --- Gjenstand-funksjoner ---
function spawnItem() {
    items.push({
        x: Math.random() * (canvas.width - 20),
        y: GROUND_Y - 20, width: 20, height: 20, type: 'gold'
    });
}
function drawItems() {
    for (const item of items) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(item.x + item.width / 2, item.y + item.height / 2, item.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }
}

// --- Bakgrunn ---
function drawBackground() {
    ctx.fillStyle = '#006400';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.fillStyle = '#A9A9A9';
    ctx.beginPath();
    ctx.moveTo(100, GROUND_Y); ctx.lineTo(200, GROUND_Y - 150); ctx.lineTo(300, GROUND_Y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(500, GROUND_Y); ctx.lineTo(600, GROUND_Y - 200);
    ctx.lineTo(650, GROUND_Y - 150); ctx.lineTo(700, GROUND_Y);
    ctx.closePath(); ctx.fill();
}

// --- Kollisjon og Logikk ---
function checkCollisions() {
    if (!gameRunning) return;

    for (let i = items.length - 1; i >= 0; i--) {
        if (isColliding(player, items[i])) {
            score++;
            items.splice(i, 1);
            updateUI();
        }
    }
    let attackHitbox = null;
    if (player.isAttacking) {
        const hitboxWidth = 50;
        attackHitbox = { y: player.y, height: player.height };
        if (player.facingDirection === 'right') {
            attackHitbox.x = player.x + player.width;
            attackHitbox.width = hitboxWidth;
        } else {
            attackHitbox.x = player.x - hitboxWidth;
            attackHitbox.width = hitboxWidth;
        }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        if (attackHitbox && isColliding(attackHitbox, enemy)) {
            enemy.hp--;
            enemy.hitFlashTimer = 10;
            player.isAttacking = false;
        }
        if (isColliding(player, enemy) && player.hitCooldown === 0) {
            if (player.isBlocking) {
                player.hitCooldown = 30;
            } else {
                player.hp--;
                player.hitCooldown = 120;
                updateUI();
                if (player.hp <= 0) endGame();
            }
        }
    }
}

// --- Highscore-funksjoner (NYE) ---
function showGameOverForm(finalScore) {
    finalScoreEl.innerText = finalScore;
    gameOverFormEl.style.display = 'block';
    usernameInputEl.focus();
}
function hideGameOverForm() {
    gameOverFormEl.style.display = 'none';
    usernameInputEl.value = '';
}
function loadHighscores() {
    const scores = localStorage.getItem('gameHighscores');
    return scores ? JSON.parse(scores) : [];
}
function displayHighscores() {
    const scores = loadHighscores();
    highscoreListEl.innerHTML = '';
    if (scores.length === 0) {
        highscoreListEl.innerHTML = '<li>Ingen poeng lagret ennå.</li>';
        return;
    }
    scores.forEach(score => {
        const li = document.createElement('li');
        li.innerHTML = `${score.name} - <strong>${score.score}</strong>`;
        highscoreListEl.appendChild(li);
    });
}
function saveHighscore(name, score) {
    const scores = loadHighscores();
    const newScore = { name: name || 'Anonym Ridder', score: score };
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 5);
    localStorage.setItem('gameHighscores', JSON.stringify(topScores));
    displayHighscores();
}

// --- Spill-styring (OPPDATERT) ---
function updateUI() {
    playerHpEl.innerText = player.hp;
    playerGoldEl.innerText = score;
}

function endGame() {
    gameRunning = false;
    showingScoreForm = true;
    currentFinalScore = score;
    showGameOverForm(currentFinalScore);
}

function resetGame() {
    player.hp = player.maxHp;
    player.x = canvas.width / 2 - 20;
    player.y = GROUND_Y - 50;
    player.velocityY = 0;
    player.hitCooldown = 0;
    player.isAttacking = false;
    player.isBlocking = false;
    
    enemies = [];
    items = [];
    score = 0;
    currentFinalScore = 0;
    itemSpawnTimer = 0;
    enemySpawnTimer = 0;
    
    gameRunning = true;
    showingScoreForm = false;
    hideGameOverForm();
    updateUI();
    
    // Spawn et nytt start-sett
    spawnEnemy();
    spawnItem();
    spawnItem();
}

// --- Kontroller (Tastatur) (OPPDATERT) ---
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Start angrep
    if (key === 'j' && gameRunning && !player.isAttacking && !player.isBlocking) {
        player.isAttacking = true;
        player.attackTimer = 15;
    }
    
    // Hopp-tast fungerer OGSÅ som "prøv igjen"
    if ((key === 'w' || key === ' ') && !gameRunning && !showingScoreForm) {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    delete keys[e.key.toLowerCase()];
});

// --- Kontroller (Touch) (OPPDATERT) ---
function handleTouch(e, key, isStart) {
    e.preventDefault();
    if (isStart) keys[key] = true;
    else delete keys[key];
}
document.getElementById('btn-left').addEventListener('touchstart', (e) => handleTouch(e, 'a', true));
document.getElementById('btn-left').addEventListener('touchend', (e) => handleTouch(e, 'a', false));
document.getElementById('btn-right').addEventListener('touchstart', (e) => handleTouch(e, 'd', true));
document.getElementById('btn-right').addEventListener('touchend', (e) => handleTouch(e, 'd', false));
document.getElementById('btn-block').addEventListener('touchstart', (e) => handleTouch(e, 'k', true));
document.getElementById('btn-block').addEventListener('touchend', (e) => handleTouch(e, 'k', false));

// Hopp-knapp fungerer OGSÅ som "prøv igjen"
document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameRunning) {
        handleTouch(e, 'w', true);
    } else if (!showingScoreForm) {
        resetGame();
    }
});
document.getElementById('btn-jump').addEventListener('touchend', (e) => handleTouch(e, 'w', false));

// Angrep-knapp
document.getElementById('btn-attack').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameRunning && !player.isAttacking && !player.isBlocking) {
        player.isAttacking = true;
        player.attackTimer = 15;
    }
});

// --- Highscore Skjema-håndtering (NY) ---
gameOverFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    saveHighscore(usernameInputEl.value, currentFinalScore);
    showingScoreForm = false; // Gå til "Prøv igjen"-skjermen
    hideGameOverForm();
});


// --- Hoved Spill-løkke (Game Loop) (OPPDATERT) ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    if (gameRunning) {
        // --- SPILLET KJOBRER ---
        updatePlayer();
        updateEnemies();
        
        // Kontinuerlig spawning
        itemSpawnTimer++;
        if (itemSpawnTimer > (300 + Math.random() * 300) && items.length < MAX_ITEMS) {
            spawnItem();
            itemSpawnTimer = 0;
        }
        enemySpawnTimer++;
        if (enemySpawnTimer > (600 + Math.random() * 300) && enemies.length < MAX_ENEMIES) {
            spawnEnemy();
            enemySpawnTimer = 0;
        }
        checkCollisions();

    } else if (!showingScoreForm) {
        // --- "PRØV IGJEN"-SKJERM ---
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '30px Arial';
        ctx.fillText('Din poengsum: ' + currentFinalScore, canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Trykk HOPP (W) for å prøve på nytt', canvas.width / 2, canvas.height / 2 + 50);
    }
    // (Hvis showingScoreForm er true, vises HTML-skjemaet, så vi tegner ingenting)

    // Tegn alltid enheter, selv om spillet er pauset
    drawItems();
    drawEnemies();
    drawPlayer();

    requestAnimationFrame(gameLoop);
}

// --- Start spillet! ---
updateUI();
displayHighscores(); // Last inn highscores ved start
spawnEnemy();
spawnItem();
spawnItem();
gameLoop();