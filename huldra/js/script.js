    // --- OPPSETT ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const battleScreen = document.getElementById('battle-screen');
    
    // Spill-tilstand (State)
    let gameState = 'WORLD'; // Kan være 'WORLD' eller 'BATTLE'

    // Spiller-objektet
    const player = {
        x: 200,
        y: 200,
        size: 20,
        speed: 3,
        color: 'blue'
    };

    // Input håndtering
    const keys = {};

    window.addEventListener('keydown', (e) => { keys[e.key] = true; });
    window.addEventListener('keyup', (e) => { keys[e.key] = false; });

    // --- SPILL-LØKKE (GAME LOOP) ---
    function gameLoop() {
        if (gameState === 'WORLD') {
            updateWorld();
            drawWorld();
        }
        requestAnimationFrame(gameLoop);
    }

    function updateWorld() {
        let moving = false;
        if (keys['ArrowUp']) { player.y -= player.speed; moving = true; }
        if (keys['ArrowDown']) { player.y += player.speed; moving = true; }
        if (keys['ArrowLeft']) { player.x -= player.speed; moving = true; }
        if (keys['ArrowRight']) { player.x += player.speed; moving = true; }

        // Sjekk om vi møter et monster (RNG)
        if (moving) {
            if (Math.random() < 0.01) { // 1% sjanse per frame når du beveger deg
                startBattle();
            }
        }
    }

    function drawWorld() {
        // Tegn bakgrunn
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Tegn spiller
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.size, player.size);

        // Tegn litt "gress" for dekorasjon
        ctx.fillStyle = '#388E3C';
        ctx.fillRect(50, 50, 20, 20);
        ctx.fillRect(300, 150, 20, 20);
    }

    // --- KAMP LOGIKK ---
    let enemyHp = 20;

    function startBattle() {
        gameState = 'BATTLE';
        battleScreen.style.display = 'flex'; // Vis kampskjerm
        enemyHp = 20;
        updateBattleUI("Et monster dukket opp!");
    }

    function endBattle() {
        gameState = 'WORLD';
        battleScreen.style.display = 'none'; // Skjul kampskjerm
        // Nullstill inputs så spilleren ikke løper videre automatisk
        keys['ArrowUp'] = false; keys['ArrowDown'] = false; 
        keys['ArrowLeft'] = false; keys['ArrowRight'] = false;
    }

    function attack() {
        const damage = Math.floor(Math.random() * 5) + 2; // Skade mellom 2 og 6
        enemyHp -= damage;
        
        if (enemyHp <= 0) {
            updateBattleUI(`Du vant! Monsteret besvimte.`);
            document.getElementById('enemy-hp').innerText = 0;
            setTimeout(endBattle, 1500); // Vent 1.5 sekunder før retur til verden
        } else {
            updateBattleUI(`Du gjorde ${damage} skade! Monsteret angriper tilbake...`);
            document.getElementById('enemy-hp').innerText = enemyHp;
        }
    }

    function runAway() {
        updateBattleUI("Du rømte trygt!");
        setTimeout(endBattle, 1000);
    }

    function updateBattleUI(msg) {
        document.getElementById('battle-log').innerText = msg;
        document.getElementById('enemy-hp').innerText = Math.max(0, enemyHp);
    }

    // Start spillet
    gameLoop();
