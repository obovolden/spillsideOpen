// 1. Sett opp Canvas og HTML-elementer
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Nye HTML-elementer ---
const startMenu = document.getElementById('start-menu');
const startButton = document.getElementById('startButton');
const playerNameInput = document.getElementById('playerNameInput');
const highscoreList = document.getElementById('highscore-list');

const BREDDE = canvas.width;
const HOYDE = canvas.height;

// --- Farger ---
const FARG_SPILLER = '#3498db';
const FARG_JAGER = '#2c3e50';
const FARG_HINDRING = '#c0392b';
const FARG_SOPP = '#f1c40f';
const FARG_BAKKE = '#27ae60';
const FARG_TEKST = '#000000';

// --- Spill-variabler ---
let poeng = 0;
let gameOver = false;
const bakkeNiva = HOYDE - 50;
let scrollHastighet = 0;

// --- NY: Spill-tilstand ---
// Vi starter i menyen
let gameState = 'MENU'; // Kan være 'MENU', 'PLAYING', 'GAME_OVER'
let currentPlayerName = 'Anonym';

// --- Spiller (Kula) ---
let spiller = {
    x: BREDDE / 4,
    y: bakkeNiva - 20,
    radius: 20,
    dy: 0,
    hoppStyrke: -17,
    gravitasjon: 0.8,
    erILuften: false,
    hastighet: 5
};

// --- Jageren (Fienden) ---
let jager = {
    x: -40,
    bredde: 40,
    hastighet: 0.8
};

// --- Objekter ---
let hindring = { x: BREDDE - 200, y: bakkeNiva - 40, bredde: 50, hoyde: 40 };
let sopp = { x: BREDDE - 50, y: bakkeNiva - 80, radius: 10, samlet: false };

// --- Input-kontroll ---
let keys = { ArrowRight: false, Space: false };

// 2. Håndter Input (Tastetrykk)
document.addEventListener('keydown', function(e) {
    if (gameState !== 'PLAYING') {
        // Hvis spillet er over, la 'R' ta oss tilbake til menyen
        if (e.code === 'KeyR' && gameState === 'GAME_OVER') {
            gaaTilMeny();
        }
        return; // Ikke gjør noe mer hvis vi ikke spiller
    }
    
    // Kun kjør dette hvis spillet er i gang
    if (e.code === 'Space' && !spiller.erILuften) {
        spiller.dy = spiller.hoppStyrke;
        spiller.erILuften = true;
    }
    if (e.code === 'ArrowRight') {
        keys.ArrowRight = true;
    }
});

document.addEventListener('keyup', function(e) {
    if (e.code === 'ArrowRight') {
        keys.ArrowRight = false;
    }
});

// --- NY: Event-listener for Start-knappen ---
startButton.addEventListener('click', function() {
    startSpill();
});

// 3. Spillets Hoved-funksjoner

function startSpill() {
    // Hent navnet, eller bruk 'Anonym'
    currentPlayerName = playerNameInput.value || 'Anonym';
    
    // Skjul menyen
    startMenu.style.display = 'none';
    
    // Sett variabler
    gameState = 'PLAYING';
    gameOver = false;
    poeng = 0;
    
    // Tilbakestill posisjoner
    resetSpillerOgObjekter();
    
    // Start spill-løkken!
    gameLoop();
}

function gaaTilMeny() {
    gameState = 'MENU';
    // Vis menyen igjen
    startMenu.style.display = 'flex';
    resetSpillerOgObjekter();
    // Tegn en ren skjerm
    tegnSpill(); 
}

function resetSpillerOgObjekter() {
    spiller.y = bakkeNiva - 20;
    spiller.dy = 0;
    spiller.erILuften = false;
    
    jager.x = -40;
    
    hindring.x = BREDDE - 200;
    hindring.y = bakkeNiva - 40;
    
    sopp.x = BREDDE - 50;
    sopp.y = bakkeNiva - 80;
    sopp.samlet = false;
    
    keys.ArrowRight = false;
}

function oppdaterLogikk() {
    // Denne funksjonen kjøres kun hvis gameState == 'PLAYING'
    if (keys.ArrowRight) {
        scrollHastighet = spiller.hastighet;
    } else {
        scrollHastighet = 0; // Stå stille
    }

    // Spillerlogikk
    spiller.y += spiller.dy;
    spiller.dy += spiller.gravitasjon;
    if (spiller.y + spiller.radius > bakkeNiva) {
        spiller.y = bakkeNiva - spiller.radius;
        spiller.dy = 0;
        spiller.erILuften = false;
    }

    // Jager-logikk
    jager.x -= scrollHastighet; 
    jager.x += jager.hastighet; 

    // Objekt-logikk
    hindring.x -= scrollHastighet;
    if (hindring.x + hindring.bredde < 0) {
        hindring.x = BREDDE + Math.random() * 200;
        hindring.hoyde = Math.random() * 50 + 20;
        hindring.y = bakkeNiva - hindring.hoyde;
    }

    if (!sopp.samlet) {
        sopp.x -= scrollHastighet;
        if (sopp.x + sopp.radius < 0) {
            sopp.x = BREDDE + Math.random() * 300;
            sopp.y = bakkeNiva - 50 - Math.random() * 100;
        }
    } else {
        sopp.samlet = false;
        sopp.x = BREDDE + Math.random() * 300;
        sopp.y = bakkeNiva - 50 - Math.random() * 100;
    }

    // --- Kollisjonsdeteksjon ---

    // A: Spiller mot Jager
    if (spiller.x + spiller.radius > jager.x && spiller.x - spiller.radius < jager.x + jager.bredde) {
        settGameOver();
    }

    // B: Spiller mot Hindring
    if (spiller.x + spiller.radius > hindring.x &&
        spiller.x - spiller.radius < hindring.x + hindring.bredde &&
        spiller.y + spiller.radius > hindring.y) {
        settGameOver();
    }
    
    // C: Spiller mot Sopp
    let avstandX = spiller.x - sopp.x;
    let avstandY = spiller.y - sopp.y;
    let totalAvstand = Math.sqrt(avstandX * avstandX + avstandY * avstandY);

    if (totalAvstand < spiller.radius + sopp.radius) {
        if (!sopp.samlet) {
            poeng += 1;
            sopp.samlet = true;
        }
    }
}

