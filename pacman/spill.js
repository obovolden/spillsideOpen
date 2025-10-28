// 1. Hent HTML-elementer
const gameBoard = document.getElementById('game-board');
const scoreDisplay = document.getElementById('score');

// 2. Definer brettet (labyrinten)
// 0 = Vegg (wall)
// 1 = Prikk (dot)
// 2 = Tomt (empty)
// 3 = Pacman (startposisjon)
const map = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
    [0, 1, 1, 3, 1, 1, 1, 1, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0, 1, 0, 0, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// 3. Spillvariabler
let score = 0;
let pacmanPos = { x: 0, y: 0 };
let totalDots = 0;

// En funksjon for å tegne brettet basert på 'map'-arrayen
function drawBoard() {
    // Tøm brettet før vi tegner på nytt
    gameBoard.innerHTML = ''; 
    
    // Sett opp CSS Grid-kolonnene basert på bredden på kartet
    gameBoard.style.gridTemplateColumns = `repeat(${map[0].length}, 30px)`;

    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            
            const cell = document.createElement('div');
            cell.classList.add('cell');

            // Gi cellen riktig klasse basert på tallet i kartet
            switch (map[y][x]) {
                case 0:
                    cell.classList.add('wall');
                    break;
                case 1:
                    cell.classList.add('dot');
                    break;
                case 2:
                    cell.classList.add('empty');
                    break;
                case 3:
                    cell.classList.add('pacman');
                    // Lagre startposisjonen til Pacman
                    pacmanPos = { x: x, y: y }; 
                    break;
            }
            gameBoard.appendChild(cell);
        }
    }
}

// Funksjon for å flytte spilleren
function movePlayer(dx, dy) {
    let newY = pacmanPos.y + dy;
    let newX = pacmanPos.x + dx;

    // Sjekk hva som er på den nye posisjonen
    const targetCell = map[newY][newX];

    // 1. Kollisjon med vegg?
    if (targetCell === 0) {
        return; // Ikke flytt
    }

    // 2. Fant en prikk?
    if (targetCell === 1) {
        score++;
        totalDots--;
        scoreDisplay.textContent = score;
    }

    // 3. Flytt Pacman
    // Sett den gamle posisjonen til å være tom
    map[pacmanPos.y][pacmanPos.x] = 2; // 2 = empty
    // Sett den nye posisjonen til å være Pacman
    map[newY][newX] = 3; // 3 = pacman
    
    // Oppdater posisjonsvariabelen
    pacmanPos = { x: newX, y: newY };

    // Tegn brettet på nytt med den nye posisjonen
    drawBoard();

    // 4. Sjekk om spillet er vunnet
    if (totalDots === 0) {
        setTimeout(() => {
            alert(`Du vant! Poengsum: ${score}`);
        }, 100); // Liten forsinkelse så brettet rekker å oppdatere
    }
}

// Lytt etter tastetrykk
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            movePlayer(0, -1);
            break;
        case 'ArrowDown':
            movePlayer(0, 1);
            break;
        case 'ArrowLeft':
            movePlayer(-1, 0);
            break;
        case 'ArrowRight':
            movePlayer(1, 0);
            break;
    }
});

// Initialiser spillet (start)
function init() {
    // Tell hvor mange prikker som finnes på brettet
    totalDots = 0;
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === 1) {
                totalDots++;
            }
            // Finn Pacmans startposisjon (hvis vi ikke gjorde det i drawBoard)
            if (map[y][x] === 3) {
                 pacmanPos = { x: x, y: y };
            }
        }
    }
    
    scoreDisplay.textContent = score;
    drawBoard();
}

// Start spillet!
init();