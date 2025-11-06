// 1. Sett opp Canvas og HTML-elementer
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
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

// --- NYTT --- Bakgrunnsfarger for parallakse
const FARG_HIMMEL = '#87CEEB'; // Lys blå himmel
const FARG_SOL_MÅNE = '#FFD700'; // Gullfarget sol/måne
const FARG_FJERN_FJELL = '#708090'; // Gråblå fjell langt unna
const FARG_NÆRE_FJELL = '#696969'; // Mørkere grå fjell nærmere

// --- Spill-variabler ---
let poeng = 0;
const bakkeNiva = HOYDE - 50;
let scrollHastighet = 0;
let gameState = 'MENU'; // Kan være 'MENU', 'PLAYING', 'GAME_OVER'
let currentPlayerName = 'Anonym';

// --- Spiller (Kula) ---
let spiller = {
    x: BREDDE / 4,
    y: bakkeNiva - 20,
    radius: 20, // Dette er nå kollisjonsradius
    dy: 0,  // Vertikal hastighet
    dx: 0,  // Horisontal hastighet (for akselerasjon)
    hoppStyrke: -17,
    gravitasjon: 0.8,
    erILuften: false,
    maksHastighet: 6,
    akselerasjon: 0.2,
    friksjon: 0.1,
    visualRadiusX: 20,
    visualRadiusY: 20
};

// --- Jageren (Fienden) ---
let jager = {
    x: -40,
    bredde: 40,
    hastighet: 4.5
};

// --- Objekter ---
let hindring = { x: BREDDE - 200, y: bakkeNiva - 40, bredde: 50, hoyde: 40 };
let sopp = { x: BREDDE - 50, y: bakkeNiva - 80, radius: 10, samlet: false };

// --- NYTT --- Partikkel-arrays
let landingsPartikler = [];
let soppPartikler = [];

// --- NYTT --- Parallaksebakgrunn variabler
let backgroundOffset = 0; // Global offset for bakgrunnen
const PARALLAX_LAYERS = [
    { type: 'skyObject', x: BREDDE * 0.8, y: HOYDE * 0.2, radius: 40, color: FARG_SOL_MÅNE, scrollSpeedFactor: 0.05 }, // Sol/måne
    { type: 'mountain', x: 0, y: bakkeNiva, width: BREDDE * 1.5, height: HOYDE * 0.4, color: FARG_FJERN_FJELL, scrollSpeedFactor: 0.2 }, // Fjerne fjell
    { type: 'mountain', x: 0, y: bakkeNiva, width: BREDDE * 1.3, height: HOYDE * 0.3, color: FARG_NÆRE_FJELL, scrollSpeedFactor: 0.4 } // Nære fjell
];


// --- Input-kontroll ---
let keys = { ArrowRight: false, Space: false };

// 2. Håndter Input (Tastetrykk)
document.addEventListener('keydown', function(e) {
    if (gameState !== 'PLAYING') {
        if (e.code === 'Space' && gameState === 'GAME_OVER') {
            gaaTilMeny();
        }
        return;
    }

    if (e.code === 'Space' && !spiller.erILuften) {
        spiller.dy = spiller.hoppStyrke;
        spiller.erILuften = true;
        keys.Space = true;

        spiller.visualRadiusX = 15;
        spiller.visualRadiusY = 25;
    }
    if (e.code === 'ArrowRight') {
        keys.ArrowRight = true;
    }
});

document.addEventListener('keyup', function(e) {
    if (e.code === 'ArrowRight') {
        keys.ArrowRight = false;
    }
    if (e.code === 'Space') {
        keys.Space = false;
    }
});

startButton.addEventListener('click', function() {
    startSpill();
});

// 3. Spillets Hoved-funksjoner

function startSpill() {
    currentPlayerName = playerNameInput.value || 'Anonym';
    startMenu.style.display = 'none';
    gameState = 'PLAYING';
    poeng = 0;
    resetSpillerOgObjekter();
    gameLoop();
}

function gaaTilMeny() {
    gameState = 'MENU';
    startMenu.style.display = 'flex';
    resetSpillerOgObjekter();
    tegnSpill();
}

function resetSpillerOgObjekter() {
    spiller.y = bakkeNiva - 20;
    spiller.dy = 0;
    spiller.dx = 0;
    spiller.erILuften = false;
    jager.x = -40;
    hindring.x = BREDDE - 200;
    hindring.y = bakkeNiva - 40;
    sopp.x = BREDDE - 50;
    sopp.y = bakkeNiva - 80;
    sopp.samlet = false;
    keys.ArrowRight = false;
    keys.Space = false;
    landingsPartikler = []; // --- NYTT --- Nullstill partikler ved reset
    soppPartikler = [];   // --- NYTT --- Nullstill partikler ved reset
    backgroundOffset = 0; // --- NYTT --- Nullstill bakgrunn
}

