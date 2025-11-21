/* --- JAVASCRIPT: Logikk og Spillmotor --- */

// --- 1. KONFIGURASJON OG KARTDATA ---
const TILE_SIZE = 40;
const ROWS = 15; 
const COLS = 20; 

// 0 = Gress, 1 = Tre, 2 = Høyt gress
const mapLayout = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// --- 2. SPILL-VARIABLER ---
let playerPos = { x: 2, y: 2 }; 
let isBattling = false; 
let isPlayerTurn = true;

// HP
let enemyMaxHP = 100;
let enemyCurrentHP = 100;
let playerMaxHP = 100;
let playerCurrentHP = 100;

// Elementer
const playerEl = document.getElementById('player');
const worldEl = document.getElementById('world');
const battleScreen = document.getElementById('battle-screen');
const battleText = document.getElementById('battle-text');
const gameContainer = document.getElementById('game-container');
const enemyHPFill = document.getElementById('enemy-hp-fill');
const playerHPFill = document.getElementById('player-hp-fill');
const playerHPText = document.getElementById('player-hp-numbers');
const movesDiv = document.getElementById('moves-div');

// --- 3. KART OG BEVEGELSE ---
function drawMap() {
    worldEl.innerHTML = '';
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let tileType = mapLayout[y][x];
            let tile = document.createElement('div');
            tile.classList.add('tile');
            tile.style.left = (x * TILE_SIZE) + 'px';
            tile.style.top = (y * TILE_SIZE) + 'px';
            if (tileType === 1) tile.classList.add('tree');
            if (tileType === 2) tile.classList.add('tall-grass');
            worldEl.appendChild(tile);
        }
    }
    updatePlayerVisuals();
}

function updatePlayerVisuals() {
    playerEl.style.left = (playerPos.x * TILE_SIZE + 2) + 'px'; 
    playerEl.style.top = (playerPos.y * TILE_SIZE + 2) + 'px';
}

document.addEventListener('keydown', (e) => {
    if (isBattling) return; 
    let nextX = playerPos.x;
    let nextY = playerPos.y;
    if (e.key === 'ArrowUp') nextY--;
    if (e.key === 'ArrowDown') nextY++;
    if (e.key === 'ArrowLeft') nextX--;
    if (e.key === 'ArrowRight') nextX++;

    if (nextX >= 0 && nextX < COLS && nextY >= 0 && nextY < ROWS) {
        if (mapLayout[nextY][nextX] !== 1) {
            playerPos.x = nextX;
            playerPos.y = nextY;
            updatePlayerVisuals();
            checkEncounter();
        }
    }
});

function checkEncounter() {
    if (mapLayout[playerPos.y][playerPos.x] === 2) {
        if (Math.random() < 0.15) startBattle();
    }
}

// --- 4. KAMPSYSTEM ---
function startBattle() {
    isBattling = true;
    isPlayerTurn = true;
    enemyCurrentHP = enemyMaxHP; // Ny fiende, full HP
    
    updateHealthUI();
    movesDiv.style.display = 'grid'; 
    document.getElementById('enemy-sprite').style.transform = "scale(1)";
    
    gameContainer.style.filter = "invert(1)";
    setTimeout(() => {
        gameContainer.style.filter = "none";
        battleScreen.style.display = 'flex';
        battleText.innerText = "En vill Pidgey dukket opp!";
    }, 500);
}

function updateHealthUI() {
    // Fiende
    const enemyPercent = (enemyCurrentHP / enemyMaxHP) * 100;
    enemyHPFill.style.width = enemyPercent + "%";
    enemyHPFill.style.backgroundColor = enemyPercent < 20 ? "#ff4040" : "#4caf50";

    // Spiller
    const playerPercent = (playerCurrentHP / playerMaxHP) * 100;
    playerHPFill.style.width = playerPercent + "%";
    playerHPFill.style.backgroundColor = playerPercent < 20 ? "#ff4040" : "#4caf50";
    
    playerHPText.innerText = playerCurrentHP + " / " + playerMaxHP;
}

// SPILLERENS TUR
function playerTurn(moveName) {
    if (!isPlayerTurn) return; 

    let damage = 0;
    let message = "";

    if (moveName === 'Bubble') { damage = 20; message = "Piplup blåste bobler!"; }
    else if (moveName === 'Tackle') { damage = 15; message = "Piplup taklet fienden!"; }
    else if (moveName === 'Peck') { damage = 30; message = "Piplup brukte nebbet!"; }
    else if (moveName === 'Hydro Pump') { damage = 60; message = "En enorm vannstråle traff Pidgey!"; }

    battleText.innerText = message;
    movesDiv.style.display = 'none'; 

    // Animasjon
    const enemySprite = document.getElementById('enemy-sprite');
    enemySprite.style.transition = "transform 0.1s";
    enemySprite.style.transform = "translateX(10px)";
    setTimeout(() => enemySprite.style.transform = "translateX(-10px)", 100);
    setTimeout(() => enemySprite.style.transform = "translateX(0)", 200);

    setTimeout(() => {
        enemyCurrentHP -= damage;
        if (enemyCurrentHP < 0) enemyCurrentHP = 0;
        updateHealthUI();

        if (enemyCurrentHP <= 0) {
            battleText.innerText = "Pidgey besvimte! Du vant!";
            enemySprite.style.transform = "scale(0)";
            setTimeout(endBattle, 2000);
        } else {
            isPlayerTurn = false;
            setTimeout(enemyTurn, 1500);
        }
    }, 1000);
}

// FIENDENS TUR
function enemyTurn() {
    battleText.innerText = "Pidgey angriper!";
    
    setTimeout(() => {
        let damage = Math.floor(Math.random() * 10) + 5;
        battleText.innerText = "Pidgey brukte Tackle! (" + damage + " skade)";

        const playerSprite = document.getElementById('player-sprite');
        playerSprite.style.transform = "translateX(10px)";
        setTimeout(() => playerSprite.style.transform = "translateX(-10px)", 100);
        setTimeout(() => playerSprite.style.transform = "translateX(0)", 200);

        playerCurrentHP -= damage;
        if (playerCurrentHP < 0) playerCurrentHP = 0;
        updateHealthUI();

        if (playerCurrentHP <= 0) {
            battleText.innerText = "Piplup besvimte... Du tapte.";
            playerSprite.style.transform = "scale(0)";
            setTimeout(() => {
                alert("Game Over! Spillet starter på nytt.");
                location.reload(); 
            }, 2000);
        } else {
            isPlayerTurn = true;
            setTimeout(() => {
                battleText.innerText = "Hva vil Piplup gjøre?";
                movesDiv.style.display = 'grid'; 
            }, 1000);
        }
    }, 1000);
}

function runAway() {
    if (!isPlayerTurn) return;
    battleText.innerText = "Du løp trygt unna...";
    setTimeout(endBattle, 1000);
}

function endBattle() {
    battleScreen.style.display = 'none';
    isBattling = false;
}

// Start
drawMap();