document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 1. OPPSETT OG SYSTEM
    // ===================================================================

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const pauseOverlay = document.getElementById('pauseOverlay');
    const gameAreaDiv = document.querySelector('.shaker'); // For screen shake

    // System arrays
    let particles = [];
    let floatingTexts = [];
    let powerups = [];
    let balls = []; // Nå en array for Multi-ball!

    // Bakgrunnsanimasjon variabler
    let bgOffset = 0; 

    // Initier Canvas størrelse
    function resizeCanvas() {
        const container = document.querySelector('.game-area');
        let targetWidth = Math.min(600, window.innerWidth - 20);
        
        canvas.width = targetWidth;
        canvas.height = targetWidth * 0.66; 

        if(paddle) paddle.y = canvas.height - 20;
        
        // Reset baller hvis spillet ikke kjører
        if(balls.length > 0 && !isGameRunning && !isGameOver) {
            resetBalls();
        }
    }
    
    let audioCtx = null;

    // Spilltilstand
    let isGameRunning = false; 
    let isPaused = false;
    let isGameOver = false;
    let score = 0;
    let lives = 3;
    let level = 1;
    let comboMultiplier = 1; // Combo system
    let bricksRemaining = 0;
    
    let rightPressed = false; 
    let leftPressed = false; 

    // Objekt-maler
    let paddle = { 
        height: 10, 
        width: 80, 
        originalWidth: 80, // For å huske størrelse
        x: 0, 
        speed: 7,
        widthTimer: 0 // Timer for powerup
    }; 
    
    let bricks = [];
    let brickConfig = {
        padding: 8,
        offsetTop: 50,
        offsetLeft: 10, 
        rowCount: 5,
        columnCount: 8,
        width: 0,
        height: 20
    };

    // Nivåkart
    const levelMaps = [
        // Lv 1: Standard
        [[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
        // Lv 2: Pyramid
        [[0,0,0,1,1,0,0,0],[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1]],
        // Lv 3: Split
        [[1,1,0,0,0,0,1,1],[1,1,0,0,0,0,1,1],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1]],
        // Lv 4: Hard
        [[1,1,1,1,1,1,1,1],[1,0,1,0,1,0,1,0],[1,1,1,1,1,1,1,1],[0,1,0,1,0,1,0,1],[1,1,1,1,1,1,1,1]],
        // Lv 5: BOSS LEVEL (Tallet 2 indikerer Boss blokk)
        [[0,0,0,2,2,0,0,0]] 
    ];

    // ===================================================================
    // 2. LYD, EFFEKTER & UI
    // ===================================================================

    function initAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playSound(type) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        let now = audioCtx.currentTime;

        if (type === 'hit') {
            osc.frequency.setValueAtTime(300 + (Math.random()*50), now); // Variasjon
            osc.type = 'square';
            gain.gain.setValueAtTime(0.05, now);
            osc.start(now); osc.stop(now + 0.05);
        } else if (type === 'break') {
            osc.frequency.setValueAtTime(500, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1); // "Pew" lyd
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, now);
            osc.start(now); osc.stop(now + 0.15);
        } else if (type === 'powerup') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.1, now);
            osc.start(now); osc.stop(now + 0.2);
        } else if (type === 'bossHit') {
            osc.frequency.setValueAtTime(100, now);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.2, now);
            osc.start(now); osc.stop(now + 0.1);
        }
    }

    function triggerShake() {
        if(gameAreaDiv.classList.contains('active')) return;
        gameAreaDiv.classList.add('active');
        setTimeout(() => {
            gameAreaDiv.classList.remove('active');
        }, 500);
    }

    // Partikler
    function createExplosion(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) { 
            particles.push({
                x: x, y: y,
                dx: (Math.random() - 0.5) * 6, 
                dy: (Math.random() - 0.5) * 6, 
                radius: Math.random() * 3,
                color: color,
                life: 1.0 
            });
        }
    }

    // Flytende Tekst (Combo / Poeng)
    function spawnFloatingText(x, y, text, color="#fff") {
        floatingTexts.push({
            x: x, y: y,
            text: text,
            color: color,
            life: 1.0,
            dy: -1.5 // Flyter oppover
        });
    }

    // ===================================================================
    // 3. BACKEND
    // ===================================================================
    async function fetchHighscores() {
        try {
            const response = await fetch('api/get_highscores.php');
            const data = await response.json();
            updateHighscoreList(data);
        } catch (err) { console.error(err); }
    }

    async function saveScore(name, score) {
        try {
            await fetch('api/save_score.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name, score: score })
            });
            fetchHighscores(); 
        } catch (err) { console.error(err); }
    }

    function updateHighscoreList(data) {
        const list = document.getElementById('highscore-list');
        list.innerHTML = '';
        if(Array.isArray(data)) {
            data.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = `${entry.player_name}: ${entry.score}`;
                list.appendChild(li);
            });
        }
    }

    // ===================================================================
    // 4. SPILL-LOGIKK: OPPSETT
    // ===================================================================

    function createBall(x, y, speedMult = 1.0) {
        let baseSpeed = 4 + (level * 0.5);
        return {
            radius: 8,
            x: x, 
            y: y,
            dx: (Math.random() < 0.5 ? 1 : -1) * baseSpeed * speedMult,
            dy: -baseSpeed * speedMult,
            active: true
        };
    }

    function resetBalls() {
        balls = [];
        balls.push(createBall(canvas.width / 2, canvas.height - 30));
        paddle.x = (canvas.width - paddle.width) / 2;
        comboMultiplier = 1;
    }

    function setupBricks(lvlIndex) {
        bricks = [];
        bricksRemaining = 0;
        
        // Håndter Boss Levels (Hvert 5. nivå)
        const isBossLevel = ((lvlIndex + 1) % 5 === 0);
        const mapIndex = isBossLevel ? 4 : (lvlIndex % 4); // Bruk indeks 4 for boss, ellers roter
        const map = levelMaps[mapIndex];
        
        brickConfig.rowCount = map.length;
        brickConfig.columnCount = map[0].length;
        let availableWidth = canvas.width - (brickConfig.offsetLeft * 2);
        brickConfig.width = (availableWidth / brickConfig.columnCount) - brickConfig.padding;

        for(let r=0; r<brickConfig.rowCount; r++) {
            bricks[r] = [];
            for(let c=0; c<brickConfig.columnCount; c++) {
                let type = map[r][c];
                if(type > 0) {
                    let bX = brickConfig.offsetLeft + (c * (brickConfig.width + brickConfig.padding));
                    let bY = brickConfig.offsetTop + (r * (brickConfig.height + brickConfig.padding));
                    
                    if (type === 2) { // BOSS
                        // Boss er mye større og har masse liv
                        let bossWidth = brickConfig.width * 2;
                        bricks[r][c] = { 
                            x: (canvas.width - bossWidth)/2, y: bY, 
                            health: 50, maxHealth: 50, 
                            status: 1, isBoss: true,
                            width: bossWidth, height: 60,
                            moveOffset: 0 // For bevegelse
                        };
                        bricksRemaining++;
                    } else {
                        // Vanlig kloss
                        let hp = Math.max(1, 4 - r);
                        bricks[r][c] = { 
                            x: bX, y: bY, 
                            health: hp, maxHealth: hp, 
                            status: 1, isBoss: false,
                            width: brickConfig.width, height: brickConfig.height 
                        };
                        bricksRemaining++;
                    }
                } else {
                    bricks[r][c] = { status: 0 };
                }
            }
        }
    }

    function spawnPowerup(x, y) {
        // 20% sjanse for powerup
        if (Math.random() > 0.20) return;

        const types = ['W', 'M', 'L']; 
        const type = types[Math.floor(Math.random() * types.length)];
        
        powerups.push({
            x: x, y: y,
            width: 20, height: 20,
            dy: 2,
            type: type
        });
    }

    function activatePowerup(type) {
        spawnFloatingText(paddle.x + paddle.width/2, paddle.y - 20, type + " Power!", "#FFFF00");
        playSound('powerup');

        if (type === 'W') { // Wide Paddle
            paddle.width = paddle.originalWidth * 1.5;
            paddle.widthTimer = 600; // ca 10 sekunder (60fps)
        } else if (type === 'M') { // Multi Ball
            if (balls.length > 0) {
                let b = balls[0];
                // Lag 2 nye baller fra hovedballen
                let b2 = createBall(b.x, b.y); b2.dx = -2; b2.dy = -4;
                let b3 = createBall(b.x, b.y); b3.dx = 2; b3.dy = -4;
                balls.push(b2, b3);
            }
        } else if (type === 'L') { // Life
            lives++;
        }
    }

    function getBrickColor(brick) {
        if (brick.isBoss) return `hsl(${Date.now() % 360}, 70%, 50%)`; // Regnbue boss
        
        let hp = brick.health;
        if (hp >= 4) return "#D500F9"; // Lilla
        if (hp === 3) return "#FF1744"; // Rød
        if (hp === 2) return "#FFD600"; // Gul
        return "#00E676"; // Grønn
    }

    // ===================================================================
    // 5. TEGNING (RENDER)
    // ===================================================================

    function drawBackground() {
        // Tegn et bevegelig rutenett
        ctx.save();
        ctx.strokeStyle = "rgba(0, 149, 221, 0.15)";
        ctx.lineWidth = 1;
        
        bgOffset = (bgOffset + 0.5) % 40; // Fart på rutenettet
        
        // Vertikale linjer
        for (let x = 0; x <= canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        // Horisontale linjer (beveger seg)
        for (let y = bgOffset - 40; y <= canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Vignette (mørke hjørner)
        let grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width/4, canvas.width/2, canvas.height/2, canvas.width);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,canvas.width, canvas.height);
        
        ctx.restore();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();

        // --- 1. TEGN PARTIKLER ---
        for (let p of particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fill();
            ctx.closePath();
        }
        ctx.globalAlpha = 1.0;

        // --- 2. TEGN FLYTENDE TEKST ---
        ctx.font = "bold 14px 'Courier New', monospace";
        ctx.textAlign = "center";
        for (let ft of floatingTexts) {
            ctx.fillStyle = ft.color;
            ctx.globalAlpha = ft.life;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1.0;
        ctx.textAlign = "left";

        // --- 3. TEGN POWERUPS ---
        for (let p of powerups) {
            ctx.fillStyle = p.type === 'L' ? '#f00' : (p.type === 'M' ? '#0ff' : '#0f0');
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, 10, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.fillText(p.type, p.x, p.y + 4);
            ctx.textAlign = "left";
            ctx.closePath();
        }
        ctx.shadowBlur = 0;

        // --- 4. TEGN KLOSSER ---
        for(let r=0; r<brickConfig.rowCount; r++) {
            for(let c=0; c<brickConfig.columnCount; c++) {
                let b = bricks[r][c];
                if(b.status === 1) {
                    let color = getBrickColor(b);
                    
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = color;
                    ctx.fillStyle = color;
                    
                    ctx.beginPath();
                    if(ctx.roundRect) ctx.roundRect(b.x, b.y, b.width, b.height, 4);
                    else ctx.rect(b.x, b.y, b.width, b.height);
                    ctx.fill();
                    ctx.closePath();

                    if(!b.isBoss) {
                        ctx.shadowBlur = 0;
                        ctx.fillStyle = "rgba(255,255,255,0.25)";
                        ctx.fillRect(b.x, b.y, b.width, b.height/2);
                    } else {
                        // Tegn HP på boss
                        ctx.fillStyle = "#000";
                        ctx.font = "12px Arial";
                        ctx.fillText(b.health, b.x + b.width/2 - 5, b.y + b.height/2 + 5);
                    }
                }
            }
        }

        // --- 5. TEGN BALLER ---
        for(let ball of balls) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI*2);
            ctx.fillStyle = "#fff";
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#0095DD";
            ctx.fill();
            ctx.closePath();
        }

        // --- 6. TEGN PADDLE ---
        ctx.shadowBlur = 15;
        ctx.shadowColor = "#0095DD";
        ctx.fillStyle = "#0095DD";
        
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(paddle.x, canvas.height - paddle.height - 10, paddle.width, paddle.height, 8);
        else ctx.rect(paddle.x, canvas.height - paddle.height - 10, paddle.width, paddle.height);
        ctx.fill();
        ctx.closePath();

        // --- 7. TEGN UI (LIV, POENG, COMBO) ---
        ctx.shadowBlur = 0;
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "#fff";
        ctx.fillText("POENG: " + score, 10, 25);
        ctx.fillText("LIV: " + lives, canvas.width - 80, 25);
        
        if(comboMultiplier > 1) {
            ctx.fillStyle = "#FFD700";
            ctx.fillText("COMBO: x" + comboMultiplier, canvas.width / 2 - 40, 25);
        }
    }

    // ===================================================================
    // 6. LOGIKK (UPDATE)
    // ===================================================================

    function update() {
        if (isPaused || isGameOver) return;

        // Oppdater paddle timer (Wide)
        if(paddle.widthTimer > 0) {
            paddle.widthTimer--;
            if(paddle.widthTimer <= 0) paddle.width = paddle.originalWidth;
        }

        // Oppdater partikler
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.dx; p.y += p.dy; p.life -= 0.02;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Oppdater flytende tekst
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            let ft = floatingTexts[i];
            ft.y += ft.dy; ft.life -= 0.02;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }

        // Oppdater Powerups
        for (let i = powerups.length - 1; i >= 0; i--) {
            let p = powerups[i];
            p.y += p.dy;
            
            // Sjekk kollisjon med paddle
            if(p.y + 10 >= canvas.height - paddle.height - 10 && p.y - 10 <= canvas.height - 10 &&
               p.x >= paddle.x && p.x <= paddle.x + paddle.width) {
                activatePowerup(p.type);
                powerups.splice(i, 1);
            }
            else if(p.y > canvas.height) {
                powerups.splice(i, 1);
            }
        }

        // Paddle bevegelse
        if(rightPressed && paddle.x < canvas.width - paddle.width) paddle.x += paddle.speed;
        else if(leftPressed && paddle.x > 0) paddle.x -= paddle.speed;

        // Oppdater Boss-bevegelse
        for(let r=0; r<brickConfig.rowCount; r++) {
            for(let c=0; c<brickConfig.columnCount; c++) {
                let b = bricks[r][c];
                if(b.status === 1 && b.isBoss) {
                    b.moveOffset = (b.moveOffset || 0) + 0.02;
                    b.x = ((canvas.width - b.width)/2) + (Math.sin(b.moveOffset) * (canvas.width/3));
                }
            }
        }

        // LOOP GJENNOM ALLE BALLER
        for(let i = balls.length - 1; i >= 0; i--) {
            let ball = balls[i];
            
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Vegger
            if(ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
                ball.dx = -ball.dx;
                playSound('hit');
            }
            if(ball.y - ball.radius < 0) {
                ball.dy = -ball.dy;
                playSound('hit');
            }
            // Gulv / Paddle
            else if(ball.y + ball.radius > canvas.height - paddle.height - 10) {
                if(ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
                    // Treff på paddle
                    let hitPoint = ball.x - (paddle.x + paddle.width / 2);
                    hitPoint = hitPoint / (paddle.width / 2);
                    let angle = hitPoint * (Math.PI / 3); 
                    let speed = Math.sqrt(ball.dx*ball.dx + ball.dy*ball.dy); 
                    
                    ball.dx = speed * Math.sin(angle);
                    ball.dy = -speed * Math.cos(angle);
                    if (ball.dy > 0) ball.dy = -ball.dy;
                    
                    playSound('hit');
                    comboMultiplier = 1; // Reset combo hvis vi treffer paddle
                } else if (ball.y - ball.radius > canvas.height) {
                    // Ball døde
                    balls.splice(i, 1);
                    continue; // Gå til neste ball
                }
            }

            // Kloss-kollisjon (Ghosting fix inkludert)
            for(let r=0; r<brickConfig.rowCount; r++) {
                for(let c=0; c<brickConfig.columnCount; c++) {
                    let b = bricks[r][c];
                    if(b.status === 1) {
                        if(ball.x + ball.radius > b.x && 
                           ball.x - ball.radius < b.x + b.width && 
                           ball.y + ball.radius > b.y && 
                           ball.y - ball.radius < b.y + b.height) {
                            
                            b.health--;
                            let wasDestroyed = (b.health <= 0);
                            
                            // Anti-Ghosting Push
                            let ballCenterX = ball.x; let ballCenterY = ball.y;
                            let brickCenterX = b.x + b.width / 2; let brickCenterY = b.y + b.height / 2;
                            let dx = ballCenterX - brickCenterX; let dy = ballCenterY - brickCenterY;
                            let combinedHalfWidth = (b.width / 2) + ball.radius;
                            let combinedHalfHeight = (b.height / 2) + ball.radius;
                            let overlapX = combinedHalfWidth - Math.abs(dx);
                            let overlapY = combinedHalfHeight - Math.abs(dy);

                            if (overlapX < overlapY) {
                                ball.dx = -ball.dx;
                                if (dx > 0) ball.x += overlapX; else ball.x -= overlapX;
                            } else {
                                ball.dy = -ball.dy;
                                if (dy > 0) ball.y += overlapY; else ball.y -= overlapY;
                            }

                            if(b.isBoss) {
                                triggerShake();
                                playSound('bossHit');
                            }

                            if (wasDestroyed) {
                                b.status = 0;
                                let points = 10 * comboMultiplier;
                                score += points;
                                spawnFloatingText(b.x + b.width/2, b.y, "+" + points, "#fff");
                                
                                comboMultiplier++; // Øk combo!
                                bricksRemaining--;
                                playSound('break');
                                createExplosion(b.x + b.width/2, b.y + b.height/2, getBrickColor(b));
                                spawnPowerup(b.x + b.width/2, b.y + b.height/2);
                                
                                if(b.isBoss) { // Boss drept
                                    score += 1000;
                                    spawnFloatingText(canvas.width/2, canvas.height/2, "BOSS DEFEATED!", "#D500F9");
                                }
                            } else {
                                playSound('hit');
                            }
                            
                            if(bricksRemaining === 0) {
                               level++;
                               setupBricks(level - 1);
                               resetBalls();
                            }
                        }
                    }
                }
            }
        } // Slutt på ball-loop

        // Sjekk liv (hvis alle baller er borte)
        if(balls.length === 0) {
            lives--;
            comboMultiplier = 1;
            triggerShake();
            if(lives <= 0) {
                gameOver();
            } else {
                resetBalls();
            }
        }
    }

    function gameLoop() {
        update();
        draw();
        if (!isGameOver) {
            requestAnimationFrame(gameLoop);
        }
    }

    // ===================================================================
    // 7. INPUT
    // ===================================================================

    function keyDownHandler(e) {
        if(e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
        else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
        if(e.key === "p" || e.key === "P") togglePause();
        initAudio();
    }

    function keyUpHandler(e) {
        if(e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
        else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
    }

    function mouseMoveHandler(e) {
        let relativeX = e.clientX - canvas.getBoundingClientRect().left;
        if(relativeX > 0 && relativeX < canvas.width) {
            paddle.x = relativeX - paddle.width / 2;
        }
        initAudio();
    }

    function touchHandler(e) {
        e.preventDefault();
        let touch = e.touches[0];
        let relativeX = touch.clientX - canvas.getBoundingClientRect().left;
        if(relativeX > 0 && relativeX < canvas.width) {
            paddle.x = relativeX - paddle.width / 2;
        }
        initAudio();
    }
    
    canvas.addEventListener('click', () => {
        if(!isGameOver) togglePause();
        initAudio();
    });

    function togglePause() {
        isPaused = !isPaused;
        pauseOverlay.style.display = isPaused ? 'flex' : 'none';
    }

    document.addEventListener("keydown", keyDownHandler, false);
    document.addEventListener("keyup", keyUpHandler, false);
    document.addEventListener("mousemove", mouseMoveHandler, false);
    canvas.addEventListener("touchstart", touchHandler, {passive: false});
    canvas.addEventListener("touchmove", touchHandler, {passive: false});
    window.addEventListener('resize', resizeCanvas);

    // ===================================================================
    // 8. GAME OVER
    // ===================================================================

    function gameOver() {
        isGameOver = true;
        document.getElementById('gameOverModal').style.display = 'flex';
        document.getElementById('modalMessage').innerText = "Poengsum: " + score;
        document.getElementById('highscoreInputArea').style.display = 'block';
    }

    document.getElementById('saveScoreBtn').addEventListener('click', () => {
        const name = document.getElementById('playerName').value;
        if(name) {
            saveScore(name, score);
            document.getElementById('highscoreInputArea').style.display = 'none';
            document.getElementById('modalMessage').innerText += "\nScore lagret!";
        }
    });

    function restartGame() {
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('highscoreInputArea').style.display = 'none';
        
        score = 0;
        lives = 3;
        level = 1;
        isGameOver = false;
        isPaused = false;
        pauseOverlay.style.display = 'none';
        powerups = [];

        resizeCanvas();
        setupBricks(0);
        resetBalls();
        gameLoop();
    }

    document.getElementById('restartButton').addEventListener('click', restartGame);

    // ===================================================================
    // 9. START
    // ===================================================================
    
    resizeCanvas();
    setupBricks(0);
    resetBalls();
    fetchHighscores(); 
    gameLoop(); 
});