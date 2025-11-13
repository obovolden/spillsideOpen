// Hele spill-logikken er nå flyttet hit.
document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // SEKSJON 1: VARIABLER, KONSTANTER OG SPILLOPPSETT
    // ===================================================================

    // --- Henting av Canvas og Kontekst ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // --- Lyd ---
    let audioCtx = null;

    // --- Spillobjekter ---
    let ball = {
        radius: 10,
        x: canvas.width / 2,
        y: canvas.height - 30,
        dx: 1, 
        dy: -1 
    };

    let paddle = {
        height: 10,
        width: 75, // Standard bredde
        x: (canvas.width - 75) / 2,
        speed: 4 
    };

    // --- Klosser (Bricks) ---
    let bricks = [];
    const brickConfig = {
        columnCount: 10, 
        width: 32, 
        height: 15, 
        padding: 4, 
        offsetTop: 40, 
        offsetLeft: 62 
    };
    
    const brickColors = [
        "#CC3333", "#CC6633", "#CCCC33", "#66CC33", 
        "#33CC33", "#33CC66", "#33CCCC", "#3366CC", 
        "#3333CC", "#6633CC", "#CC33CC", "#CC3366"
    ];

    // --- Spilltilstand og Nivåer ---
    let score = 0;
    let highscore = 0;
    let level = 1;
    let lives = 3;
    let bricksRemaining = 0;
    let powerups = []; 
    let isGameOver = false;
    
    // --- Input-tilstand ---
    let rightPressed = false; 
    let leftPressed = false; 
    let usingKeys = false; 

    // --- Nivå-kart (Level Maps) ---
    const levelMaps = [
        // Nivå 1: Enkel firkant
        [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        // Nivå 2: Hull i midten
        [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
            [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
            [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
            [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ],
        // Nivå 3: Pyramide
        [
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ], 
        // Nivå 4: Sjakkbrett
        [
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]
        ],
        // Nivå 5: V-form
        [
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
            [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
            [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 0, 0, 0]
        ],
        // Nivå 6: Festning
        [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]
    ];
    const maxLevel = levelMaps.length;
   
    // ===================================================================
    // SEKSJON 2: LYDFUNKSJONER
    // ===================================================================

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playSound(type) {
        if (!audioCtx) return;

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        let freq = 440;
        let waveType = 'sine';
        let duration = 0.05; // 50ms

        switch(type) {
            case 'hitPaddle':
                freq = 300; waveType = 'square';
                break;
            case 'hitWall':
                freq = 200; waveType = 'square';
                break;
            case 'breakBrick':
                freq = 500; waveType = 'triangle';
                break;
            case 'loseLife':
                freq = 150; waveType = 'sawtooth'; duration = 0.2;
                break;
        }

        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // Lavere volum
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }

    // ===================================================================
    // SEKSJON 3: SPILLOPPSETT OG NIVÅ-HÅNDTERING
    // ===================================================================

    function loadHighscore() {
        const savedHighscore = localStorage.getItem('breakoutHighscore');
        if (savedHighscore) {
            highscore = parseInt(savedHighscore, 10);
        }
    }

    function setupBricks(currentLevel) {
        bricks = [];
        bricksRemaining = 0;
        
        const map = levelMaps[currentLevel - 1]; 
        
        brickConfig.rowCount = map.length;
        brickConfig.columnCount = map[0].length;

        for (let c = 0; c < brickConfig.columnCount; c++) {
            bricks[c] = [];
            for (let r = 0; r < brickConfig.rowCount; r++) {
                if (map[r][c] === 1) {
                    bricks[c][r] = { 
                        x: 0, 
                        y: 0, 
                        status: 1, 
                        color: brickColors[r % brickColors.length] 
                    };
                    bricksRemaining++;
                } else {
                    bricks[c][r] = { status: 0 }; 
                }
            }
        }
    }

    // Nullstiller ball og paddle (etter tapt liv)
    function resetBallAndPaddle() {
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 30;
        
        let speed = 1 + (level - 1) * 0.25; 
        ball.dx = (Math.random() < 0.5 ? 1 : -1) * speed; 
        ball.dy = -speed;

        paddle.x = (canvas.width - paddle.width) / 2;
    }
    
    // Setter opp neste nivå
    function setupNextLevel() {
        level++;
        powerups = []; // Fjern gamle power-ups
        resetBallAndPaddle(); // Nullstill ball/paddle
        setupBricks(level); // Bygg neste brett
    }

    // ===================================================================
    // SEKSJON 4: KONTROLLERE (INPUT-HÅNDTERING)
    // ===================================================================
    
    // --- Mus ---
    document.addEventListener("mousemove", mouseMoveHandler, false);
    function mouseMoveHandler(e) {
        if (!audioCtx) initAudio(); // Start lyd ved første bevegelse
        usingKeys = false; 

        if (!usingKeys) {
            // ==========================================================
            // FIKS: Bruk getBoundingClientRect() for nøyaktig posisjon
            // ==========================================================
            const rect = canvas.getBoundingClientRect();
            let relativeX = e.clientX - rect.left;
            // ==========================================================

            if (relativeX > 0 && relativeX < canvas.width) {
                paddle.x = relativeX - paddle.width / 2;
                if (paddle.x < 0) {
                    paddle.x = 0;
                }
                if (paddle.x + paddle.width > canvas.width) {
                    paddle.x = canvas.width - paddle.width;
                }
            }
        }
    }

    // --- Piltaster ---
    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);

    function keyDownHandler(e) {
        if (!audioCtx) initAudio(); // Start lyd ved første tastetrykk

        if (isGameOver && (e.key === " " || e.key === "Spacebar")) {
            e.preventDefault(); 
            document.location.reload();
            return; 
        }

        if (e.key === "Right" || e.key === "ArrowRight") {
            rightPressed = true;
            usingKeys = true;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            leftPressed = true;
            usingKeys = true;
        }
    }

    function keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
            rightPressed = false;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
            leftPressed = false;
        }
    }

    // ===================================================================
    // SEKSJON 5: TEGNEFUNKSJONER (RENDER)
    // ===================================================================

    function drawBall() {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
    }

    function drawPaddle() {
        ctx.beginPath();
        ctx.rect(paddle.x, canvas.height - paddle.height, paddle.width, paddle.height);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
    }

    function drawBricks() {
        for (let c = 0; c < brickConfig.columnCount; c++) {
            for (let r = 0; r < brickConfig.rowCount; r++) {
                let b = bricks[c][r];
                if (b.status === 1) {
                    let brickX = (c * (brickConfig.width + brickConfig.padding)) + brickConfig.offsetLeft;
                    let brickY = (r * (brickConfig.height + brickConfig.padding)) + brickConfig.offsetTop;
                    
                    b.x = brickX;
                    b.y = brickY;

                    ctx.beginPath();
                    ctx.fillStyle = b.color;
                    ctx.fillRect(brickX, brickY, brickConfig.width, brickConfig.height);
                    // 3D-effekt kanter
                    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
                    ctx.fillRect(brickX, brickY, brickConfig.width, 1); 
                    ctx.fillRect(brickX, brickY, 1, brickConfig.height); 
                    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
                    ctx.fillRect(brickX, brickY + brickConfig.height - 1, brickConfig.width, 1); 
                    ctx.fillRect(brickX + brickConfig.width - 1, brickY, 1, brickConfig.height); 
                    ctx.closePath();
                }
            }
        }
    }

    function drawPowerups() {
        ctx.font = "10px Inter";
        ctx.textAlign = "center";
        for (let i = 0; i < powerups.length; i++) {
            let p = powerups[i];
            p.y += p.speed; // Fall ned

            let letter = '?';
            if (p.type === 'widePaddle') {
                ctx.fillStyle = "#33CC33"; // Green
                letter = 'W';
            } else if (p.type === 'extraLife') {
                ctx.fillStyle = "#FFD700"; // Gold
                letter = 'L';
            }
            
            ctx.beginPath();
            ctx.rect(p.x - p.width / 2, p.y, p.width, p.height);
            ctx.fill();
            ctx.closePath();
            
            // Tegn en bokstav inni
            ctx.fillStyle = "#000";
            ctx.fillText(letter, p.x, p.y + p.height - 2);
        }
        ctx.textAlign = "left"; // Nullstill
    }

    function drawUI() {
        ctx.font = "16px Inter";
        ctx.fillStyle = "#f0f0f0";
        
        // Tegn Poeng og Liv
        ctx.fillText("Poeng: " + score + "   Liv: " + lives, 8, 20);
        
        // Tegn Nivå
        ctx.fillText("Nivå: " + level, canvas.width / 2 - 30, 20); // Sentrert

        // Tegn Highscore
        ctx.fillText("Highscore: " + highscore, canvas.width - 110, 20); 
    }
    
    // ===================================================================
    // SEKSJON 6: POWER-UP LOGIKK
    // ===================================================================

    function spawnPowerup(x, y) {
        // 70% sjanse for 'widePaddle', 30% for 'extraLife'
        const type = (Math.random() < 0.7) ? 'widePaddle' : 'extraLife'; 
        powerups.push({
            x: x + brickConfig.width / 2, // Start fra midten av klossen
            y: y,
            width: 12,
            height: 12,
            speed: 2, // Hvor fort den faller
            type: type
        });
    }

    function activatePowerup(type) {
        if (type === 'widePaddle') {
            if (paddle.width === 75) { // Bare øk hvis den er normal
                paddle.width = 110; // Gjør paddelen bredere
                setTimeout(() => {
                    paddle.width = 75; // Nullstill til standard bredde
                }, 10000); // 10 sekunder
            }
        } else if (type === 'extraLife') {
            lives++;
        }
    }

    // ===================================================================
    // SEKSJON 7: KOLLISJONSDETEKSJON
    // ===================================================================
    
    function collisionDetection() {
        for (let c = 0; c < brickConfig.columnCount; c++) {
            for (let r = 0; r < brickConfig.rowCount; r++) {
                let b = bricks[c][r];
                if (b.status === 1) {
                    if (ball.x > b.x &&
                        ball.x < b.x + brickConfig.width &&
                        ball.y > b.y &&
                        ball.y < b.y + brickConfig.height) 
                    {
                        ball.dy = -ball.dy;
                        b.status = 0;
                        playSound('breakBrick'); 
                        score++; 
                        bricksRemaining--; 

                        // Sjanse for power-up
                        if (Math.random() < 0.25) { // 25% sjanse
                            spawnPowerup(b.x, b.y);
                        }

                        // Sjekk om nivået er vunnet
                        if (bricksRemaining === 0) {
                            if (level === maxLevel) {
                                showModal("Du Vant Hele Spillet!");
                            } else {
                                setupNextLevel(); // Gå til neste nivå
                            }
                        }
                    }
                }
            }
        }
    }

    function powerupCollision() {
        for (let i = powerups.length - 1; i >= 0; i--) {
            let p = powerups[i];
            
            // Sjekk kollisjon med paddle
            if (p.y + p.height > canvas.height - paddle.height &&
                p.x > paddle.x &&
                p.x < paddle.x + paddle.width) 
            {
                activatePowerup(p.type);
                powerups.splice(i, 1); // Fjern powerup
            } 
            // Gikk tapt (utenfor skjermen)
            else if (p.y > canvas.height) {
                powerups.splice(i, 1);
            }
        }
    }

    // ===================================================================
    // SEKSJON 8: HOVED SPILL-LOOP (gameLoop)
    // ===================================================================

    function gameLoop() {
        if (isGameOver) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- Paddle-bevegelse (taster) ---
        if (usingKeys) {
            if (rightPressed) {
                paddle.x += paddle.speed;
                if (paddle.x + paddle.width > canvas.width) {
                    paddle.x = canvas.width - paddle.width;
                }
            } else if (leftPressed) {
                paddle.x -= paddle.speed;
                if (paddle.x < 0) {
                    paddle.x = 0;
                }
            }
        }

        // --- Tegn elementer ---
        drawBricks();
        drawBall();
        drawPaddle();
        drawPowerups();
        drawUI(); 
        
        // --- Sjekk logikk ---
        collisionDetection();
        powerupCollision();

        // --- Ball-fysikk og vegg-kollisjon ---
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
            playSound('hitWall');
        }
        
        // --- Ball-tak kollisjon ---
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
            playSound('hitWall');
        } 
        
        // --- Ball-bunn kollisjon (Paddle eller miste liv) ---
        else if (ball.y + ball.dy > canvas.height - ball.radius) {
            // Traff paddelen?
            if (ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                
                // Vinkel-sprett logikk
                let relativeIntersectX = (ball.x - (paddle.x + paddle.width / 2));
                let normalizedIntersectX = relativeIntersectX / (paddle.width / 2);
                let maxBounceAngle = Math.PI / 2.5; 
                let bounceAngle = normalizedIntersectX * maxBounceAngle;
                let speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                
                ball.dx = speed * Math.sin(bounceAngle);
                ball.dy = -speed * Math.cos(bounceAngle);
                
                playSound('hitPaddle');
            } 
            // Mistet ballen
            else {
                lives--; 
                playSound('loseLife');
                
                if (lives === 0) {
                    // Game Over
                    showModal("Game Over");
                    return; // Avslutt spill-loppen
                } else {
                    // Fortsett å spille, nullstill ballen
                    resetBallAndPaddle();
                }
            }
        }

        // --- Oppdater ball-posisjon ---
        ball.x += ball.dx;
        ball.y += ball.dy;

        // --- Fortsett loopen ---
        requestAnimationFrame(gameLoop);
    }

    // ===================================================================
    // SEKSJON 9: MODAL OG UI-HÅNDTERING
    // ===================================================================

    function showModal(title) {
        isGameOver = true;
        const modal = document.getElementById('gameOverModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage'); 
        
        modalTitle.innerText = title;

        let highscoreMessage = "Din poengsum: " + score;
        if (score > highscore) {
            highscore = score;
            localStorage.setItem('breakoutHighscore', highscore.toString());
            highscoreMessage += "\nNy Highscore!";
        } else {
            highscoreMessage += "\nHighscore: " + highscore;
        }
        
        modalMessage.innerHTML = highscoreMessage.replace("\n", "<br>");
        modal.style.display = 'flex';
    }

    // --- Restart-knapp ---
    document.getElementById('restartButton').addEventListener('click', () => {
        document.location.reload();
    });

    // ===================================================================
    // SEKSJON 10: SPILLSTART
    // ===================================================================
    
    loadHighscore();
    setupBricks(level); // Bygg nivå 1
    resetBallAndPaddle(); // Plasser ball/paddle for start
    gameLoop(); // Start hoved-loopen

}); // Slutt på DOMContentLoaded