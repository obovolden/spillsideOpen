// --- KONFIGURASJON ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const messageEl = document.getElementById('message');
const nameFormEl = document.getElementById('name-form');
const nameInputEl = document.getElementById('player-name-input');
const saveNameBtn = document.getElementById('save-name-btn');

// Spillvariabler
let frames = 0;
let score = 0;
let isGameOver = false;
let gameRunning = false;
let gameSpeed = 3; 

// Lagringsvariabler
let playerName = localStorage.getItem('owlPlayerName') || ""; 
let highScore = localStorage.getItem('owlHighScore') || 0;

// Ugle (Spiller)
const owl = {
    x: 50,
    y: 150,
    radius: 20, 
    velocity: 0,
    gravity: 0.25,
    jump: 6.5, // Din høyere hopp-verdi
    draw: function() {
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.save();
        ctx.translate(this.x, this.y);
        let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(rotation);
        ctx.fillText("🦉", 0, 5); 
        ctx.restore();
    },
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        if (this.y + this.radius >= canvas.height) {
            this.y = canvas.height - this.radius;
            gameOver();
        }
        
        if (this.y - this.radius <= 0) {
            this.y = this.radius;
            this.velocity = 0;
        }
    },
    flap: function() {
        this.velocity = -this.jump;
    },
    reset: function() {
        this.y = canvas.height / 2;
        this.velocity = 0;
    }
};