function settGameOver() {
    gameOver = true;
    gameState = 'GAME_OVER';
    // --- NY: Lagre highscore ---
    lagreHighscore(currentPlayerName, poeng);
    // --- NY: Oppdater listen som vises ---
    visHighscores();
}

function tegnSpill() {
    // Tøm hele skjermen
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, BREDDE, HOYDE);

    // Tegn bakken
    ctx.fillStyle = FARG_BAKKE;
    ctx.fillRect(0, bakkeNiva, BREDDE, 50);

    // Tegn Jageren
    ctx.fillStyle = FARG_JAGER;
    ctx.fillRect(jager.x, 0, jager.bredde, HOYDE);

    // Tegn Hindring
    ctx.fillStyle = FARG_HINDRING;
    ctx.fillRect(hindring.x, hindring.y, hindring.bredde, hindring.hoyde);

    // Tegn Sopp
    if (!sopp.samlet) {
        ctx.beginPath();
        ctx.arc(sopp.x, sopp.y, sopp.radius, 0, Math.PI * 2);
        ctx.fillStyle = FARG_SOPP;
        ctx.fill();
        ctx.closePath();
    }
    
    // Tegn Spilleren
    ctx.beginPath();
    ctx.arc(spiller.x, spiller.y, spiller.radius, 0, Math.PI * 2);
    ctx.fillStyle = FARG_SPILLER;
    ctx.fill();
    ctx.closePath();

    // Tegn Poeng
    ctx.fillStyle = FARG_TEKST;
    ctx.font = '30px Arial';
    ctx.fillText(`Poeng: ${poeng}`, 20, 40);

    // Tegn Game Over-skjerm (hvis det er game over)
    if (gameState === 'GAME_OVER') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, BREDDE, HOYDE);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '70px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', BREDDE / 2, HOYDE / 2 - 30);
        
        ctx.font = '30px Arial';
        ctx.fillText(`Din poengsum: ${poeng}`, BREDDE / 2, HOYDE / 2 + 20);

        ctx.font = '25px Arial';
        ctx.fillText("Trykk 'R' for å gå til menyen", BREDDE / 2, HOYDE / 2 + 70);
        ctx.textAlign = 'left';
    }
}


// 4. Hoved Spill-løkke (Game Loop)
function gameLoop() {
    
    if (gameState === 'PLAYING') {
        oppdaterLogikk();
        tegnSpill();
        // Fortsett løkken
        requestAnimationFrame(gameLoop);
    } 
    else if (gameState === 'GAME_OVER') {
        tegnSpill(); // Tegn game over-skjermen
        // Ikke kall requestAnimationFrame, så løkken stopper.
    }
    else if (gameState === 'MENU') {
        tegnSpill(); // Tegn en ren start-skjerm
        // Ikke kall requestAnimationFrame.
    }
}

// 5. --- NY: Highscore-funksjoner ---

// Henter scores fra nettleserens minne
function hentHighscores() {
    const scores = localStorage.getItem('soppSprettenHighscores');
    // Hvis det ikke er noen scores, returner en tom liste
    if (!scores) {
        return [];
    }
    // Gjør om tekst-strengen tilbake til et JavaScript-objekt
    return JSON.parse(scores);
}

// Lagrer en ny score
function lagreHighscore(navn, poengsum) {
    if (poengsum === 0) return; // Ikke lagre 0 poeng

    let scores = hentHighscores();
    
    const nyScore = { navn: navn, poeng: poengsum };
    scores.push(nyScore);
    
    // Sorter listen fra høyest til lavest poengsum
    scores.sort((a, b) => b.poeng - a.poeng);
    
    // Behold kun de 5 beste
    scores = scores.slice(0, 5);
    
    // Lagre den oppdaterte listen tilbake i nettleserens minne
    // Må gjøres om til en tekst-streng
    localStorage.setItem('soppSprettenHighscores', JSON.stringify(scores));
}

// Viser listen på nettsiden
function visHighscores() {
    let scores = hentHighscores();
    
    // Tøm listen før vi fyller den på nytt
    highscoreList.innerHTML = '';
    
    if (scores.length === 0) {
        highscoreList.innerHTML = '<li>Ingen scores enda...</li>';
        return;
    }
    
    // Lag et nytt <li>-element for hver score
    scores.forEach(score => {
        const li = document.createElement('li');
        li.textContent = `${score.navn}: ${score.poeng}`;
        highscoreList.appendChild(li);
    });
}


// 6. Start spillet! (Eller, vis menyen)
// Når siden laster, vis highscore-listen og tegn en ren canvas
visHighscores();
tegnSpill();