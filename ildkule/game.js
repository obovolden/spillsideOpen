// --- Oppsett av Canvas ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Hent HTML-elementer ---
const highscoreListEl = document.getElementById('highscore-list');
const gameOverFormEl = document.getElementById('gameover-form-container');
const usernameInputEl = document.getElementById('username');
const submitScoreBtn = document.getElementById('submit-score');
const finalScoreEl = document.getElementById('final-score');

// --- Spillvariabler ---
let gameRunning = false;
let player;
let obstacles = [];
let keys = {};
let spawnTimer = 0;
let score = 0;
let currentFinalScore = 0; // Lagrer poengsum ved game over

// --- Spiller-objekt (samme som før) ---
player = {
    x: canvas.width / 2 - 15,
    y: canvas.height - 80,
    width: 30,
    height: 50,
    speed: 5,
};

// --- Funksjoner for tegning og oppdatering (SAMME SOM FØR) ---
// drawPlayer(), updatePlayer(), spawnObstacle(), drawObstacles(), updateObstacles(), drawBackground()
// ... (Lim inn alle disse funksjonene fra forrige svar) ...
// ... (For å spare plass, hopper jeg over dem her, men de MÅ være med) ...

// (Her er de forrige funksjonene du må lime inn)
function drawPlayer() {
    ctx.fillStyle = '#4682B4'; 
    ctx.fillRect(player.x, player.y + 10, player.width, player.height - 10);
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + 10, player.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#F0D9B5';
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(player.x, player.y + player.height - 10, player.width / 2, 10); 
    ctx.fillRect(player.x + player.width / 2, player.y + player.height - 10, player.width / 2, 10);
}
function updatePlayer() {
    if ('w' in keys) player.y -= player.speed;
    if ('s' in keys) player.y += player.speed;
    if ('a' in keys) player.x -= player.speed;
    if ('d' in keys) player.x += player.speed;
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;
}
function spawnObstacle() {
    let obstacle = {
        x: Math.random() * (canvas.width - 40), y: -50, radius: 20, speed: 2 + Math.random() * 3
    };
    obstacles.push(obstacle);
}
function drawObstacles() {
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        let gradient = ctx.createRadialGradient(obs.x, obs.y, 0, obs.x, obs.y, obs.radius);
        gradient.addColorStop(0, 'rgba(255, 255, 0, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();
    }
}
function updateObstacles() {
    spawnTimer++;
    if (spawnTimer % (90 + Math.floor(Math.random() * 60)) === 0) {
        spawnObstacle();
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.y += obs.speed;
        if (obs.y - obs.radius > canvas.height) {
            obstacles.splice(i, 1);
            score++;
        }
    }
}
function drawBackground() {
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B0E0E6');
    gradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#A9A9A9';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 150);
    ctx.lineTo(50, canvas.height - 200); ctx.lineTo(100, canvas.height - 150);
    ctx.lineTo(150, canvas.height - 180); ctx.lineTo(200, canvas.height - 120);
    ctx.lineTo(250, canvas.height - 170); ctx.lineTo(canvas.width, canvas.height - 150);
    ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height);
    ctx.closePath(); ctx.fill();
    for (let i = 0; i < 15; i++) {
        let x = Math.random() * canvas.width;
        let y = canvas.height - 70 - (Math.random() * 50);
        let radius = 10 + Math.random() * 15;
        ctx.fillStyle = `hsl(120, 40%, ${40 + Math.random() * 10}%)`;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    for (let i = 0; i < 20; i++) {
        let x = Math.random() * canvas.width;
        let y = canvas.height - 70 + (Math.random() * 60);
        let size = 2 + Math.random() * 5;
        ctx.fillStyle = `rgba(0,0,0, ${0.1 + Math.random() * 0.2})`;
        ctx.fillRect(x, y, size, size);
    }
}
// --- Slutt på innlimte funksjoner ---


// --- Funksjon for å sjekke kollisjon (OPPDATERT) ---
function checkCollision() {
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        let testX = obs.x, testY = obs.y;

        if (obs.x < player.x) testX = player.x;
        else if (obs.x > player.x + player.width) testX = player.x + player.width;
        if (obs.y < player.y) testY = player.y;
        else if (obs.y > player.y + player.height) testY = player.y + player.height;

        let distX = obs.x - testX, distY = obs.y - testY;
        let distance = Math.sqrt((distX * distX) + (distY * distY));

        if (distance <= obs.radius) {
            gameRunning = false;
            currentFinalScore = score; // Lagre poengsum
            showGameOverForm(score); // Vis skjema
            break;
        }
    }
}