function oppdaterLogikk() {

    // --- NYTT --- Oppdater partikler
    oppdaterLandingsPartikler();
    oppdaterSoppPartikler();

    // --- NYTT --- Oppdater parallakse-offset
    backgroundOffset = (backgroundOffset - scrollHastighet) % BREDDE;

    spiller.visualRadiusX += (spiller.radius - spiller.visualRadiusX) * 0.1;
    spiller.visualRadiusY += (spiller.radius - spiller.visualRadiusY) * 0.1;

    if (keys.ArrowRight) {
        spiller.dx += spiller.akselerasjon;
        if (spiller.dx > spiller.maksHastighet) {
            spiller.dx = spiller.maksHastighet;
        }
    } else {
        spiller.dx -= spiller.friksjon;
        if (spiller.dx < 0) {
            spiller.dx = 0;
        }
    }
    scrollHastighet = spiller.dx;

    spiller.y += spiller.dy;
    spiller.dy += spiller.gravitasjon;

    if (spiller.dy < 0 && !keys.Space) {
        spiller.dy += spiller.gravitasjon * 1.5;
    }

    if (spiller.y + spiller.radius > bakkeNiva) {
        // --- NYTT --- Generer landingspartikler hvis spilleren nettopp landet
        if (spiller.erILuften) {
            lagLandingsPartikler(spiller.x, bakkeNiva - spiller.radius / 2);
            spiller.visualRadiusX = 25;
            spiller.visualRadiusY = 15;
        }
        spiller.y = bakkeNiva - spiller.radius;
        spiller.dy = 0;
        spiller.erILuften = false;
    }

    jager.x -= scrollHastighet;
    jager.x += jager.hastighet;

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
    if (spiller.x + spiller.radius > jager.x && spiller.x - spiller.radius < jager.x + jager.bredde) {
        settGameOver();
    }

    if (spiller.x + spiller.radius > hindring.x &&
        spiller.x - spiller.radius < hindring.x + hindring.bredde &&
        spiller.y + spiller.radius > hindring.y) {
        settGameOver();
    }

    let avstandX = spiller.x - sopp.x;
    let avstandY = spiller.y - sopp.y;
    let totalAvstand = Math.sqrt(avstandX * avstandX + avstandY * avstandY);

    if (totalAvstand < spiller.radius + sopp.radius) {
        if (!sopp.samlet) {
            poeng += 1;
            sopp.samlet = true;
            lagSoppPartikler(sopp.x, sopp.y); // --- NYTT --- Generer sopp-partikler
        }
    }
}

async function settGameOver() {
    if (gameState === 'GAME_OVER') {
        return;
    }
    gameState = 'GAME_OVER';
    await lagreHighscore(currentPlayerName, poeng);
    await visHighscores();
}

// --- NYTT --- Partikkel funksjoner
function lagLandingsPartikler(x, y) {
    for (let i = 0; i < 5; i++) {
        landingsPartikler.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y,
            radius: Math.random() * 3 + 1,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * -5 - 2,
            alpha: 1,
            gravity: 0.3
        });
    }
}

