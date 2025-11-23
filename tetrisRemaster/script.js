const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

const holdCanvas = document.getElementById('hold');
const holdContext = holdCanvas.getContext('2d');

const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

// SKALA
context.scale(30, 30);
holdContext.scale(20, 20);
nextContext.scale(20, 20);

// --- SPILL VARIABLER ---
// ENDRING: Starter på 0 i stedet for -1, så første linje blir Combo x1
let combo = 0; 
let dropCounter = 0;
let dropInterval = 1000; 
let lastTime = 0;
let isChaosMode = false; 

// ENDRING: Lavere tall = baren varer lengre (ca 5-6 sekunder nå)
const COMBO_DECAY_RATE = 0.015; 

const colors = [
    null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'
];

// --- OPPSETT ---
function createPiece(type) {
    if (type === 'I') return [ [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0] ];
    if (type === 'L') return [ [0, 2, 0], [0, 2, 0], [0, 2, 2] ];
    if (type === 'J') return [ [0, 3, 0], [0, 3, 0], [3, 3, 0] ];
    if (type === 'O') return [ [4, 4], [4, 4] ];
    if (type === 'Z') return [ [5, 5, 0], [0, 5, 5], [0, 0, 0] ];
    if (type === 'S') return [ [0, 6, 6], [6, 6, 0], [0, 0, 0] ];
    if (type === 'T') return [ [0, 7, 0], [7, 7, 7], [0, 0, 0] ];
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function collide(arena, player) {
    const m = player.matrix;
    const o = player.pos;
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

// --- TEGNING ---
function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0}, context);

    // Ghost Piece
    const ghostPos = { x: player.pos.x, y: player.pos.y };
    while (!collide(arena, { matrix: player.matrix, pos: ghostPos })) {
        ghostPos.y++;
    }
    ghostPos.y--;
    drawMatrix(player.matrix, ghostPos, context, true); 

    drawMatrix(player.matrix, player.pos, context);

    // Hold
    holdContext.fillStyle = '#000';
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (player.holdMatrix) centerPiece(player.holdMatrix, holdContext);

    // Next
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (player.nextMatrix) centerPiece(player.nextMatrix, nextContext);
}

function centerPiece(matrix, ctx) {
    const offsetX = (5 - matrix[0].length) / 2;
    const offsetY = (4 - matrix.length) / 2;
    drawMatrix(matrix, {x: offsetX, y: offsetY}, ctx);
}

function drawMatrix(matrix, offset, ctx, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                if (isGhost) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.lineWidth = 0.05;
                    ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
                } else {
                    ctx.fillStyle = colors[value];
                    ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(x + offset.x, y + offset.y, 1, 0.1);
                    ctx.fillRect(x + offset.x, y + offset.y, 0.1, 1);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.fillRect(x + offset.x + 0.9, y + offset.y, 0.1, 1);
                    ctx.fillRect(x + offset.x, y + offset.y + 0.9, 1, 0.1);
                }
            }
        });
    });
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerHold() {
    if (!player.canHold) return;
    if (player.holdMatrix === null) {
        player.holdMatrix = player.matrix;
        playerReset(true); 
    } else {
        const temp = player.matrix;
        player.matrix = player.holdMatrix;
        player.holdMatrix = temp;
        player.pos.y = 0;
        player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    }
    player.canHold = false;
}

function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--; 
    merge(arena, player); 
    playerReset();        
    arenaSweep();         
    dropCounter = 0;
}

function updateSpeed() {
    if (isChaosMode) return; 
    const newSpeed = Math.max(100, 1000 - ((player.level - 1) * 100));
    dropInterval = newSpeed;
}