// --- Funksjon for å vise start/game over-meny (på canvas) ---
function drawMenu() {
    // Vises kun hvis spillet ikke kjører OG highscore-skjemaet ikke er synlig
    if (gameOverFormEl.style.display === 'block') return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    
    if (score === 0 && currentFinalScore === 0) { // Første start
        ctx.font = '40px Arial';
        ctx.fillText('Unngå Ildkulene!', canvas.width / 2, canvas.height / 2 - 60);
        ctx.font = '25px Arial';
        ctx.fillText('Trykk MELLOMROM / START', canvas.width / 2, canvas.height / 2);
    } else { // "Prøv igjen"-skjerm (etter at skjema er sendt)
        ctx.font = '50px Arial';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '30px Arial';
        ctx.fillText('Din poengsum: ' + currentFinalScore, canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Trykk MELLOMROM / START', canvas.width / 2, canvas.height / 2 + 50);
    }
}

// --- Funksjon for å resette spillet (OPPDATERT) ---
function resetGame() {
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - 80;
    obstacles = [];
    score = 0;
    currentFinalScore = 0;
    spawnTimer = 0;
    gameRunning = true;
    hideGameOverForm(); // Skjul skjemaet hvis det var åpent
}

// --- Funksjoner for Highscore (NYE) ---
function showGameOverForm(finalScore) {
    finalScoreEl.innerText = finalScore;
    gameOverFormEl.style.display = 'block';
    usernameInputEl.focus(); // Sett fokus på inputfeltet
}

function hideGameOverForm() {
    gameOverFormEl.style.display = 'none';
    usernameInputEl.value = ''; // Tøm feltet
}

function loadHighscores() {
    const scores = localStorage.getItem('gameHighscores');
    return scores ? JSON.parse(scores) : [];
}

function displayHighscores() {
    const scores = loadHighscores();
    highscoreListEl.innerHTML = ''; // Tøm listen
    
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
    const newScore = { name: name || 'Anonym', score: score };
    
    scores.push(newScore);
    scores.sort((a, b) => b.score - a.score); // Sorter synkende
    const topScores = scores.slice(0, 5); // Behold kun topp 5
    
    localStorage.setItem('gameHighscores', JSON.stringify(topScores));
    displayHighscores(); // Oppdater listen
}

// --- Kontroller (Tastatur) (OPPDATERT) ---
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ' || key === 'spacebar') {
        if (!gameRunning) {
            resetGame();
        }
        e.preventDefault();
    } else {
        keys[key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    delete keys[e.key.toLowerCase()];
});

// --- Kontroller (Mobil Touch) (NYE) ---
function handleTouchStart(e, key) {
    e.preventDefault();
    keys[key] = true;
}
function handleTouchEnd(e, key) {
    e.preventDefault();
    delete keys[key];
}

document.getElementById('btn-up').addEventListener('touchstart', (e) => handleTouchStart(e, 'w'));
document.getElementById('btn-up').addEventListener('touchend', (e) => handleTouchEnd(e, 'w'));

document.getElementById('btn-left').addEventListener('touchstart', (e) => handleTouchStart(e, 'a'));
document.getElementById('btn-left').addEventListener('touchend', (e) => handleTouchEnd(e, 'a'));

document.getElementById('btn-down').addEventListener('touchstart', (e) => handleTouchStart(e, 's'));
document.getElementById('btn-down').addEventListener('touchend', (e) => handleTouchEnd(e, 's'));

document.getElementById('btn-right').addEventListener('touchstart', (e) => handleTouchStart(e, 'd'));
document.getElementById('btn-right').addEventListener('touchend', (e) => handleTouchEnd(e, 'd'));

document.getElementById('btn-action').addEventListener('click', (e) => {
    e.preventDefault();
    if (!gameRunning) {
        resetGame();
    }
});

// --- Highscore Skjema-håndtering (NY) ---
gameOverFormEl.addEventListener('submit', (e) => {
    e.preventDefault(); // Stopp siden fra å laste på nytt
    saveHighscore(usernameInputEl.value, currentFinalScore);
    hideGameOverForm();
    // Spillet vil nå vise "Prøv igjen"-menyen i neste gameLoop
});


// --- Hoved Spill-løkke (Game Loop) (LITT OPPDATERT) ---
function gameLoop() {
    if (gameRunning) {
        // --- SPILLET KJOBRER ---
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        updateObstacles();
        drawObstacles();
        updatePlayer();
        drawPlayer();
        checkCollision();
        
        // Tegn poengsum under spillet
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Poeng: ' + score, 10, 30);
    } else {
        // --- SPILLET ER PAUSET (Start/Game Over) ---
        drawMenu(); // Tegner start/game over-skjermen PÅ canvas
    }
    
    requestAnimationFrame(gameLoop);
}

// --- Start spillet! ---
displayHighscores(); // Last highscores når siden lastes
gameLoop(); // Start spill-løkken