function oppdaterLandingsPartikler() {
    for (let i = landingsPartikler.length - 1; i >= 0; i--) {
        let p = landingsPartikler[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.alpha -= 0.03; // Fades out
        if (p.alpha <= 0) {
            landingsPartikler.splice(i, 1);
        }
    }
}

function lagSoppPartikler(x, y) {
    for (let i = 0; i < 8; i++) {
        soppPartikler.push({
            x: x + (Math.random() - 0.5) * 5,
            y: y + (Math.random() - 0.5) * 5,
            radius: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * -4 - 1,
            alpha: 1,
            color: FARG_SOPP // Samme farge som soppen
        });
    }
}

function oppdaterSoppPartikler() {
    for (let i = soppPartikler.length - 1; i >= 0; i--) {
        let p = soppPartikler[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02; // Fades out
        if (p.alpha <= 0) {
            soppPartikler.splice(i, 1);
        }
    }
}


// --- NYTT --- Funksjon for å tegne et fjell
function drawMountain(xOffset, layer) {
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    // Start litt under bakkenivå for å sikre at basen er "i" bakken
    ctx.moveTo(xOffset, bakkeNiva);
    // Bruker en serie med punkter for å lage en fjellform.
    // Kan gjøres mer avansert med bezier-kurver for jevnere fjell.
    ctx.lineTo(xOffset + layer.width * 0.1, bakkeNiva - layer.height * 0.2);
    ctx.lineTo(xOffset + layer.width * 0.3, bakkeNiva - layer.height * 0.8);
    ctx.lineTo(xOffset + layer.width * 0.5, bakkeNiva - layer.height * 0.3);
    ctx.lineTo(xOffset + layer.width * 0.7, bakkeNiva - layer.height * 0.9);
    ctx.lineTo(xOffset + layer.width * 0.9, bakkeNiva - layer.height * 0.4);
    ctx.lineTo(xOffset + layer.width, bakkeNiva); // Slutt på bakkenivå
    ctx.closePath();
    ctx.fill();
}


function tegnSpill() {
    // --- NYTT --- Tegn himmelbakgrunn
    ctx.fillStyle = FARG_HIMMEL;
    ctx.fillRect(0, 0, BREDDE, HOYDE);

    // --- NYTT --- Tegn parallakse-lag
    for (const layer of PARALLAX_LAYERS) {
        // Beregn lagets offset basert på global backgroundOffset og scrollSpeedFactor
        let layerOffset = (backgroundOffset * layer.scrollSpeedFactor) % BREDDE;

        // Sikre at offset er positivt
        if (layerOffset > 0) layerOffset -= BREDDE;

        // Tegn objektet to ganger for sømløs scrolling
        if (layer.type === 'skyObject') {
            // Sol/Måne (beveger seg mer fritt, ingen gjentakelse nødvendig om den er liten)
            ctx.beginPath();
            ctx.arc(layer.x + layerOffset, layer.y, layer.radius, 0, Math.PI * 2);
            ctx.fillStyle = layer.color;
            ctx.fill();
            ctx.closePath();
        } else if (layer.type === 'mountain') {
            drawMountain(layer.x + layerOffset, layer);
            drawMountain(layer.x + layerOffset + BREDDE, layer); // Tegn en kopi til høyre
            drawMountain(layer.x + layerOffset - BREDDE, layer); // Tegn en kopi til venstre
        }
    }

    // Bakke, Jager, Hindring, Sopp (samme som før, men nå *over* bakgrunnen)
    ctx.fillStyle = FARG_BAKKE;
    ctx.fillRect(0, bakkeNiva, BREDDE, 50);

    ctx.fillStyle = FARG_JAGER;
    ctx.fillRect(jager.x, 0, jager.bredde, HOYDE);
    ctx.fillStyle = FARG_HINDRING;
    ctx.fillRect(hindring.x, hindring.y, hindring.bredde, hindring.hoyde);

    if (!sopp.samlet) {
        ctx.beginPath();
        ctx.arc(sopp.x, sopp.y, sopp.radius, 0, Math.PI * 2);
        ctx.fillStyle = FARG_SOPP;
        ctx.fill();
        ctx.closePath();
    }

    // --- NYTT --- Tegn sopp-partikler
    for (const p of soppPartikler) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${parseInt(p.color.slice(1,3), 16)}, ${parseInt(p.color.slice(3,5), 16)}, ${parseInt(p.color.slice(5,7), 16)}, ${p.alpha})`;
        ctx.fill();
        ctx.closePath();
    }

    // Tegn spilleren
    ctx.beginPath();
    ctx.ellipse(spiller.x, spiller.y, spiller.visualRadiusX, spiller.visualRadiusY, 0, 0, Math.PI * 2);
    ctx.fillStyle = FARG_SPILLER;
    ctx.fill();
    ctx.closePath();

    // --- NYTT --- Tegn landingspartikler
    for (const p of landingsPartikler) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(150, 150, 150, ${p.alpha})`; // Grå partikler
        ctx.fill();
        ctx.closePath();
    }

    // Tekst og Game Over
    ctx.fillStyle = FARG_TEKST;
    ctx.font = '30px Arial';
    ctx.fillText(`Poeng: ${poeng}`, 20, 40);

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
        requestAnimationFrame(gameLoop);
    } else {
        tegnSpill();
    }
}

// ===================================================================
// 5. --- DATABASE-FUNKSJONER --- (Uendret)
// ===================================================================

const addScoreURL = 'api/add_score.php';
const getScoresURL = 'api/get_scores.php';

async function lagreHighscore(navn, poengsum) {
    if (poengsum === 0) {
        console.log("Lagrer ikke 0 poeng.");
        return;
    }
    console.log(`Sender score til database: ${navn}, ${poengsum}`);
    const formData = new FormData();
    formData.append('spiller_navn', navn);
    formData.append('poeng', poengsum);

    try {
        const response = await fetch(addScoreURL, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        console.log("Svar fra server (lagre):", result.message);
    } catch (error) {
        console.error("FEIL: Kunne ikke lagre highscore.", error);
    }
}

async function visHighscores() {
    console.log("Henter highscores fra database...");
    try {
        const response = await fetch(getScoresURL);
        const scores = await response.json();

        highscoreList.innerHTML = '';

        if (scores.length === 0) {
            highscoreList.innerHTML = '<li>Ingen scores enda...</li>';
            return;
        }

        scores.forEach(score => {
            const li = document.createElement('li');
            li.textContent = `🏆 ${score.spiller_navn}: ${score.poeng}`;
            highscoreList.appendChild(li);
        });

    } catch (error) {
        console.error("FEIL: Kunne ikke hente highscores.", error);
        highscoreList.innerHTML = '<li>Klarte ikke laste listen.</li>';
    }
}

// 6. Start spillet!
visHighscores();
tegnSpill();