// --- LOGIKK FOR LINJER OG COMBO ---
function arenaSweep() {
    let rowCount = 0;
    outer: for (let y = arena.length -1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        // LINJER RYDDET!
        combo++; // Nå øker denne fra 0 til 1 ved første rydding
        player.lines += rowCount;
        
        // FYLL OPP COMBO-BAREN TIL 100%
        player.comboEnergy = 100;

        // POENGSUMMER
        const lineScores = [0, 200, 500, 1000, 2000]; 
        let score = lineScores[rowCount] || (rowCount * 300);
        
        // Multipliser med nivået
        score = score * player.level;
        
        // BONUS FOR COMBO
        score += (combo * 200 * player.level); 

        player.score += score;
        
        const newLevel = Math.floor(player.lines / 10) + 1;
        if (newLevel > player.level) {
            player.level = newLevel;
            updateSpeed();
        }
        
        updateStats();
    } 
}

function updateStats() {
    document.getElementById('score').innerText = player.score;
    document.getElementById('level').innerText = player.level;
    document.getElementById('lines').innerText = player.lines;
}

// --- COMBO BAR OG RESET LOGIKK ---
function updateComboLogic(deltaTime) {
    const comboContainer = document.getElementById('combo-container');
    const comboCountDiv = document.getElementById('combo-count');
    const comboFill = document.getElementById('combo-fill');

    if (player.comboEnergy > 0) {
        player.comboEnergy -= COMBO_DECAY_RATE * deltaTime; 
        
        // Hvis baren går tom
        if (player.comboEnergy <= 0) {
            player.comboEnergy = 0;
            combo = 0; // ENDRET HER: Nullstiller til 0, ikke -1
        }
    }

    comboFill.style.width = player.comboEnergy + "%";

    const displayNum = combo > 0 ? combo : 0;
    comboCountDiv.innerText = "x" + displayNum;

    if (combo > 0 && player.comboEnergy > 0) {
        comboContainer.classList.add('active');
    } else {
        comboContainer.classList.remove('active');
        comboContainer.style.transform = "scale(1)";
    }
}

function playerReset(fromHold = false) {
    const pieces = 'TJLOSZI';
    if (player.nextMatrix === null) player.nextMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);

    if (fromHold) {
        player.matrix = player.nextMatrix;
        player.nextMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    } else {
        player.matrix = player.nextMatrix;
        player.nextMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    }

    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    player.canHold = true;

    // GAME OVER
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        player.lines = 0;
        player.level = 1;
        player.holdMatrix = null;
        player.comboEnergy = 0; 
        
        combo = 0; // ENDRET HER: Nullstiller til 0, ikke -1
        
        updateStats();
        updateSpeed();
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    updateComboLogic(deltaTime);

    draw();
    requestAnimationFrame(update);
}

function activateChaos() {
    if (isChaosMode) return; 
    const btn = document.getElementById('chaosBtn');
    isChaosMode = true;
    dropInterval = 60; 
    btn.innerText = "⚡ CHAOS!!! ⚡";
    btn.style.backgroundColor = "#ff4d4d";
    
    setTimeout(() => {
        isChaosMode = false;
        updateSpeed(); 
        btn.innerText = "CHAOS MODE ⚡";
        btn.style.backgroundColor = "#f0db4f";
    }, 5000);
}

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) { 
        player.pos.x--;
        if (collide(arena, player)) player.pos.x++;
    } else if (event.keyCode === 39) { 
        player.pos.x++;
        if (collide(arena, player)) player.pos.x--;
    } else if (event.keyCode === 40) { 
        playerDrop();
    } else if (event.keyCode === 81) { 
        playerRotate(-1);
    } else if (event.keyCode === 87 || event.keyCode === 38) { 
        playerRotate(1);
    } else if (event.keyCode === 32) { 
        event.preventDefault();
        playerHardDrop();
    } else if (event.keyCode === 67) { 
        playerHold();
    }
});

const arena = createMatrix(12, 20);
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
    lines: 0,     
    level: 1,     
    holdMatrix: null,
    nextMatrix: null,
    canHold: true,
    comboEnergy: 0 
};

playerReset();
updateStats(); 
update();