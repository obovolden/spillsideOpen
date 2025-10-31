// --- Oppsett av Canvas ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // --- Hent HTML-elementer ---
    const highscoreListEl = document.getElementById('highscore-list');
    const gameOverFormEl = document.getElementById('gameover-form-container');
    const usernameInputEl = document.getElementById('username');
    const finalScoreEl = document.getElementById('final-score');

    // --- Spillvariabler ---
    let gameRunning = false;
    let player;
    let obstacles = [];
    let keys = {};
    let spawnTimer = 0;
    let score = 0;
    let currentFinalScore = 0;

    player = {
        x: canvas.width / 2 - 15,
        y: canvas.height - 80,
        width: 30,
        height: 50,
        speed: 5,
    };

    // =========================================================================
    // === NYE DATABASE-FUNKSJONER (erstatter localStorage) ===
    // =========================================================================

    // VIKTIG: Pass på at stien til PHP-filene er riktig!
    const addScoreURL = 'api/add_fireball_score.php';
    const getScoresURL = 'api/get_fireball_scores.php';

    async function visHighscoresFraDatabase() {
        try {
            const response = await fetch(getScoresURL);
            const scores = await response.json();
            
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
        } catch (error) {
            console.error("Klarte ikke hente highscores fra databasen:", error);
            highscoreListEl.innerHTML = '<li>Kunne ikke laste listen.</li>';
        }
    }

    async function lagreScoreTilDatabase(name, score) {
        const formData = new FormData();
        // Sørg for at navnet er "Anonym" hvis feltet er tomt
        formData.append('spiller_navn', name || 'Anonym');
        formData.append('poeng', score);

        try {
            await fetch(addScoreURL, { method: 'POST', body: formData });
            console.log("Highscore sendt til databasen.");
            await visHighscoresFraDatabase(); // Oppdater listen umiddelbart
        } catch (error) {
            console.error("Klarte ikke lagre highscore til databasen:", error);
        }
    }

    // --- Funksjoner for tegning og oppdatering ---
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
            x: Math.random() * (canvas.width - 40), y: -50, radius: 20, speed: 5 + Math.random() * 5
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
        gradient.addColorStop(0, '#87CEEB'); gradient.addColorStop(1, '#90EE90');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function checkCollision() {
        for (let i = 0; i < obstacles.length; i++) {
            let obs = obstacles[i];
            let testX = obs.x, testY = obs.y;

            if (obs.x < player.x) testX = player.x;
            else if (obs.x > player.x + player.width) testX = player.x + player.width;
            if (obs.y < player.y) testY = player.y;
            else if (obs.y > player.y + player.height) testY = player.y + player.height;

            let distance = Math.sqrt(Math.pow(obs.x - testX, 2) + Math.pow(obs.y - testY, 2));

            if (distance <= obs.radius) {
                gameRunning = false;
                currentFinalScore = score;
                showGameOverForm(score);
                break;
            }
        }
    }

    function drawMenu() {
        if (gameOverFormEl.style.display === 'block') return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        
        if (score === 0 && currentFinalScore === 0) {
            ctx.font = '40px Arial';
            ctx.fillText('Unngå Ildkulene!', canvas.width / 2, canvas.height / 2 - 60);
            ctx.font = '25px Arial';
            ctx.fillText('Trykk MELLOMROM / START', canvas.width / 2, canvas.height / 2);
        } else {
            ctx.font = '50px Arial';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
            ctx.font = '30px Arial';
            ctx.fillText('Din poengsum: ' + currentFinalScore, canvas.width / 2, canvas.height / 2);
            ctx.font = '20px Arial';
            ctx.fillText('Trykk MELLOMROM / START', canvas.width / 2, canvas.height / 2 + 50);
        }
    }

    function resetGame() {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - 80;
        obstacles = [];
        score = 0;
        currentFinalScore = 0;
        spawnTimer = 0;
        gameRunning = true;
        hideGameOverForm();
    }

    function showGameOverForm(finalScore) {
        finalScoreEl.innerText = finalScore;
        gameOverFormEl.style.display = 'block';
        usernameInputEl.focus();
    }
    function hideGameOverForm() {
        gameOverFormEl.style.display = 'none';
        usernameInputEl.value = '';
    }

    // --- Kontroller (Tastatur) ---
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === ' ' || key === 'spacebar') {
            if (!gameRunning) resetGame();
            e.preventDefault();
        } else {
            keys[key] = true;
        }
    });
    document.addEventListener('keyup', (e) => { delete keys[e.key.toLowerCase()]; });

    // --- Kontroller (Mobil Touch) ---
    function handleTouch(e, key, isStart) { e.preventDefault(); if (isStart) keys[key] = true; else delete keys[key]; }
    document.getElementById('btn-up').addEventListener('touchstart', (e) => handleTouch(e, 'w', true));
    document.getElementById('btn-up').addEventListener('touchend', (e) => handleTouch(e, 'w', false));
    document.getElementById('btn-left').addEventListener('touchstart', (e) => handleTouch(e, 'a', true));
    document.getElementById('btn-left').addEventListener('touchend', (e) => handleTouch(e, 'a', false));
    document.getElementById('btn-down').addEventListener('touchstart', (e) => handleTouch(e, 's', true));
    document.getElementById('btn-down').addEventListener('touchend', (e) => handleTouch(e, 's', false));
    document.getElementById('btn-right').addEventListener('touchstart', (e) => handleTouch(e, 'd', true));
    document.getElementById('btn-right').addEventListener('touchend', (e) => handleTouch(e, 'd', false));
    document.getElementById('btn-action').addEventListener('click', (e) => { e.preventDefault(); if (!gameRunning) resetGame(); });

    // --- Highscore Skjema-håndtering (ENDRET til async) ---
    gameOverFormEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        await lagreScoreTilDatabase(usernameInputEl.value, currentFinalScore);
        hideGameOverForm();
    });

    // --- Hoved Spill-løkke (Game Loop) ---
    function gameLoop() {
        if (gameRunning) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();
            updateObstacles();
            drawObstacles();
            updatePlayer();
            drawPlayer();
            checkCollision();
            ctx.fillStyle = 'white';
            ctx.font = '24px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Poeng: ' + score, 10, 30);
        } else {
            drawMenu();
        }
        requestAnimationFrame(gameLoop);
    }

    // --- Start spillet! ---
    visHighscoresFraDatabase(); // ENDRET: Laster fra databasen
    gameLoop();