// Trestokker
const pipes = {
    position: [],
    width: 60,
    gap: 170, 
    dx: gameSpeed,

    draw: function() {
        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            let topY = p.y;
            let bottomY = p.y + this.gap;
            
            let logGrad = ctx.createLinearGradient(p.x, 0, p.x + this.width, 0);
            logGrad.addColorStop(0, '#5A3D2A'); 
            logGrad.addColorStop(0.5, '#7F5539'); 
            logGrad.addColorStop(1, '#5A3D2A'); 
            
            ctx.fillStyle = logGrad;
            ctx.fillRect(p.x, 0, this.width, topY);
            ctx.fillRect(p.x, bottomY, this.width, canvas.height - bottomY);
            
            ctx.fillStyle = '#42281D'; 
            ctx.fillRect(p.x, topY - 10, this.width, 10); 
            ctx.fillRect(p.x, bottomY, this.width, 10);   
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(p.x + this.width / 2, topY - 5, this.width * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(p.x + this.width / 2, bottomY + 5, this.width * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    update: function() {
        if (frames % 150 === 0) {
            let maxY = canvas.height - this.gap - 50; 
            let y = Math.floor(Math.random() * (maxY - 50) + 50);
            this.position.push({ x: canvas.width, y: y, passed: false });
        }

        for (let i = 0; i < this.position.length; i++) {
            let p = this.position[i];
            p.x -= this.dx;

            if (owl.x + owl.radius > p.x && owl.x - owl.radius < p.x + this.width) {
                if (owl.y - owl.radius < p.y || owl.y + owl.radius > p.y + this.gap) {
                    gameOver();
                }
            }

            if (p.x + this.width < owl.x && !p.passed) {
                score++;
                scoreEl.innerText = score;
                p.passed = true;
                if(score % 5 === 0) this.dx += 0.2; 
            }

            if (p.x + this.width <= 0) {
                this.position.shift();
            }
        }
    },
    
    reset: function() {
        this.position = [];
        this.dx = gameSpeed;
    }
};

// Bakgrunn
const background = {
    draw: function() {
        let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#5D9C80'); 
        grad.addColorStop(1, '#8CBB98'); 
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "rgba(0, 50, 0, 0.3)"; 
        ctx.beginPath();
        ctx.moveTo(0 - (frames * 0.2 % (canvas.width + 100)), canvas.height);
        ctx.lineTo(20 - (frames * 0.2 % (canvas.width + 100)), canvas.height - 80);
        ctx.lineTo(60 - (frames * 0.2 % (canvas.width + 100)), canvas.height - 40);
        ctx.lineTo(100 - (frames * 0.2 % (canvas.width + 100)), canvas.height - 100);
        ctx.lineTo(140 - (frames * 0.2 % (canvas.width + 100)), canvas.height - 60);
        ctx.lineTo(180 - (frames * 0.2 % (canvas.width + 100)), canvas.height - 120);
        ctx.lineTo(canvas.width + 200 - (frames * 0.2 % (canvas.width + 200)), canvas.height);
        ctx.fill();

        ctx.fillStyle = "rgba(0, 50, 0, 0.4)";
        ctx.beginPath();
        ctx.moveTo(50 - (frames * 0.3 % (canvas.width + 150)), canvas.height);
        ctx.lineTo(70 - (frames * 0.3 % (canvas.width + 150)), canvas.height - 100);
        ctx.lineTo(110 - (frames * 0.3 % (canvas.width + 150)), canvas.height - 60);
        ctx.lineTo(150 - (frames * 0.3 % (canvas.width + 150)), canvas.height - 120);
        ctx.lineTo(190 - (frames * 0.3 % (canvas.width + 150)), canvas.height - 80);
        ctx.lineTo(230 - (frames * 0.3 % (canvas.width + 150)), canvas.height - 140);
        ctx.lineTo(canvas.width + 200 - (frames * 0.3 % (canvas.width + 200)), canvas.height);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.beginPath();
        ctx.arc(100 - (frames * 0.5 % (canvas.width + 200)), 100, 30, 0, Math.PI * 2);
        ctx.arc(140 - (frames * 0.5 % (canvas.width + 200)), 110, 40, 0, Math.PI * 2);
        ctx.fill();
    }
};

// --- LOGIKK ---

// Sjekk navn ved oppstart
function checkNameAndStart() {
    resizeCanvas();
    
    if (!playerName) {
        // Hvis vi ikke har navn, vis skjemaet
        nameFormEl.classList.remove('hidden');
        messageEl.classList.add('hidden');
    } else {
        // Hvis vi har navn, vis startskjermen
        showStartScreen();
    }
}

function saveName() {
    const inputName = nameInputEl.value.trim();
    if (inputName) {
        playerName = inputName;
        localStorage.setItem('owlPlayerName', playerName);
        nameFormEl.classList.add('hidden');
        showStartScreen();
    } else {
        alert("Du må skrive et navn!");
    }
}

function showStartScreen() {
    messageEl.classList.remove('hidden');
    messageEl.innerHTML = `
        <h2>Hei ${playerName}! 👋</h2>
        <p>Din rekord: <strong>${highScore}</strong></p>
        <p>Trykk for å starte</p>
    `;
    // Tegn bakgrunn en gang så det ikke er svart
    background.draw();
    // Gulv
    ctx.fillStyle = "#6B4D3A";
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    owl.y = canvas.height / 2;
    owl.draw();
}

function init() {
    owl.reset();
    pipes.reset();
    score = 0;
    frames = 0;
    scoreEl.innerText = score;
    isGameOver = false;
    gameRunning = true;
    messageEl.classList.add('hidden');
    loop();
}

function loop() {
    if (!gameRunning) return;

    background.draw();
    pipes.draw();
    pipes.update();
    
    ctx.fillStyle = "#6B4D3A"; 
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);

    owl.draw();
    owl.update();
    
    frames++;
    
    if (!isGameOver) {
        requestAnimationFrame(loop);
    }
}

function gameOver() {
    isGameOver = true;
    gameRunning = false;

    // Sjekk om det er ny rekord
    let isNewRecord = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('owlHighScore', highScore);
        isNewRecord = true;
    }

    let title = isNewRecord ? "🎉 Ny Rekord! 🎉" : "Au da! 🤕";
    
    messageEl.innerHTML = `
        <h2>${title}</h2>
        <p>Bra jobba, ${playerName}!</p>
        <p>Poeng: <strong>${score}</strong></p>
        <p>Beste: <strong>${highScore}</strong></p>
        <small>Trykk for å prøve igjen</small>
    `;
    messageEl.classList.remove('hidden');
}

function inputAction(e) {
    // Ignorer input hvis vi holder på å skrive navn
    if (!nameFormEl.classList.contains('hidden')) return;

    if (e.type === 'keydown' && e.code !== 'Space' && e.code !== 'ArrowUp') return;
    if (e.type === 'touchstart') e.preventDefault();

    if (!gameRunning) {
        // Hvis navnet er satt, start spillet
        if (playerName) {
            init();
        }
    } else {
        owl.flap();
    }
}

// --- EVENTS ---

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    pipes.gap = Math.max(150, window.innerHeight * 0.25); 
}

saveNameBtn.addEventListener('click', saveName);

window.addEventListener('resize', resizeCanvas);
window.addEventListener('keydown', inputAction);
window.addEventListener('mousedown', inputAction);
window.addEventListener('touchstart', inputAction, { passive: false });

// Start opp
checkNameAndStart();